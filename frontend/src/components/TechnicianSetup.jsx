import React, { useState } from 'react';
import { ArrowRight, Cctv, ClipboardCheck, ShieldCheck, UserRound } from 'lucide-react';

const SYSTEMS = [
  {
    id: 'FADS',
    name: 'FADS',
    description: 'Inspección de dispositivos',
    icon: ClipboardCheck,
  },
  {
    id: 'CCTV',
    name: 'CCTV',
    description: 'Videovigilancia',
    icon: Cctv,
  },
  {
    id: 'SACS',
    name: 'SACS',
    description: 'Sistema de alarma y control',
    icon: ShieldCheck,
  },
];

export default function TechnicianSetup({ onConfirm }) {
  const [name, setName] = useState('');
  const [system, setSystem] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    const technicianName = name.trim().toUpperCase();
    if (technicianName && system) onConfirm(technicianName, system);
  };

  return (
    <section>
      <div className="section-header">
        <h2>Identificación del técnico</h2>
        <p>Ingresa tu nombre y elige el sistema al que quieres ingresar.</p>
      </div>

      <form className="form-stack" onSubmit={handleSubmit}>
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

        <fieldset className="system-picker">
          <legend className="field-label">Sistema</legend>
          <div className="system-options">
            {SYSTEMS.map(({ id, name: systemName, description, icon: Icon }) => (
              <label
                className={`system-option${system === id ? ' is-selected' : ''}`}
                htmlFor={`system-${id}`}
                key={id}
              >
                <input
                  id={`system-${id}`}
                  type="radio"
                  name="system"
                  value={id}
                  checked={system === id}
                  onChange={() => setSystem(id)}
                  required
                />
                <span className="system-option-icon"><Icon size={19} aria-hidden="true" /></span>
                <span className="system-option-copy">
                  <strong>{systemName}</strong>
                  <small>{description}</small>
                </span>
                <span className="system-option-indicator" aria-hidden="true" />
              </label>
            ))}
          </div>
        </fieldset>

        <button type="submit" disabled={!name.trim() || !system} className="btn-primary">
          <UserRound size={16} />
          <span>Continuar</span>
          <ArrowRight size={16} />
        </button>
      </form>
    </section>
  );
}
