import React from 'react';
import { CheckCircle2, ClipboardCheck } from 'lucide-react';
import CameraCapture from '../../CameraCapture';
import NewInstallationCheckbox from '../../NewInstallationCheckbox';

function PhotoCapture({ captureSession, label, onCapture, title }) {
  const photoKey = label === 'antes' ? `cctv-before-${captureSession}` : `cctv-after-${captureSession}`;
  return (
    <div className="photo-section">
      <div className="photo-section-heading">
        <span className="photo-step-number">{label === 'antes' ? '01' : '02'}</span>
        <div>
          <h4>{title}</h4>
          <p>{label === 'antes' ? 'Fotografía previa a la inspección' : 'Fotografía al finalizar la revisión'}</p>
        </div>
      </div>
      <CameraCapture key={photoKey} onCapture={onCapture} />
    </div>
  );
}

export default function CctvEvidenceStep({
  captureSession,
  formData,
  setFotoAntes,
  setFotoDespues,
  updateField,
}) {
  return (
    <section className="step-panel" aria-labelledby="cctv-evidence-heading">
      <div className="panel-heading">
        <span className="panel-icon"><ClipboardCheck size={18} aria-hidden="true" /></span>
        <div>
          <h3 id="cctv-evidence-heading">Notas y fotografías</h3>
          <p>Documenta los hallazgos de la cámara inspeccionada.</p>
        </div>
      </div>

      <NewInstallationCheckbox
        idPrefix="cctv"
        checked={formData.instalacionNueva}
        onCheckedChange={(checked) => updateField('instalacionNueva', checked)}
      />

      <div className="field-group">
        <label className="field-label" htmlFor="cctv-observation">Observaciones</label>
        <textarea
          id="cctv-observation"
          value={formData.observacion}
          onChange={(event) => updateField('observacion', event.target.value)}
          placeholder="Agrega detalles importantes de la revisión…"
          className="form-input observation-input"
          rows={4}
        />
      </div>

      <PhotoCapture
        captureSession={captureSession}
        label="antes"
        onCapture={setFotoAntes}
        title="Antes"
      />
      <PhotoCapture
        captureSession={captureSession}
        label="despues"
        onCapture={setFotoDespues}
        title="Después"
      />

      <div className="preview-notice">
        <span className="note-icon"><CheckCircle2 size={17} aria-hidden="true" /></span>
        <p>El ID, fase, ubicación, estados, verificaciones y evidencia se guardarán en la hoja Registro cctv.</p>
      </div>
    </section>
  );
}
