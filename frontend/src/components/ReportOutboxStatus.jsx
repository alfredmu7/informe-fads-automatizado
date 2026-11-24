import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, CloudUpload, RefreshCw } from 'lucide-react';

/** Shows pending local reports and lets the technician trigger a manual sync. */
export default function ReportOutboxStatus({ outbox }) {
  const [online, setOnline] = useState(navigator.onLine);
  const {
    lastSynced,
    reports,
    queueLoaded,
    storageError,
    storagePersisted,
    syncing,
    syncPending,
  } = outbox;
  const pendingCount = reports.length;
  const firstError = reports.find((report) => report.lastError)?.lastError || '';

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!pendingCount && !storageError) {
    const emptyMessage = !queueLoaded
      ? 'Consultando la cola local…'
      : lastSynced || 'Cola local: 0 pendientes';
    return (
      <div className="outbox-quiet" role="status">
        <CheckCircle2 size={15} aria-hidden="true" />
        <span>{emptyMessage}</span>
      </div>
    );
  }

  const isError = Boolean(storageError || firstError);
  const Icon = isError ? AlertCircle : CloudUpload;
  const title = storageError
    ? 'No se pudo acceder a la cola local'
    : `${pendingCount} registro${pendingCount === 1 ? '' : 's'} pendiente${pendingCount === 1 ? '' : 's'}`;
  const description = storageError
    || firstError
    || (syncing
      ? 'Enviando el registro y sus fotos al servidor…'
      : online
        ? 'El registro y las fotos están guardados en este navegador; aún no hay confirmación del Excel.'
        : 'Sin conexión. El registro y sus fotos siguen guardados en este navegador.');

  return (
    <aside className={`outbox-banner alert-box ${isError ? 'alert-error' : 'alert-info'}`} role="status">
      <Icon size={18} aria-hidden="true" />
      <div className="outbox-copy">
        <strong>{title}</strong>
        <span>{description}</span>
        {pendingCount > 0 && storagePersisted === false && (
          <small>Este pendiente está en este navegador y URL; no borres sus datos del sitio.</small>
        )}
        {pendingCount > 0 && firstError && (
          <small>El registro permanece en la cola local. No vuelvas a capturarlo como un registro nuevo.</small>
        )}
        {pendingCount > 0 && (
          <ul className="outbox-pending-list" aria-label="Registros pendientes">
            {reports.map((report) => {
              const deviceId = report.fields.idDispositivo || 'ID no disponible';
              const sheet = report.fields.hoja ? ` · ${report.fields.hoja}` : '';
              return (
                <li key={report.requestId} title={`Solicitud completa: ${report.requestId}`}>
                  <strong>{report.system}</strong>
                  <span>{deviceId}{sheet} · solicitud {report.requestId.slice(0, 8)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {pendingCount > 0 && (
        <button
          type="button"
          className="btn-secondary outbox-sync-button"
          onClick={() => syncPending(true)}
          disabled={!queueLoaded || Boolean(storageError) || syncing || !online}
        >
          <RefreshCw size={15} aria-hidden="true" />
          <span>{syncing ? 'Sincronizando…' : `Sincronizar pendientes (${pendingCount})`}</span>
        </button>
      )}
    </aside>
  );
}
