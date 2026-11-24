import { useCallback, useEffect, useRef, useState } from 'react';
import {
  completeQueuedReport,
  getOutboxEventName,
  getLastSyncedReport,
  getQueuedReports,
  sendQueuedReport,
  updateQueuedReport,
} from '../services/reportOutbox';

const RETRY_BASE_MS = 1500;
const RETRY_MAX_MS = 5 * 60 * 1000;

function formatReceipt(receipt) {
  if (!receipt) return '';
  const timestamp = new Date(receipt.completedAt).toLocaleString();
  const sheet = receipt.hoja ? `, pestaña ${receipt.hoja}` : '';
  const request = receipt.requestId ? `, solicitud ${receipt.requestId.slice(0, 8)}` : '';
  return `Último confirmado: ${receipt.system}, fila ${receipt.fila}${sheet}${request} (${timestamp}).`;
}

/** Coordinates automatic retries and exposes pending reports to the app-wide sync control. */
export default function useReportOutbox() {
  const [reports, setReports] = useState([]);
  const [queueLoaded, setQueueLoaded] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [storageError, setStorageError] = useState('');
  const [storagePersisted, setStoragePersisted] = useState(false);
  const [lastSynced, setLastSynced] = useState('');
  const syncInProgress = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const queuedReports = await getQueuedReports();
      setReports(queuedReports);
      setStorageError('');
      setQueueLoaded(true);
    } catch (error) {
      setStorageError(error.message || 'No se pudo acceder a los registros locales pendientes.');
      setQueueLoaded(true);
    }
  }, []);

  const syncPending = useCallback(async (force = false) => {
    if (syncInProgress.current || !navigator.onLine) return;
    syncInProgress.current = true;
    let startedSync = false;

    try {
      const queuedReports = await getQueuedReports();
      const reportsToSync = queuedReports.filter(
        (report) => force || report.nextAttemptAt <= Date.now(),
      );
      if (!reportsToSync.length) {
        setReports(queuedReports);
        setStorageError('');
        return;
      }

      startedSync = true;
      setSyncing(true);
      for (const report of reportsToSync) {
        const attempts = report.attempts + 1;
        await updateQueuedReport(report.requestId, {
          attempts,
          nextAttemptAt: Date.now() + RETRY_MAX_MS,
        });

        try {
          const result = await sendQueuedReport(report);
          const receipt = {
            system: report.system,
            fila: Number(result.fila),
            hoja: result.hoja || '',
            requestId: report.requestId,
            completedAt: Date.now(),
          };
          try {
            await completeQueuedReport(report.requestId, receipt);
          } catch (completionError) {
            const error = new Error(
              `El servidor confirmó el registro, pero el navegador no pudo guardar el comprobante local: ${completionError.message}. Se volverá a verificar.`,
            );
            error.retryable = true;
            throw error;
          }
          setLastSynced(formatReceipt(receipt));
        } catch (error) {
          const delay = Math.min(RETRY_BASE_MS * (2 ** Math.min(attempts - 1, 8)), RETRY_MAX_MS);
          await updateQueuedReport(report.requestId, {
            lastError: error.message,
            retryable: error.retryable === true,
            nextAttemptAt: error.retryable
              ? Date.now() + delay + Math.round(Math.random() * 500)
              : Number.MAX_SAFE_INTEGER,
          });
        }
      }
    } catch (error) {
      setStorageError(error.message || 'No se pudieron sincronizar los registros pendientes.');
    } finally {
      syncInProgress.current = false;
      if (startedSync) {
        setSyncing(false);
        await refresh();
      }
    }
  }, [refresh]);

  useEffect(() => {
    let active = true;
    Promise.all([getQueuedReports(), getLastSyncedReport()])
      .then(([queuedReports, lastSyncedReport]) => {
        if (!active) return;
        setReports(queuedReports);
        setLastSynced(formatReceipt(lastSyncedReport));
        setStorageError('');
        setQueueLoaded(true);
        syncPending(false);
      })
      .catch((error) => {
        if (active) {
          setStorageError(error.message || 'No se pudo abrir la cola local de registros.');
          setQueueLoaded(true);
        }
      });

    if (navigator.storage?.persist) {
      navigator.storage.persist()
        .then((persisted) => {
          if (active) setStoragePersisted(persisted);
        })
        .catch(() => {
          if (active) setStoragePersisted(false);
        });
    }

    const refreshAndSync = () => {
      refresh();
      syncPending(false);
    };
    const handleOnline = () => syncPending(true);
    const eventName = getOutboxEventName();
    window.addEventListener(eventName, refreshAndSync);
    window.addEventListener('online', handleOnline);
    const interval = window.setInterval(() => syncPending(false), 10000);

    return () => {
      active = false;
      window.removeEventListener(eventName, refreshAndSync);
      window.removeEventListener('online', handleOnline);
      window.clearInterval(interval);
    };
  }, [refresh, syncPending]);

  return {
    reports,
    queueLoaded,
    syncing,
    storageError,
    storagePersisted,
    lastSynced,
    syncPending,
  };
}
