import React from 'react';
import { ArrowLeft } from 'lucide-react';

/** Holds the selected ticket workflow until its ticket-specific form is implemented. */
export default function TicketResolutionPlaceholder({ technician, system, onBack }) {
  return (
    <section className="system-placeholder">
      <span className="eyebrow">SOLUCIÓN DE TICKET</span>
      <h1>{system}</h1>
      <p>Técnico responsable: {technician}</p>
      <div className="system-placeholder-notice" role="status">
        El formulario de solución de tickets para {system} queda pendiente de implementación.
        El formulario de mantenimiento no se abrirá desde este flujo.
      </div>
      <button type="button" className="btn-secondary" onClick={onBack}>
        <ArrowLeft size={17} aria-hidden="true" />
        <span>Volver a seleccionar la tarea</span>
      </button>
    </section>
  );
}
