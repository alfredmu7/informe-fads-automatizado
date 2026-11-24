import React from 'react';
import { CheckCircle2, ClipboardCheck, Cpu } from 'lucide-react';
import { GENERAL_OPTIONS, SACS_CHECKLISTS, SACS_NUMERIC_FIELDS, SACS_SHEETS } from './sacsConstants';

function SacsChecklist({ items, checkedItems, onToggle }) {
  return (
    <fieldset className="checklist-fieldset">
      <legend>Elementos a verificar</legend>
      <div className="checklist-options">
        {items.map((item) => {
          const inputId = `sacs-check-${item.id}`;
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

function SacsNumericFields({ fields, values, onChange }) {
  if (!fields?.length) return null;
  return (
    <div className="sacs-numeric-grid">
      {fields.map((field) => (
        <div className="field-group" key={field.id}>
          <label className="field-label" htmlFor={`sacs-value-${field.id}`}>{field.label}</label>
          <input
            id={`sacs-value-${field.id}`}
            type="number"
            min="0"
            step={field.step}
            inputMode="decimal"
            value={values[field.id] ?? ''}
            onChange={(event) => onChange(field.id, event.target.value)}
            required
            className="form-input"
          />
        </div>
      ))}
    </div>
  );
}

export default function SacsInspectionStep({
  checkedItems,
  formData,
  onToggle,
  updateField,
  updateNumericValue,
}) {
  const sheet = SACS_SHEETS.find((item) => item.id === formData.hoja);
  return (
    <section className="step-panel" aria-labelledby="sacs-checklist-heading">
      <div className="panel-heading">
        <span className="panel-icon"><ClipboardCheck size={18} aria-hidden="true" /></span>
        <div>
          <h3 id="sacs-checklist-heading">Puntos de inspección</h3>
          <p>Completa la matriz {sheet?.label} para el dispositivo seleccionado.</p>
        </div>
      </div>

      <div className="selected-device">
        <span className="selected-device-icon"><Cpu size={17} aria-hidden="true" /></span>
        <span>
          <small>DISPOSITIVO SELECCIONADO · {formData.hoja}</small>
          <strong>{formData.idDispositivo}</strong>
        </span>
      </div>

      {sheet?.hasGeneral && (
        <div className="field-group">
          <label className="field-label" htmlFor="sacs-general">Clasificación</label>
          <select
            id="sacs-general"
            className="form-input"
            value={formData.general}
            onChange={(event) => updateField('general', event.target.value)}
            required
          >
            <option value="" disabled>Selecciona una opción</option>
            {GENERAL_OPTIONS.map((option) => <option value={option} key={option}>{option}</option>)}
          </select>
        </div>
      )}

      <SacsChecklist
        items={SACS_CHECKLISTS[formData.hoja] || []}
        checkedItems={checkedItems}
        onToggle={onToggle}
      />

      <SacsNumericFields
        fields={SACS_NUMERIC_FIELDS[formData.hoja]}
        values={formData.numericValues}
        onChange={updateNumericValue}
      />
    </section>
  );
}
