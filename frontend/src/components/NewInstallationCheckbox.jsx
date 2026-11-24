import React from 'react';
import { CheckCircle2 } from 'lucide-react';

/** Marks a device as newly installed so the backend records the registration date. */
export default function NewInstallationCheckbox({ checked, idPrefix, onCheckedChange }) {
  const checkboxId = `${idPrefix}-new-installation`;

  return (
    <label className={`check-option${checked ? ' is-checked' : ''}`} htmlFor={checkboxId}>
      <input
        id={checkboxId}
        type="checkbox"
        checked={checked}
        onChange={(event) => onCheckedChange(event.target.checked)}
      />
      <span className="custom-checkbox" aria-hidden="true"><CheckCircle2 size={17} /></span>
      <span>Dispositivo recién instalado</span>
    </label>
  );
}
