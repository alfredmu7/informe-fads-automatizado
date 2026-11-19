import React, { useState, useEffect, useMemo } from 'react';
import CameraCapture from './components/CameraCapture';
import TechnicianSetup from './components/TechnicianSetup';
import { Send, CheckCircle2, AlertCircle, Building2, Search, MapPin, Cpu, UserRound, LogOut } from 'lucide-react';

const normalizeDeviceId = (id) => String(id ?? '')
  .trim()
  .toUpperCase()
  .replace(/\d+/g, (digits) => digits.replace(/^0+(?=\d)/, ''));

export default function App() {
  const [formData, setFormData] = useState({
    idDispositivo: '',
    tipoHoja: 'DISPOSITIVOS',
    estado: 'BUENO',
    observacion: ''
  });
  const [tecnico, setTecnico] = useState('');
  
  // Base de datos en memoria (cargada desde el JSON)
  const [devicesDatabase, setDevicesDatabase] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [databaseError, setDatabaseError] = useState('');
  
  // Datos encontrados en tiempo real según el ID digitado
  const [dispositivoEncontrado, setDispositivoEncontrado] = useState(null);
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

  // Estados independientes para las dos fotos
  const [fotoAntes, setFotoAntes] = useState(null);
  const [fotoDespues, setFotoDespues] = useState(null);
  const [captureSession, setCaptureSession] = useState(0);
  
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  // Cargar la base de datos JSON optimizada al montar la app
  useEffect(() => {
    const controller = new AbortController();

    fetch('/data/SQL_fads_oficial_backend.json', { signal: controller.signal })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`La base de datos respondió con HTTP ${res.status}.`);
        }
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
        if (!controller.signal.aborted) {
          setLoadingData(false);
        }
      });

    return () => controller.abort();
  }, []);

  // Manejar cambios y buscar coincidencia en el JSON en tiempo real
  const handleChange = (e) => {
    const { name, value } = e.target;
    const upperValue = value.toUpperCase();
    
    setFormData((previous) => ({ ...previous, [name]: upperValue }));

    if (name === 'idDispositivo') {
      const normalizedId = normalizeDeviceId(upperValue);
      if (!normalizedId) {
        setDispositivoEncontrado(null);
      } else {
        setDispositivoEncontrado(devicesById.get(normalizedId) || null);
      }
    }
  };

  const selectDevice = (device) => {
    const id = normalizeDeviceId(device.ID);
    setFormData((previous) => ({ ...previous, idDispositivo: id }));
    setDispositivoEncontrado(device);
  };

  const closeTechnicianSession = () => {
    if (loading) return;

    const hasPendingChanges = Boolean(
      formData.idDispositivo
      || formData.observacion
      || formData.tipoHoja !== 'DISPOSITIVOS'
      || formData.estado !== 'BUENO'
      || fotoAntes
      || fotoDespues
    );
    if (hasPendingChanges && !window.confirm('Se descartará el registro que no has guardado. ¿Quieres cerrar la sesión?')) {
      return;
    }

    setTecnico('');
    setFormData({ idDispositivo: '', tipoHoja: 'DISPOSITIVOS', estado: 'BUENO', observacion: '' });
    setDispositivoEncontrado(null);
    setFotoAntes(null);
    setFotoDespues(null);
    setCaptureSession((session) => session + 1);
    setMensaje(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.idDispositivo) {
      alert('Por favor digite el ID del dispositivo.');
      return;
    }
    setLoading(true);
    setMensaje(null);

    try {
      const backendUrl = 'https://bimanual-alisa-unsuperfluous.ngrok-free.dev/api/registrar';

      const dataToSend = new FormData();
      dataToSend.append('idDispositivo', dispositivoEncontrado?.ID || formData.idDispositivo);
      dataToSend.append('tipoHoja', formData.tipoHoja);
      dataToSend.append('tecnico', tecnico);
      dataToSend.append('estado', formData.estado);
      dataToSend.append('observacion', formData.observacion);
      
      if (fotoAntes) dataToSend.append('fotoAntes', fotoAntes);
      if (fotoDespues) dataToSend.append('fotoDespues', fotoDespues);

      const response = await fetch(backendUrl, {
        method: 'POST',
        body: dataToSend,
      });

      const result = await response.json();

      if (response.ok) {
        const sheetName = formData.tipoHoja === 'CONFINADOS'
          ? 'DISPOSITIVOS CONFINADOS'
          : 'DISPOSITIVOS';
        setMensaje({ type: 'success', text: `¡Registro guardado en la pestaña ${sheetName} exitosamente!` });
        setFormData({ idDispositivo: '', tipoHoja: 'DISPOSITIVOS', estado: 'BUENO', observacion: '' });
        setDispositivoEncontrado(null);
        setFotoAntes(null);
        setFotoDespues(null);
        setCaptureSession((session) => session + 1);
      } else {
        setMensaje({ type: 'error', text: result.error || 'Hubo un error al procesar la solicitud en el servidor.' });
      }
    } catch (err) {
      console.error(err);
      alert('No se pudo conectar con el servidor local. Verifica que el backend y ngrok estén activos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="brand-group">
          <div className="brand-logo">JC</div>
          <span className="brand-title">Johnson Controls</span>
        </div>
        <div className="location-badge">
          <Building2 size={14} color="#2563eb" />
          <span>El Dorado</span>
        </div>
      </header>

      <main className="app-body">
        {tecnico ? (
          <>
        <div className="section-header">
          <h2>Registro FADS</h2>
          <p>
            {loadingData
              ? 'Cargando base de datos...'
              : databaseError
                ? 'No se pudo cargar la base de datos de dispositivos.'
                : 'Ingrese ID del dispositivo y guarde el registro.'}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '10px', color: '#334155', fontSize: '13px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <UserRound size={15} />
              <span><strong>Técnico:</strong> {tecnico}</span>
            </span>
            <button
              type="button"
              onClick={closeTechnicianSession}
              disabled={loading}
              title="Cerrar sesión del técnico"
              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 8px', border: '1px solid #fecaca', borderRadius: '8px', background: '#fff', color: '#b91c1c', font: 'inherit', cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              <LogOut size={14} />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>

        {mensaje && (
          <div className={`alert-box ${mensaje.type === 'success' ? 'alert-success' : 'alert-error'}`}>
            {mensaje.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{mensaje.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="form-stack">
          
          <div className="field-group">
            <label className="field-label" htmlFor="tipoHoja">Pestaña del informe</label>
            <select
              id="tipoHoja"
              name="tipoHoja"
              value={formData.tipoHoja}
              onChange={handleChange}
              className="form-input"
            >
              <option value="DISPOSITIVOS">DISPOSITIVOS</option>
              <option value="CONFINADOS">DISPOSITIVOS CONFINADOS</option>
            </select>
          </div>

          {/* Campo ID del Dispositivo */}
          <div className="field-group">
            <label className="field-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>ID del Dispositivo</span>
              {!loadingData && (
                <span style={{ fontSize: '10px', color: databaseError ? '#dc2626' : '#2563eb' }}>
                  {databaseError ? 'BD no disponible' : `BD conectada (${devicesById.size} IDs)`}
                </span>
              )}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                name="idDispositivo"
                value={formData.idDispositivo}
                onChange={handleChange}
                required
                className="form-input uppercase-input"
                style={{ paddingRight: '35px' }}
              />
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }} />
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
            {databaseError && (
              <span className="database-error" role="alert">
                {databaseError}
              </span>
            )}
          </div>

          {/* Tarjeta de validación visual de Ubicación y Tecnología en tiempo real */}
          {formData.idDispositivo && (
            <div style={{ background: dispositivoEncontrado ? '#f0fdf4' : '#fef2f2', border: `1px solid ${dispositivoEncontrado ? '#bbf7d0' : '#fecaca'}`, padding: '10px 12px', borderRadius: '8px', fontSize: '13px' }}>
              {dispositivoEncontrado ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#166534', fontWeight: 'bold', marginBottom: '4px' }}>
                    <CheckCircle2 size={14} /> Dispositivo encontrado en base de datos:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', color: '#334155' }}>
                    <div><MapPin size={12}/> <strong>Ubicación:</strong> {dispositivoEncontrado.UBICACION || 'N/A'}</div>
                    <div><Cpu size={12}/> <strong>D/TIVO:</strong> {dispositivoEncontrado.DISPOSITIVO || 'N/A'}</div>
                    <div><Cpu size={12}/> <strong>Tecnología:</strong> {dispositivoEncontrado.TIPO || 'N/A'}</div>
                  </div>
                </div>
              ) : (
                <div style={{ color: '#991b1b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertCircle size={14} /> ID no encontrado en la base de datos. No se puede registrar sin validar ubicación y tecnología.
                </div>
              )}
            </div>
          )}

          {/* Campo Estado */}
          <div className="field-group">
            <label className="field-label">Estado del Dispositivo</label>
            <select name="estado" value={formData.estado} onChange={handleChange} className="form-input">
              <option value="BUENO">OPERATIVO</option>
              <option value="DEFECTUOSO">DEFECTUOSO</option>
            </select>
          </div>

          {/* Bloque para la Foto ANTES */}
          <div className="field-group" style={{ border: '1px dashed #cbd5e1', padding: '12px', borderRadius: '8px' }}>
            <label className="field-label" style={{ fontWeight: 'bold', color: '#1e40af', marginBottom: '8px', display: 'block' }}>
              📸 Foto ANTES del mantenimiento
            </label>
            <CameraCapture key={`antes-${captureSession}`} onCapture={(file) => setFotoAntes(file)} />
            {fotoAntes && <span style={{ fontSize: '12px', color: 'green', display: 'block', marginTop: '6px' }}>✓ Foto 'Antes' cargada</span>}
          </div>

          {/* Bloque para la Foto DESPUÉS */}
          <div className="field-group" style={{ border: '1px dashed #cbd5e1', padding: '12px', borderRadius: '8px', marginTop: '10px' }}>
            <label className="field-label" style={{ fontWeight: 'bold', color: '#1e40af',marginBottom: '8px', display: 'block' }}>
              📸 Foto DESPUÉS del mantenimiento
            </label>
            <CameraCapture key={`despues-${captureSession}`} onCapture={(file) => setFotoDespues(file)} />
            {fotoDespues && <span style={{ fontSize: '12px', color: 'green', display: 'block', marginTop: '6px' }}>✓ Foto 'Después' cargada</span>}
          </div>

          <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: '15px' }}>
            <Send size={15} />
            <span>{loading ? 'Actualizando Excel...' : 'Guardar Registro'}</span>
          </button>

        </form>
        </>
        ) : (
        <TechnicianSetup onConfirm={setTecnico} />
        )}
        <footer className="app-footer">Johnson Controls • Sistema Automatizado FADS</footer>
      </main>
    </div>
  );
}