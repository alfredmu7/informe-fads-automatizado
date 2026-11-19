import React, { useState } from 'react';
import { UserRound, ArrowRight } from 'lucide-react';

export default function TechnicianSetup({ onConfirm }) {
  const [name, setName] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    const technicianName = name.trim().toUpperCase();
    if (technicianName) onConfirm(technicianName);
  };

  return (
    <section>
      <div className="section-header">
        <h2>Identificación del técnico</h2>
        <p>Ingresa tu nombre una vez. Se usará en cada registro de esta sesión.</p>
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

        <button type="submit" disabled={!name.trim()} className="btn-primary">
          <UserRound size={16} />
          <span>Continuar al formulario</span>
          <ArrowRight size={16} />
        </button>
      </form>
    </section>
  );
}
