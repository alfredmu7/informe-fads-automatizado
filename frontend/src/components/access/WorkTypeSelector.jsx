import React from 'react';

const WORK_TYPES = [
  { id: 'maintenance', label: 'Mantenimiento' },
  { id: 'ticket', label: 'Solución de ticket' },
];

/** Lets the technician choose which workflow to open before system access. */
export default function WorkTypeSelector({ value, onChange }) {
  return (
    <div className="field-group">
      <label className="field-label" htmlFor="workType">Tipo de tarea</label>
      <select
        id="workType"
        className="form-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
      >
        <option value="" disabled>Selecciona una opción</option>
        {WORK_TYPES.map((workType) => (
          <option value={workType.id} key={workType.id}>{workType.label}</option>
        ))}
      </select>
    </div>
  );
}
