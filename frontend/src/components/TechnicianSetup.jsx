import React, { useState } from 'react';
import { ArrowRight, UserRound } from 'lucide-react';
import SystemPicker from './access/SystemPicker';
import WorkTypeSelector from './access/WorkTypeSelector';

/** Collects the work type, technician, and system before opening a workflow. */
export default function TechnicianSetup({ onConfirm }) {
  const [name, setName] = useState('');
  const [system, setSystem] = useState('');
  const [workType, setWorkType] = useState('');

  /** Resets the system choice when the workflow changes, then opens that workflow. */
  const handleWorkTypeChange = (nextWorkType) => {
    setWorkType(nextWorkType);
    setSystem('');
  };

  /** Confirms access only after the work type, technician, and system are selected. */
  const handleSubmit = (event) => {
    event.preventDefault();
    const technicianName = name.trim().toUpperCase();
    if (technicianName && system && workType) onConfirm(technicianName, system, workType);
  };

  return (
    <section>
      <form className="form-stack" onSubmit={handleSubmit}>
        <WorkTypeSelector value={workType} onChange={handleWorkTypeChange} />

        {workType && (
          <>
            <div className="section-header">
              <h2>Identificación del técnico</h2>
              <p>
                {workType === 'maintenance'
                  ? 'Ingresa tu nombre y elige el sistema que vas a mantener.'
                  : 'Ingresa tu nombre y elige el sistema relacionado con el ticket.'}
              </p>
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="technicianName">Técnico responsable</label>
              <input
                id="technicianName"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value.toLowerCase())}
                placeholder="Nombre del técnico"
                autoComplete="name"
                autoFocus
                required
                className="form-input uppercase-input"
              />
            </div>

            <SystemPicker value={system} onChange={setSystem} />

            <button type="submit" disabled={!name.trim() || !system || !workType} className="btn-primary">
              <UserRound size={16} />
              <span>Continuar</span>
              <ArrowRight size={16} />
            </button>
          </>
        )}
      </form>
    </section>
  );
}
