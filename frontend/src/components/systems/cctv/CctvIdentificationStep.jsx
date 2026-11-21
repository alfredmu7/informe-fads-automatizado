import React from 'react';
import { AlertCircle, CheckCircle2, Cpu, MapPin, Search } from 'lucide-react';

export default function CctvIdentificationStep({
  databaseError,
  formData,
  loadingData,
  matchingCameras,
  selectCamera,
  selectedCamera,
  totalCameras,
  updateField,
}) {
  return (
    <section className="step-panel" aria-labelledby="cctv-identification-heading">
      <div className="panel-heading">
        <span className="panel-icon"><Cpu size={18} aria-hidden="true" /></span>
        <div>
          <h3 id="cctv-identification-heading">Identificación</h3>
          <p>Ingresa el ID y selecciona la cámara correspondiente.</p>
        </div>
      </div>

      <div className="selected-device report-destination">
        <span className="selected-device-icon"><MapPin size={17} aria-hidden="true" /></span>
        <span>
          <small>PESTAÑA DE DESTINO</small>
          <strong>Registro cctv</strong>
        </span>
      </div>

      <div className="field-group">
        <label className="field-label field-label-row" htmlFor="cctv-id">
          <span>ID de la cámara</span>
          <span className={`database-status${databaseError ? ' is-error' : ''}`}>
            {loadingData ? 'Cargando base…' : databaseError ? 'Base no disponible' : `Base CCTV · ${totalCameras} IDs`}
          </span>
        </label>
        <div className="input-with-icon">
          <input
            id="cctv-id"
            type="text"
            value={formData.idDispositivo}
            onChange={(event) => updateField('idDispositivo', event.target.value)}
            placeholder="Ej. 2-40-1"
            autoComplete="off"
            required
            className="form-input uppercase-input"
          />
          <Search size={17} aria-hidden="true" />
        </div>
        {matchingCameras.length > 0 && (
          <div className="device-suggestions" role="listbox" aria-label="Cámaras coincidentes">
            {matchingCameras.map((camera) => (
              <button
                key={camera.ID}
                type="button"
                className="device-suggestion"
                onClick={() => selectCamera(camera)}
              >
                <strong>{camera.ID}</strong>
                <span>{camera.UBICACION || 'Ubicación no disponible'}</span>
              </button>
            ))}
          </div>
        )}
        {databaseError && <span className="database-error" role="alert">{databaseError}</span>}
      </div>

      {formData.idDispositivo && (
        <div className={`device-result ${selectedCamera ? 'is-found' : 'is-missing'}`}>
          {selectedCamera ? (
            <>
              <div className="result-heading">
                <CheckCircle2 size={16} aria-hidden="true" />
                Cámara encontrada
              </div>
              <div className="cctv-camera-details">
                <span><small>FASE</small><strong>{selectedCamera.FASE || 'Sin fase'}</strong></span>
                <span><small>UBICACIÓN</small><strong>{selectedCamera.UBICACION || 'Sin ubicación'}</strong></span>
                <span><small>CÁMARA</small><strong>{selectedCamera.CAMARA || 'Sin descripción'}</strong></span>
                <span><small>TECNOLOGÍA / ACCESO</small><strong>{[selectedCamera.TIPO, selectedCamera['TIPO DE ACCESO']].filter(Boolean).join(' · ') || 'No especificado'}</strong></span>
              </div>
            </>
          ) : (
            <span><AlertCircle size={16} aria-hidden="true" />ID no encontrado. El registro requiere un ID existente en la base CCTV.</span>
          )}
        </div>
      )}
    </section>
  );
}
