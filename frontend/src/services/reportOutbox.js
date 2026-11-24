import { getCctvEndpoint } from '../components/systems/cctv/cctvApi';
import { getSacsEndpoint } from '../components/systems/sacs/sacsApi';

const DATABASE_NAME = 'fads-report-outbox';
const DATABASE_VERSION = 2;
const STORE_NAME = 'reports';
const METADATA_STORE_NAME = 'metadata';
const OUTBOX_EVENT = 'report-outbox-updated';
const REQUEST_TIMEOUT_MS = 180000;
let databasePromise;

/** Opens the browser's persistent queue for report payloads and photo blobs. */
function openOutboxDatabase() {
  if (!databasePromise) {
    const opening = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        reject(new Error('Este navegador no permite guardar registros pendientes de forma local.'));
        return;
      }

      const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME, { keyPath: 'requestId' });
        }
        if (!database.objectStoreNames.contains(METADATA_STORE_NAME)) {
          database.createObjectStore(METADATA_STORE_NAME, { keyPath: 'key' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(
        request.error || new Error('No se pudo abrir la cola local de registros.'),
      );
      request.onblocked = () => reject(
        new Error('Cierra otras pestañas del formulario y vuelve a intentar guardar.'),
      );
    });
    databasePromise = opening.catch((error) => {
      databasePromise = undefined;
      throw error;
    });
  }
  return databasePromise;
}

/** Resolves a transaction only after IndexedDB confirms its change was committed. */
function runTransaction(mode, operation, storeNames = [STORE_NAME]) {
  return openOutboxDatabase().then((database) => new Promise((resolve, reject) => {
    const transaction = database.transaction(storeNames, mode);
    const store = transaction.objectStore(storeNames[0]);
    let result;

    try {
      result = operation(store, transaction);
    } catch (error) {
      transaction.abort();
      reject(error);
      return;
    }

    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(
      transaction.error || new Error('No se pudo actualizar la cola local de registros.'),
    );
    transaction.onabort = () => reject(
      transaction.error || new Error('El navegador canceló el guardado local del registro.'),
    );
  }));
}

/** Creates an unpredictable key that remains attached to this one logical submission. */
export function createReportRequestId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();

  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Saves the complete report locally before any network request is attempted. */
export async function enqueueReport({ system, fields, photos }) {
  const record = {
    requestId: createReportRequestId(),
    system,
    fields: Object.fromEntries(
      Object.entries(fields).map(([name, value]) => [name, String(value ?? '')]),
    ),
    photos: Object.fromEntries(
      Object.entries(photos).filter(([, file]) => file instanceof Blob),
    ),
    createdAt: Date.now(),
    attempts: 0,
    nextAttemptAt: 0,
    lastError: '',
    retryable: true,
  };

  await runTransaction('readwrite', (store) => store.add(record));
  window.dispatchEvent(new Event(OUTBOX_EVENT));
  return record;
}

/** Reads queued submissions in creation order. */
export async function getQueuedReports() {
  const database = await openOutboxDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result.sort((left, right) => left.createdAt - right.createdAt));
    request.onerror = () => reject(
      request.error || new Error('No se pudieron leer los registros pendientes.'),
    );
  });
}

/** Reads the latest confirmed save so the technician can verify it after reloading. */
export async function getLastSyncedReport() {
  const database = await openOutboxDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(METADATA_STORE_NAME, 'readonly');
    const request = transaction.objectStore(METADATA_STORE_NAME).get('last-synced');
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(
      request.error || new Error('No se pudo leer la última confirmación de guardado.'),
    );
  });
}

/** Updates retry metadata without removing the locally stored report or its photos. */
export async function updateQueuedReport(requestId, updates) {
  await runTransaction('readwrite', (store) => {
    const request = store.get(requestId);
    request.onsuccess = () => {
      if (request.result) store.put({ ...request.result, ...updates });
    };
  });
  window.dispatchEvent(new Event(OUTBOX_EVENT));
}

/** Atomically records the server receipt and removes the report from the pending queue. */
export async function completeQueuedReport(requestId, receipt) {
  await runTransaction('readwrite', (store, transaction) => {
    transaction.objectStore(METADATA_STORE_NAME).put({
      key: 'last-synced',
      ...receipt,
    });
    store.delete(requestId);
  }, [STORE_NAME, METADATA_STORE_NAME]);
  window.dispatchEvent(new Event(OUTBOX_EVENT));
}

function getRegistrationEndpoint(system) {
  const configured = String(import.meta.env.VITE_API_URL || '').trim();
  if (system === 'FADS') {
    if (!configured) return '/api/registrar';
    return configured.endsWith('/api/registrar')
      ? configured
      : `${configured.replace(/\/+$/, '')}/api/registrar`;
  }
  if (system === 'CCTV') return getCctvEndpoint('registrar');
  if (system === 'SACS') return getSacsEndpoint('registrar');
  throw new Error(`Sistema de registro desconocido: ${system}`);
}

function getRetryableError(message, status) {
  const error = new Error(message);
  error.status = status;
  const isClientError = status >= 400 && status < 500;
  error.retryable = status === undefined
    || !isClientError
    || (status === 409 && /bloquead|abierto|en uso|ocupad|lock|busy/i.test(message));
  return error;
}

/** Re-sends one persisted report with its original idempotency key and photo blobs. */
export async function sendQueuedReport(record) {
  const formData = new FormData();
  formData.append('requestId', record.requestId);
  Object.entries(record.fields).forEach(([name, value]) => formData.append(name, value));
  Object.entries(record.photos).forEach(([name, file]) => {
    formData.append(name, file, file.name || `${name}.jpg`);
  });

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(getRegistrationEndpoint(record.system), {
      method: 'POST',
      headers: { 'ngrok-skip-browser-warning': 'true' },
      body: formData,
      signal: controller.signal,
    });

    const responseText = await response.text();
    let result;
    try {
      result = responseText ? JSON.parse(responseText) : null;
    } catch {
      throw getRetryableError(
        `Respuesta no válida del servidor (HTTP ${response.status}).`,
        response.status,
      );
    }

    if (
      !response.ok
      || result?.success !== true
      || result?.inspectionSaved !== true
      || !Number.isInteger(Number(result.fila))
      || Number(result.fila) < 1
    ) {
      const message = result?.error
        || `El servidor no confirmó el guardado (HTTP ${response.status}).`;
      throw getRetryableError(message, response.status);
    }
    return result;
  } catch (error) {
    if (error.retryable !== undefined) throw error;
    throw getRetryableError(
      error.name === 'AbortError'
        ? 'La conexión tardó demasiado; el registro permanece pendiente.'
        : error.message || 'No se pudo conectar con el servidor; el registro permanece pendiente.',
    );
  } finally {
    window.clearTimeout(timeout);
  }
}

export function notifyOutboxChanged() {
  window.dispatchEvent(new Event(OUTBOX_EVENT));
}

export function getOutboxEventName() {
  return OUTBOX_EVENT;
}
