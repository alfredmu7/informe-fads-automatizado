import React from 'react';
import { CheckCircle2, ClipboardCheck } from 'lucide-react';
import CameraCapture from '../../CameraCapture';
import NewInstallationCheckbox from '../../NewInstallationCheckbox';

function SacsPhotoCapture({ captureSession, label, onCapture, title }) {
  return (
    <div className="photo-section">
      <div className="photo-section-heading">
        <span className="photo-step-number">{label === 'antes' ? '01' : '02'}</span>
        <div>
          <h4>{title}</h4>
          <p>{label === 'antes' ? 'Fotografía previa a la intervención' : 'Fotografía al finalizar la revisión'}</p>
        </div>
      </div>
      <CameraCapture key={`sacs-${label}-${captureSession}`} onCapture={onCapture} />
    </div>
  );
}

export default function SacsEvidenceStep({
  captureSession,
  formData,
  setFotoAntes,
  setFotoDespues,
  updateField,
}) {
  return (
    <section className="step-panel" aria-labelledby="sacs-evidence-heading">
      <div className="panel-heading">
        <span className="panel-icon"><ClipboardCheck size={18} aria-hidden="true" /></span>
        <div>
          <h3 id="sacs-evidence-heading">Notas y fotografías</h3>
          <p>Documenta los hallazgos del mantenimiento SACS.</p>
        </div>
      </div>

      <NewInstallationCheckbox
        idPrefix="sacs"
        checked={formData.instalacionNueva}
        onCheckedChange={(checked) => updateField('instalacionNueva', checked)}
      />

      <div className="field-group">
        <label className="field-label" htmlFor="sacs-observation">Observaciones</label>
        <textarea
          id="sacs-observation"
          value={formData.observacion}
          onChange={(event) => updateField('observacion', event.target.value)}
          placeholder="Agrega detalles importantes de la revisión…"
          className="form-input observation-input"
          rows={4}
        />
      </div>

      <SacsPhotoCapture
        captureSession={captureSession}
        label="antes"
        onCapture={setFotoAntes}
        title="Antes"
      />
      <SacsPhotoCapture
        captureSession={captureSession}
        label="despues"
        onCapture={setFotoDespues}
        title="Después"
      />

      <div className="preview-notice">
        <span className="note-icon"><CheckCircle2 size={17} aria-hidden="true" /></span>
        <p>El registro se guardará en la pestaña {formData.hoja}, con los datos del dispositivo, checklist y evidencia.</p>
      </div>
    </section>
  );
}
