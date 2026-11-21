import React from 'react';
import { ArrowLeft } from 'lucide-react';

export default function SystemPlaceholder({ system, description, onBack }) {
  return (
    <section className="system-placeholder">
      <span className="eyebrow">SISTEMA SELECCIONADO</span>
      <h1>{system}</h1>
      <p>{description}</p>
      <div className="system-placeholder-notice" role="status">
        Este formulario se implementará en la siguiente etapa. El acceso a FADS sigue disponible.
      </div>
      <button type="button" className="btn-secondary" onClick={onBack}>
        <ArrowLeft size={17} aria-hidden="true" />
        <span>Volver a selección de sistema</span>
      </button>
    </section>
  );
}
