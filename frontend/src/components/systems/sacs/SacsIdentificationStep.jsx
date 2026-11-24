import React from 'react';
import { AlertCircle, CheckCircle2, Cpu, MapPin, Search } from 'lucide-react';
import { SACS_SHEETS } from './sacsConstants';

export default function SacsIdentificationStep({
  databaseError,
  formData,
  loadingData,
  matchingDevices,
  selectDevice,
  selectedDevice,
  totalDevices,
  setSheet,
  updateField,
}) {
  return (
    <section className="step-panel" aria-labelledby="sacs-identification-heading">
      <div className="panel-heading">
        <span className="panel-icon"><Cpu size={18} aria-hidden="true" /></span>
        <div>
          <h3 id="sacs-identification-heading">Identificación</h3>
          <p>Selecciona la matriz y encuentra el dispositivo en la base SACS.</p>
        </div>
      </div>

      <div className="field-group">
        <label className="field-label" htmlFor="sacs-sheet">Pestaña / matriz a alimentar</label>
        <select
          id="sacs-sheet"
          className="form-input"
          value={formData.hoja}
          onChange={(event) => setSheet(event.target.value)}
          required
        >
          <option value="" disabled>Selecciona una matriz</option>
          {SACS_SHEETS.map((sheet) => (
            <option value={sheet.id} key={sheet.id}>{sheet.label}</option>
          ))}
        </select>
      </div>

      {formData.hoja && (
        <>
          <div className="selected-device report-destination">
            <span className="selected-device-icon"><MapPin size={17} aria-hidden="true" /></span>
            <span>
              <small>PESTAÑA DE DESTINO</small>
              <strong>{formData.hoja}</strong>
            </span>
          </div>

          <div className="field-group">
            <label className="field-label field-label-row" htmlFor="sacs-id">
              <span>ID del dispositivo</span>
              <span className={`database-status${databaseError ? ' is-error' : ''}`}>
                {loadingData ? 'Cargando base…' : databaseError ? 'Base no disponible' : `BD SACS · Sincronizada 🟢`}
              </span>
            </label>
            <div className="input-with-icon">
              <input
                id="sacs-id"
                type="text"
                value={formData.idDispositivo}
                onChange={(event) => updateField('idDispositivo', event.target.value)}
                placeholder="Ingresa el ID"
                autoComplete="off"
                required
                className="form-input uppercase-input"
              />
              <Search size={17} aria-hidden="true" />
            </div>
            {matchingDevices.length > 0 && (
              <div className="device-suggestions" role="listbox" aria-label="Dispositivos SACS coincidentes">
                {matchingDevices.map((device) => (
                  <button
                    key={`${device.ITEM}-${device.ID}`}
                    type="button"
                    className="device-suggestion sacs-device-suggestion"
                    onClick={() => selectDevice(device)}
                  >
                    <strong>{device.ID}</strong>
                    <span>{device.UBICACION || 'Ubicación no disponible'}</span>
                    {matchingDevices.filter((match) => String(match.ID).toUpperCase() === String(device.ID).toUpperCase()).length > 1
                      && <small>Registro #{device.ITEM}</small>}
                  </button>
                ))}
              </div>
            )}
            {databaseError && <span className="database-error" role="alert">{databaseError}</span>}
          </div>

          {formData.idDispositivo && (
            <div className={`device-result ${selectedDevice ? 'is-found' : 'is-missing'}`}>
              {selectedDevice ? (
                <>
                  <div className="result-heading">
                    <CheckCircle2 size={16} aria-hidden="true" />
                    Dispositivo encontrado
                  </div>
                  <div className="device-details">
                    <span><MapPin size={14} aria-hidden="true" />{selectedDevice.UBICACION || 'Sin ubicación'}</span>
                    <span><Cpu size={14} aria-hidden="true" />Registro de base #{selectedDevice.ITEM}</span>
                  </div>
                </>
              ) : (
                <span>
                  <AlertCircle size={16} aria-hidden="true" />
                  {matchingDevices.length
                    ? 'Selecciona el registro correcto de la lista; algunos IDs tienen más de una ubicación.'
                    : 'ID no encontrado. Elige un ID de la base SACS.'}
                </span>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
