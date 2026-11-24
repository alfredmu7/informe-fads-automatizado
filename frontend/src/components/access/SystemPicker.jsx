import React from 'react';
import { Cctv, ClipboardCheck, ShieldCheck } from 'lucide-react';

const SYSTEMS = [
  {
    id: 'FADS',
    name: 'FADS',
    description: 'Sistema detección de incendio',
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
    description: 'Control de accesos',
    icon: ShieldCheck,
  },
];

/** Displays the existing system cards for either access workflow. */
export default function SystemPicker({ value, onChange }) {
  return (
    <fieldset className="system-picker">
      <legend className="field-label">Sistema</legend>
      <div className="system-options">
        {SYSTEMS.map(({ id, name, description, icon: Icon }) => (
          <label
            className={`system-option${value === id ? ' is-selected' : ''}`}
            htmlFor={`system-${id}`}
            key={id}
          >
            <input
              id={`system-${id}`}
              type="radio"
              name="system"
              value={id}
              checked={value === id}
              onChange={() => onChange(id)}
              required
            />
            <span className="system-option-icon"><Icon size={19} aria-hidden="true" /></span>
            <span className="system-option-copy">
              <strong>{name}</strong>
              <small>{description}</small>
            </span>
            <span className="system-option-indicator" aria-hidden="true" />
          </label>
        ))}
      </div>
    </fieldset>
  );
}
