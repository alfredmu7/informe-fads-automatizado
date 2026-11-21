import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createInitialCctvChecklist,
  createInitialCctvFormData,
} from './cctvConstants';
import { getCctvEndpoint, readJsonResponse } from './cctvApi';

const normalizeCameraId = (id) => String(id ?? '').trim().toUpperCase();

export default function useCctvForm(technician) {
  const [formData, setFormData] = useState(createInitialCctvFormData);
  const [cameras, setCameras] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [databaseError, setDatabaseError] = useState('');
  const [checkedItems, setCheckedItems] = useState(createInitialCctvChecklist);
  const [fotoAntes, setFotoAntes] = useState(null);
  const [fotoDespues, setFotoDespues] = useState(null);
  const [captureSession, setCaptureSession] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const savingRequestRef = useRef(false);
  const [message, setMessage] = useState(null);

  const camerasById = useMemo(() => {
    const index = new Map();
    cameras.forEach((camera) => {
      const id = normalizeCameraId(camera.ID);
      if (id && !index.has(id)) index.set(id, camera);
    });
    return index;
  }, [cameras]);

  const selectedCamera = camerasById.get(normalizeCameraId(formData.idDispositivo)) || null;

  const matchingCameras = useMemo(() => {
    const query = normalizeCameraId(formData.idDispositivo);
    if (!query || selectedCamera) return [];
    return [...camerasById.entries()]
      .filter(([id]) => id.startsWith(query))
      .map(([, camera]) => camera)
      .slice(0, 8);
  }, [camerasById, formData.idDispositivo, selectedCamera]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(getCctvEndpoint('dispositivos'), {
      signal: controller.signal,
      headers: { 'ngrok-skip-browser-warning': 'true' },
    })
      .then(async (response) => {
        const result = await readJsonResponse(response);
        if (!response.ok) throw new Error(result?.error || `Error HTTP ${response.status} al cargar la base CCTV.`);
        if (!Array.isArray(result)) throw new Error('La base de cámaras CCTV no contiene una lista válida.');
        setCameras(result);
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          console.error('Error al cargar la base de cámaras CCTV:', error);
          setDatabaseError(error.message || 'No se pudo cargar la base de cámaras CCTV.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingData(false);
      });

    return () => controller.abort();
  }, []);

  const updateField = (name, value) => {
    setFormData((previous) => ({
      ...previous,
      [name]: name === 'idDispositivo' ? value.toUpperCase() : value,
    }));
    setMessage(null);
  };

  const selectCamera = (camera) => {
    setFormData((previous) => ({ ...previous, idDispositivo: String(camera.ID) }));
    setMessage(null);
  };

  const toggleChecklistItem = (itemId) => {
    setCheckedItems((previous) => (
      previous.includes(itemId)
        ? previous.filter((item) => item !== itemId)
        : [...previous, itemId]
    ));
    setMessage(null);
  };

  const resetForm = () => {
    setFormData(createInitialCctvFormData());
    setCheckedItems(createInitialCctvChecklist());
    setFotoAntes(null);
    setFotoDespues(null);
    setCaptureSession((session) => session + 1);
    setCurrentStep(0);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (currentStep !== 2 || savingRequestRef.current) return;

    if (!selectedCamera) {
      setCurrentStep(0);
      setMessage({ type: 'error', text: 'Selecciona un ID de la base de cámaras CCTV antes de guardar.' });
      return;
    }

    savingRequestRef.current = true;
    setSaving(true);
    setMessage(null);

    try {
      const dataToSend = new FormData();
      dataToSend.append('idDispositivo', selectedCamera.ID);
      dataToSend.append('tecnico', technician);
      dataToSend.append('estadoInicial', formData.estadoInicial);
      dataToSend.append('estadoFinal', formData.estadoFinal);
      dataToSend.append('observacion', formData.observacion);
      dataToSend.append('checklistItems', JSON.stringify(checkedItems));
      if (fotoAntes) dataToSend.append('fotoAntes', fotoAntes);
      if (fotoDespues) dataToSend.append('fotoDespues', fotoDespues);

      const response = await fetch(getCctvEndpoint('registrar'), {
        method: 'POST',
        headers: { 'ngrok-skip-browser-warning': 'true' },
        body: dataToSend,
      });
      const result = await readJsonResponse(response);
      if (!response.ok || result?.success !== true || result?.inspectionSaved !== true) {
        throw new Error(result?.error || `Error HTTP ${response.status} al guardar el registro CCTV.`);
      }

      const savedRow = Number(result.fila);
      if (!Number.isInteger(savedRow) || savedRow < 1) {
        throw new Error('El servidor no confirmó la fila escrita en el informe CCTV.');
      }

      setMessage({
        type: 'info',
        text: `Registro CCTV guardado en la fila ${savedRow} (ítem ${result.item}).`,
      });
      resetForm();
    } catch (error) {
      console.error('Error al guardar el registro CCTV:', error);
      setMessage({
        type: 'error',
        text: error.message || 'No se pudo conectar con el servidor CCTV.',
      });
    } finally {
      savingRequestRef.current = false;
      setSaving(false);
    }
  };

  const goToNextStep = () => {
    if (currentStep === 0 && !selectedCamera) {
      setMessage({ type: 'error', text: 'Ingresa y selecciona un ID existente en la base de cámaras.' });
      return;
    }
    setMessage(null);
    setCurrentStep((step) => Math.min(step + 1, 2));
  };

  const goToPreviousStep = () => {
    setMessage(null);
    setCurrentStep((step) => Math.max(step - 1, 0));
  };

  return {
    cameras: camerasById.size,
    checkedItems,
    currentStep,
    databaseError,
    fotoAntes,
    fotoDespues,
    formData,
    goToNextStep,
    goToPreviousStep,
    handleSubmit,
    loadingData,
    matchingCameras,
    message,
    saving,
    selectCamera,
    selectedCamera,
    setFotoAntes,
    setFotoDespues,
    toggleChecklistItem,
    updateField,
    captureSession,
  };
}
