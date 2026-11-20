import React, { useEffect, useMemo, useState } from 'react';
import CameraCapture from './components/CameraCapture';
import TechnicianSetup from './components/TechnicianSetup';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Cpu,
  LogOut,
  MapPin,
  Search,
  Send,
  UserRound,
} from 'lucide-react';

const DEVICE_TYPES = ['SH', 'DT', 'STB', 'EM', 'MM', 'BD', 'FTE', 'PANEL', 'Amplificador', 'Otro'];

const CHECKLIST_BY_TYPE = {
  SH: [
    { id: 'aro-protector', label: 'Aro protector' },
    { id: 'marquilla', label: 'Marquilla' },
  ],
  DT: [
    { id: 'aro-protector', label: 'Aro protector' },
    { id: 'marquilla', label: 'Marquilla' },
  ],
  EM: [
    { id: 'cupula-buen-estado', label: 'Cúpula en buen estado' },
    { id: 'cupula-mal-estado', label: 'Cúpula en mal estado' },
    { id: 'marquilla', label: 'Marquilla' },
  ],
  MM: [
    { id: 'tapa-buen-estado', label: 'Tapa en buen estado' },
    { id: 'marquilla', label: 'Marquilla' },
  ],
  BD: [
    { id: 'carcasa-buen-estado', label: 'Carcasa en buen estado' },
    { id: 'marquilla', label: 'Marquilla' },
  ],
  FTE: [
    { id: 'equipo-buen-estado', label: 'Buen estado' },
    { id: 'marquilla', label: 'Marquilla' },
  ],
  STB: [
    { id: 'equipo-buen-estado', label: 'Buen estado' },
    { id: 'marquilla', label: 'Marquilla' },
  ],
  PANEL: [
    { id: 'equipo-buen-estado', label: 'Buen estado' },
    { id: 'marquilla', label: 'Marquilla' },
  ],
  Amplificador: [
    { id: 'equipo-buen-estado', label: 'Buen estado' },
    { id: 'marquilla', label: 'Marquilla' },
  ],
};

const STEPS = [
  {
    title: 'Datos del equipo',
    description: 'Identifica el dispositivo y selecciona su tipo.',
  },
  {
    title: 'Lista de revisión',
    description: 'Marca los elementos que revisaste.',
  },
  {
    title: 'Evidencia y cierre',
    description: 'Agrega observaciones y toma las fotografías.',
  },
];

const createInitialFormData = () => ({
  idDispositivo: '',
  estado: 'BUENO',
  tipoEquipo: '',
  otroTipo: '',
  observacion: '',
});

const normalizeDeviceId = (id) => String(id ?? '')
  .trim()
  .toUpperCase()
  .replace(/\d+/g, (digits) => digits.replace(/^0+(?=\d)/, ''));

const isOtherDeviceType = (type) => String(type ?? '').trim().toUpperCase() === 'OTRO';

const resolveRegisterUrl = () => {
  const configured = String(import.meta.env.VITE_API_URL || '').trim();
  if (!configured) return '/api/registrar';
  return configured.endsWith('/api/registrar')
    ? configured
    : `${configured.replace(/\/+$/, '')}/api/registrar`;
};

