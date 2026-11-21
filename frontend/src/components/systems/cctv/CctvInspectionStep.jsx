import React from 'react';
import { CheckCircle2, ClipboardCheck } from 'lucide-react';
import { CCTV_CHECKLIST_ITEMS } from './cctvConstants';

function CctvChecklist({ checkedItems, onToggle }) {
  return (
    <fieldset className="checklist-fieldset">
      <legend>Elementos a verificar</legend>
      <div className="checklist-options">
        {CCTV_CHECKLIST_ITEMS.map((item) => {
          const inputId = `cctv-check-${item.id}`;
          const isChecked = checkedItems.includes(item.id);
          return (
            <label className={`check-option${isChecked ? ' is-checked' : ''}`} htmlFor={inputId} key={item.id}>
              <input
                id={inputId}
                type="checkbox"
                checked={isChecked}
                onChange={() => onToggle(item.id)}
              />
              <span className="custom-checkbox" aria-hidden="true"><CheckCircle2 size={17} /></span>
              <span>{item.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export default function CctvInspectionStep({ checkedItems, formData, onToggle, updateField }) {
  return (
    <section className="step-panel" aria-labelledby="cctv-checklist-heading">
      <div className="panel-heading">
        <span className="panel-icon"><ClipboardCheck size={18} aria-hidden="true" /></span>
        <div>
          <h3 id="cctv-checklist-heading">Puntos de inspección</h3>
          <p>Actualiza los estados y confirma las verificaciones de mantenimiento.</p>
        </div>
      </div>

      <div className="cctv-state-grid">
        <div className="field-group">
          <label className="field-label" htmlFor="cctv-initial-state">Estado inicial del dispositivo</label>
          <select
            id="cctv-initial-state"
            className="form-input"
            value={formData.estadoInicial}
            onChange={(event) => updateField('estadoInicial', event.target.value)}
          >
            <option value="Operativo">Operativo</option>
            <option value="Defectuoso">Defectuoso</option>
          </select>
        </div>
        <div className="field-group">
          <label className="field-label" htmlFor="cctv-final-state">Estado final del dispositivo</label>
          <select
            id="cctv-final-state"
            className="form-input"
            value={formData.estadoFinal}
            onChange={(event) => updateField('estadoFinal', event.target.value)}
          >
            <option value="Operativo">Operativo</option>
            <option value="Defectuoso">Defectuoso</option>
          </select>
        </div>
      </div>

      <CctvChecklist checkedItems={checkedItems} onToggle={onToggle} />
    </section>
  );
}