export default function App() {
  const [formData, setFormData] = useState(createInitialFormData);
  const [tecnico, setTecnico] = useState('');
  const [devicesDatabase, setDevicesDatabase] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [databaseError, setDatabaseError] = useState('');
  const [dispositivoEncontrado, setDispositivoEncontrado] = useState(null);
  const [fotoAntes, setFotoAntes] = useState(null);
  const [fotoDespues, setFotoDespues] = useState(null);
  const [captureSession, setCaptureSession] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [checkedItems, setCheckedItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const devicesById = useMemo(() => {
    const index = new Map();
    devicesDatabase.forEach((device) => {
      const id = normalizeDeviceId(device.ID);
      if (id && !index.has(id)) index.set(id, device);
    });
    return index;
  }, [devicesDatabase]);

  const matchingDevices = useMemo(() => {
    const rawQuery = String(formData.idDispositivo ?? '').trim().toUpperCase();
    const query = normalizeDeviceId(rawQuery);
    if (!query || dispositivoEncontrado) return [];

    return [...devicesById.entries()]
      .filter(([id, device]) => (
        id.startsWith(query)
        || String(device.ID ?? '').trim().toUpperCase().startsWith(rawQuery)
      ))
      .map(([, device]) => device)
      .slice(0, 8);
  }, [devicesById, dispositivoEncontrado, formData.idDispositivo]);

  const checklist = CHECKLIST_BY_TYPE[formData.tipoEquipo] || [];
  const isFirstStepValid = Boolean(
    formData.idDispositivo.trim()
    && formData.tipoEquipo
    && (!isOtherDeviceType(formData.tipoEquipo) || formData.otroTipo.trim()),
  );
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  useEffect(() => {
    const controller = new AbortController();

    fetch('/data/SQL_fads_oficial_backend.json', { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`La base de datos respondió con HTTP ${res.status}.`);
        return res.json();
      })
      .then((data) => {
        if (!Array.isArray(data)) {
          throw new Error('El archivo de dispositivos no contiene una lista válida.');
        }
        setDevicesDatabase(data);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('Error al cargar la base de datos de dispositivos:', err);
          setDatabaseError(err.message || 'No se pudo cargar la base de datos.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingData(false);
      });

    return () => controller.abort();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    const nextValue = name === 'idDispositivo' ? value.toUpperCase() : value;
    setFormData((previous) => ({ ...previous, [name]: nextValue }));

    if (name === 'idDispositivo') {
      const normalizedId = normalizeDeviceId(nextValue);
      setDispositivoEncontrado(normalizedId ? devicesById.get(normalizedId) || null : null);
    }

    if (name === 'tipoEquipo') setCheckedItems([]);
    setMensaje(null);
  };

  const selectDevice = (device) => {
    setFormData((previous) => ({ ...previous, idDispositivo: normalizeDeviceId(device.ID) }));
    setDispositivoEncontrado(device);
  };

  const clearRegistration = () => {
    setFormData(createInitialFormData());
    setDispositivoEncontrado(null);
    setFotoAntes(null);
    setFotoDespues(null);
    setCheckedItems([]);
    setCurrentStep(0);
    setCaptureSession((session) => session + 1);
    setMensaje(null);
  };

  const closeTechnicianSession = () => {
    if (saving) return;
    const hasPendingChanges = Boolean(
      formData.idDispositivo
      || formData.observacion
      || formData.estado !== 'BUENO'
      || formData.tipoEquipo
      || formData.otroTipo
      || checkedItems.length
      || fotoAntes
      || fotoDespues
    );
    if (hasPendingChanges && !window.confirm('Se descartará el registro que no has guardado. ¿Quieres cerrar la sesión?')) {
      return;
    }

    clearRegistration();
    setTecnico('');
  };

  const toggleChecklistItem = (itemId) => {
    setCheckedItems((previous) => (
      previous.includes(itemId)
        ? previous.filter((checkedItem) => checkedItem !== itemId)
        : [...previous, itemId]
    ));
    setMensaje(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (currentStep !== STEPS.length - 1 || saving) return;

    if (!isFirstStepValid) {
      setCurrentStep(0);
      setMensaje({ type: 'error', text: 'Completa el ID y el tipo de dispositivo antes de continuar.' });
      return;
    }

    setSaving(true);
    setMensaje(null);

    try {
      const backendUrl = resolveRegisterUrl();
      const dataToSend = new FormData();
      dataToSend.append('idDispositivo', dispositivoEncontrado?.ID || formData.idDispositivo);
      dataToSend.append('tipoHoja', 'DISPOSITIVOS');
      dataToSend.append('tecnico', tecnico);
      dataToSend.append('estado', formData.estado);
      dataToSend.append('observacion', formData.observacion);
      dataToSend.append('tipoEquipo', formData.tipoEquipo);
      dataToSend.append('otroTipo', formData.otroTipo);
      dataToSend.append('checklistItems', JSON.stringify(checkedItems));

      if (fotoAntes) dataToSend.append('fotoAntes', fotoAntes);
      if (fotoDespues) dataToSend.append('fotoDespues', fotoDespues);

      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
        body: dataToSend,
      });

      const rawText = await response.text();
      let result = null;
      try {
        result = rawText ? JSON.parse(rawText) : null;
      } catch {
        throw new Error(
          `El servidor devolvió una respuesta no válida (HTTP ${response.status}). Verifica que VITE_API_URL apunte al túnel activo de ngrok y que el backend esté encendido.`
        );
      }

      if (!response.ok || result?.success !== true || result?.inspectionSaved !== true) {
        throw new Error(result?.error || `Error HTTP ${response.status} al guardar el registro.`);
      }

      const savedRow = Number(result.fila);
      if (!Number.isInteger(savedRow) || savedRow < 1) {
        throw new Error('El servidor no confirmó la fila escrita en el informe. El registro no se marcó como guardado.');
      }

      setMensaje({
        type: 'info',
        text: `Registro guardado en DISPOSITIVOS, fila ${savedRow} (ítem ${result.item}).`,
      });
      setFormData(createInitialFormData());
      setDispositivoEncontrado(null);
      setFotoAntes(null);
      setFotoDespues(null);
      setCheckedItems([]);
      setCurrentStep(0);
      setCaptureSession((session) => session + 1);
    } catch (error) {
      console.error('Error al guardar el registro:', error);
      setMensaje({
        type: 'error',
        text: error.message || 'No se pudo conectar con el servidor. Verifica que el backend y ngrok estén activos.',
      });
    } finally {
      setSaving(false);
    }
  };

  const goToNextStep = () => {
    if (currentStep === 0 && !isFirstStepValid) {
      setMensaje({ type: 'error', text: 'Ingresa el ID y selecciona el tipo de dispositivo para continuar.' });
      return;
    }
    setMensaje(null);
    setCurrentStep((step) => Math.min(step + 1, STEPS.length - 1));
  };

  const step = STEPS[currentStep];

  return (
    <div className="app-shell">
      <main className="app-container">
        <header className="app-header">
          <div className="brand-group">
            <div className="brand-logo" aria-hidden="true">JC</div>
            <div>
              <span className="brand-title">Johnson Controls</span>
              <span className="brand-caption">Inspección de dispositivos FADS</span>
            </div>
          </div>
          <div className="location-badge">
            <Building2 size={15} aria-hidden="true" />
            <span>El Dorado</span>
          </div>
        </header>

        <div className="app-body">
          {tecnico ? (
            <>
              <div className="session-bar">
                <span className="session-user">
                  <UserRound size={16} aria-hidden="true" />
                  <span><strong>Técnico</strong> {tecnico}</span>
                </span>
                <button
                  type="button"
                  className="session-exit"
                  onClick={closeTechnicianSession}
                  disabled={saving}
                  aria-label="Cambiar de técnico"
                  title="Cambiar de técnico"
                >
                  <LogOut size={16} aria-hidden="true" />
                </button>
              </div>

              <section className="intro">
                <span className="eyebrow">REGISTRO DE MANTENIMIENTO</span>
                <h1>Inspección FADS</h1>
                <p>Completa cada etapa para documentar el estado del dispositivo.</p>
              </section>

              <section className="stepper" aria-label={`Paso ${currentStep + 1} de ${STEPS.length}`}>
                <div className="progress-ring" style={{ '--progress': `${progress}%` }}>
                  <span>{currentStep + 1}<small>/{STEPS.length}</small></span>
                </div>
                <div className="stepper-copy">
                  <span className="step-count">PASO {currentStep + 1} DE {STEPS.length}</span>
                  <h2>{step.title}</h2>
                  <p>{step.description}</p>
                  {currentStep < STEPS.length - 1 && (
                    <span className="next-step">Siguiente: {STEPS[currentStep + 1].title}</span>
                  )}
                </div>
              </section>

              <div
                className="progress-track"
                role="progressbar"
                aria-label="Progreso del formulario"
                aria-valuemin={1}
                aria-valuemax={STEPS.length}
                aria-valuenow={currentStep + 1}
              >
                <span style={{ width: `${progress}%` }} />
              </div>

              {mensaje && (
                <div className={`alert-box alert-${mensaje.type}`} role="status">
                  {mensaje.type === 'error'
                    ? <AlertCircle size={17} aria-hidden="true" />
                    : <CheckCircle2 size={17} aria-hidden="true" />}
                  <span>{mensaje.text}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="form-stack">
                {currentStep === 0 && (
                  <section className="step-panel" aria-labelledby="device-step-heading">
                    <div className="panel-heading">
                      <span className="panel-icon"><Cpu size={18} aria-hidden="true" /></span>
                      <div>
                        <h3 id="device-step-heading">Identificación</h3>
                        <p>Ingresa el ID y encuentra el equipo.</p>
                      </div>
                    </div>

                    <div className="selected-device report-destination">
                      <span className="selected-device-icon"><Building2 size={17} aria-hidden="true" /></span>
                      <span>
                        <small>PESTAÑA DE DESTINO</small>
                        <strong>DISPOSITIVOS</strong>
                      </span>
                    </div>

                    <div className="field-group">
                      <label className="field-label field-label-row" htmlFor="idDispositivo">
                        <span>ID del dispositivo</span>
                        <span className={`database-status ${databaseError ? 'is-error' : ''}`}>
                          {loadingData ? 'Cargando base de datos…' : databaseError ? 'Base de datos no disponible' : `Base de datos · ${devicesById.size} IDs`}
                        </span>
                      </label>
                      <div className="input-with-icon">
                        <input
                          id="idDispositivo"
                          name="idDispositivo"
                          type="text"
                          value={formData.idDispositivo}
                          onChange={handleChange}
                          placeholder="Ej. P2L01D001"
                          required
                          autoComplete="off"
                          className="form-input uppercase-input"
                        />
                        <Search size={17} aria-hidden="true" />
                      </div>
                      {matchingDevices.length > 0 && (
                        <div className="device-suggestions" role="listbox" aria-label="IDs de dispositivos coincidentes">
                          {matchingDevices.map((device) => (
                            <button
                              key={normalizeDeviceId(device.ID)}
                              type="button"
                              className="device-suggestion"
                              onClick={() => selectDevice(device)}
                            >
                              <strong>{device.ID}</strong>
                              <span>{device.UBICACION || 'Ubicación no disponible'}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {databaseError && <span className="database-error" role="alert">{databaseError}</span>}
                    </div>

                    {formData.idDispositivo && (
                      <div className={`device-result ${dispositivoEncontrado ? 'is-found' : 'is-missing'}`}>
                        {dispositivoEncontrado ? (
                          <>
                            <div className="result-heading">
                              <CheckCircle2 size={16} aria-hidden="true" />
                              Dispositivo encontrado
                            </div>
                            <div className="device-details">
                              <span><MapPin size={14} aria-hidden="true" />{dispositivoEncontrado.UBICACION || 'Sin ubicación'}</span>
                              <span><Cpu size={14} aria-hidden="true" />{dispositivoEncontrado.DISPOSITIVO || 'Tipo sin especificar'}</span>
                            </div>
                          </>
                        ) : (
                          <span><AlertCircle size={16} aria-hidden="true" />ID aún no validado en la base de datos.</span>
                        )}
                      </div>
                    )}

                    <div className="field-group">
                      <label className="field-label" htmlFor="tipoEquipo">Tipo de dispositivo</label>
                      <select
                        id="tipoEquipo"
                        name="tipoEquipo"
                        value={formData.tipoEquipo}
                        onChange={handleChange}
                        className="form-input"
                        required
                      >
                        <option value="" disabled>Selecciona un tipo</option>
                        {DEVICE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                      </select>
                    </div>

                    {isOtherDeviceType(formData.tipoEquipo) && (
                      <div className="field-group">
                        <label className="field-label" htmlFor="otroTipo">¿Cuál tipo?</label>
                        <input
                          id="otroTipo"
                          name="otroTipo"
                          type="text"
                          value={formData.otroTipo}
                          onChange={handleChange}
                          placeholder="Escribe el tipo de dispositivo"
                          className="form-input"
                          required
                        />
                      </div>
                    )}
                  </section>
                )}

                {currentStep === 1 && (
                  <section className="step-panel" aria-labelledby="checklist-step-heading">
                    <div className="panel-heading">
                      <span className="panel-icon"><ClipboardCheck size={18} aria-hidden="true" /></span>
                      <div>
                        <h3 id="checklist-step-heading">Puntos de inspección</h3>
                        <p>Marca las condiciones que aplican al equipo.</p>
                      </div>
                    </div>
                    <div className="selected-device">
                      <span className="selected-device-icon"><Cpu size={17} aria-hidden="true" /></span>
                      <span>
                        <small>DISPOSITIVO SELECCIONADO</small>
                        <strong>{isOtherDeviceType(formData.tipoEquipo) ? formData.otroTipo : formData.tipoEquipo}</strong>
                        <span>{formData.idDispositivo}</span>
                      </span>
                    </div>

                    <div className="field-group">
                      <label className="field-label" htmlFor="estado">Estado general del dispositivo</label>
                      <select
                        id="estado"
                        name="estado"
                        value={formData.estado}
                        onChange={handleChange}
                        className="form-input"
                      >
                        <option value="BUENO">Operativo</option>
                        <option value="DEFECTUOSO">Defectuoso</option>
                      </select>
                    </div>

                    {checklist.length > 0 ? (
                      <fieldset className="checklist-fieldset">
                        <legend>Elementos a verificar</legend>
                        <div className="checklist-options">
                          {checklist.map((item) => {
                            const inputId = `check-${formData.tipoEquipo}-${item.id}`;
                            return (
                              <label className={`check-option ${checkedItems.includes(item.id) ? 'is-checked' : ''}`} htmlFor={inputId} key={item.id}>
                                <input
                                  id={inputId}
                                  type="checkbox"
                                  checked={checkedItems.includes(item.id)}
                                  onChange={() => toggleChecklistItem(item.id)}
                                />
                                <span className="custom-checkbox" aria-hidden="true"><CheckCircle2 size={17} /></span>
                                <span>{item.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </fieldset>
                    ) : (
                      <div className="other-type-note">
                        <span className="note-icon"><ClipboardCheck size={17} aria-hidden="true" /></span>
                        <p>Tipo personalizado. La lista de revisión para este dispositivo se definirá en una próxima etapa.</p>
                      </div>
                    )}
                  </section>
                )}

                {currentStep === 2 && (
                  <section className="step-panel" aria-labelledby="evidence-step-heading">
                    <div className="panel-heading">
                      <span className="panel-icon"><ClipboardCheck size={18} aria-hidden="true" /></span>
                      <div>
                        <h3 id="evidence-step-heading">Notas y fotografías</h3>
                        <p>Documenta los hallazgos de la inspección.</p>
                      </div>
                    </div>

                    <div className="field-group">
                      <label className="field-label" htmlFor="observacion">Observaciones</label>
                      <textarea
                        id="observacion"
                        name="observacion"
                        value={formData.observacion}
                        onChange={handleChange}
                        placeholder="Agrega detalles importantes de la revisión…"
                        className="form-input observation-input"
                        rows={4}
                      />
                    </div>

                    <div className="photo-section">
                      <div className="photo-section-heading">
                        <span className="photo-step-number">01</span>
                        <div>
                          <h4>Antes</h4>
                          <p>Fotografía previa a la intervención</p>
                        </div>
                      </div>
                      <CameraCapture key={`antes-${captureSession}`} onCapture={setFotoAntes} />
                    </div>

                    <div className="photo-section">
                      <div className="photo-section-heading">
                        <span className="photo-step-number">02</span>
                        <div>
                          <h4>Después</h4>
                          <p>Fotografía al finalizar la revisión</p>
                        </div>
                      </div>
                      <CameraCapture key={`despues-${captureSession}`} onCapture={setFotoDespues} />
                    </div>

                    <div className="preview-notice">
                      <span className="note-icon"><CheckCircle2 size={17} aria-hidden="true" /></span>
                      <p>El tipo seleccionado y cada casilla se guardarán en sus columnas de Excel, junto con el estado, las observaciones y las fotos.</p>
                    </div>
                  </section>
                )}

                <div className="form-navigation">
                  {currentStep > 0 ? (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        setMensaje(null);
                        setCurrentStep((stepIndex) => Math.max(stepIndex - 1, 0));
                      }}
                    >
                      <ArrowLeft size={17} aria-hidden="true" />
                      <span>Anterior</span>
                    </button>
                  ) : <span className="navigation-spacer" />}

                  {currentStep < STEPS.length - 1 ? (
                    <button
                      key={`next-${currentStep}`}
                      type="button"
                      className="btn-primary"
                      onClick={goToNextStep}
                    >
                      <span>Continuar</span>
                      <ArrowRight size={17} aria-hidden="true" />
                    </button>
                  ) : (
                    <button
                      key="save-registration"
                      type="button"
                      className="btn-primary"
                      onClick={handleSubmit}
                      disabled={saving}
                    >
                      <Send size={16} aria-hidden="true" />
                      <span>{saving ? 'Guardando…' : 'Guardar registro'}</span>
                    </button>
                  )}
                </div>
              </form>

              <footer className="app-footer">
                <span>Johnson Controls</span>
                <span className="footer-dot" />
                <span>Sistema FADS</span>
              </footer>
            </>
          ) : (
            <TechnicianSetup onConfirm={setTecnico} />
          )}
        </div>
      </main>
    </div>
  );
}