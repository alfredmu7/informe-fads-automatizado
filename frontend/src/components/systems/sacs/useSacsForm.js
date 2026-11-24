import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createInitialSacsFormData,
  getDefaultSacsChecklist,
  getDefaultSacsNumericValues,
  SACS_STEPS,
  SACS_SHEETS,
} from './sacsConstants';
import { getSacsEndpoint, readSacsJsonResponse } from './sacsApi';

const normalizeSacsId = (id) => String(id ?? '').trim().toUpperCase();
const getDeviceKey = (device) => String(device.ITEM);

export default function useSacsForm(technician) {
  const [formData, setFormData] = useState(createInitialSacsFormData);
  const [devices, setDevices] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [databaseError, setDatabaseError] = useState('');
  const [selectedDeviceKey, setSelectedDeviceKey] = useState('');
  const [checkedItems, setCheckedItems] = useState([]);
  const [fotoAntes, setFotoAntes] = useState(null);
  const [fotoDespues, setFotoDespues] = useState(null);
  const [captureSession, setCaptureSession] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const savingRequestRef = useRef(false);
  const [message, setMessage] = useState(null);

  const exactIdMatches = useMemo(() => {
    const id = normalizeSacsId(formData.idDispositivo);
    if (!id) return [];
    return devices.filter((device) => normalizeSacsId(device.ID) === id);
  }, [devices, formData.idDispositivo]);

  const selectedDevice = useMemo(() => {
    if (selectedDeviceKey) {
      return devices.find((device) => getDeviceKey(device) === selectedDeviceKey) || null;
    }
    return exactIdMatches.length === 1 ? exactIdMatches[0] : null;
  }, [devices, exactIdMatches, selectedDeviceKey]);

  const matchingDevices = useMemo(() => {
    const query = normalizeSacsId(formData.idDispositivo);
    if (!query || selectedDevice) return [];
    return devices
      .filter((device) => normalizeSacsId(device.ID).startsWith(query))
      .slice(0, 10);
  }, [devices, formData.idDispositivo, selectedDevice]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(getSacsEndpoint('dispositivos'), {
      signal: controller.signal,
      headers: { 'ngrok-skip-browser-warning': 'true' },
    })
      .then(async (response) => {
        const result = await readSacsJsonResponse(response);
        if (!response.ok) throw new Error(result?.error || `Error HTTP ${response.status} al cargar la base SACS.`);
        if (!Array.isArray(result)) throw new Error('La base de dispositivos SACS no contiene una lista válida.');
        setDevices(result);
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          console.error('Error al cargar la base de dispositivos SACS:', error);
          setDatabaseError(error.message || 'No se pudo cargar la base de dispositivos SACS.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingData(false);
      });

    return () => controller.abort();
  }, []);

  const setSheet = (sheetName) => {
    if (!SACS_SHEETS.some((sheet) => sheet.id === sheetName)) return;
    setFormData({
      ...createInitialSacsFormData(),
      hoja: sheetName,
      numericValues: getDefaultSacsNumericValues(sheetName),
    });
    setSelectedDeviceKey('');
    setCheckedItems(getDefaultSacsChecklist(sheetName));
    setFotoAntes(null);
    setFotoDespues(null);
    setCaptureSession((session) => session + 1);
    setCurrentStep(0);
    setMessage(null);
  };

  const updateField = (name, value) => {
    setFormData((previous) => ({
      ...previous,
      [name]: name === 'idDispositivo' ? value.toUpperCase() : value,
    }));
    if (name === 'idDispositivo') setSelectedDeviceKey('');
    setMessage(null);
  };

  const updateNumericValue = (fieldId, value) => {
    setFormData((previous) => ({
      ...previous,
      numericValues: { ...previous.numericValues, [fieldId]: value },
    }));
    setMessage(null);
  };

  const selectDevice = (device) => {
    setFormData((previous) => ({ ...previous, idDispositivo: String(device.ID) }));
    setSelectedDeviceKey(getDeviceKey(device));
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
    setFormData(createInitialSacsFormData());
    setSelectedDeviceKey('');
    setCheckedItems([]);
    setFotoAntes(null);
    setFotoDespues(null);
    setCaptureSession((session) => session + 1);
    setCurrentStep(0);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (currentStep !== 2 || savingRequestRef.current) return;

    if (!SACS_SHEETS.some((sheet) => sheet.id === formData.hoja) || !selectedDevice) {
      setCurrentStep(0);
      setMessage({ type: 'error', text: 'Selecciona la matriz y un dispositivo de la base SACS antes de guardar.' });
      return;
    }

    savingRequestRef.current = true;
    setSaving(true);
    setMessage(null);

    try {
      const dataToSend = new FormData();
      dataToSend.append('hoja', formData.hoja);
      dataToSend.append('idDispositivo', selectedDevice.ID);
      dataToSend.append('itemDispositivo', String(selectedDevice.ITEM));
      dataToSend.append('tecnico', technician);
      dataToSend.append('general', formData.general);
      dataToSend.append('observacion', formData.observacion);
      dataToSend.append('checklistItems', JSON.stringify(checkedItems));
      dataToSend.append('numericValues', JSON.stringify(formData.numericValues));
      if (fotoAntes) dataToSend.append('fotoAntes', fotoAntes);
      if (fotoDespues) dataToSend.append('fotoDespues', fotoDespues);

      const response = await fetch(getSacsEndpoint('registrar'), {
        method: 'POST',
        headers: { 'ngrok-skip-browser-warning': 'true' },
        body: dataToSend,
      });
      const result = await readSacsJsonResponse(response);
      if (!response.ok || result?.success !== true || result?.inspectionSaved !== true) {
        throw new Error(result?.error || `Error HTTP ${response.status} al guardar el registro SACS.`);
      }

      const savedRow = Number(result.fila);
      if (!Number.isInteger(savedRow) || savedRow < 1) {
        throw new Error('El servidor no confirmó la fila escrita en el informe SACS.');
      }

      setMessage({
        type: 'info',
        text: `Registro SACS guardado en ${result.hoja}, fila ${savedRow} (ítem ${result.item}).`,
      });
      resetForm();
    } catch (error) {
      console.error('Error al guardar el registro SACS:', error);
      setMessage({ type: 'error', text: error.message || 'No se pudo conectar con el servidor SACS.' });
    } finally {
      savingRequestRef.current = false;
      setSaving(false);
    }
  };

  const goToNextStep = () => {
    if (currentStep === 0 && (!formData.hoja || !selectedDevice)) {
      setMessage({ type: 'error', text: 'Selecciona la pestaña y un ID existente en la base de dispositivos SACS.' });
      return;
    }

    if (currentStep === 1) {
      const sheetConfig = SACS_SHEETS.find((sheet) => sheet.id === formData.hoja);
      if (sheetConfig?.hasGeneral && !formData.general) {
        setMessage({ type: 'error', text: 'Selecciona GENERAL, SWINGATE o AMPLIACION.' });
        return;
      }
      const invalidNumeric = Object.values(formData.numericValues).some(
        (value) => value === '' || !Number.isFinite(Number(value)) || Number(value) < 0,
      );
      if (invalidNumeric) {
        setMessage({ type: 'error', text: 'Revisa los valores numéricos; deben ser números iguales o mayores que cero.' });
        return;
      }
      if (
        ['Citofonia'].includes(formData.hoja)
        && ['occupied-ports', 'free-ports'].some(
          (fieldId) => !Number.isInteger(Number(formData.numericValues[fieldId])),
        )
      ) {
        setMessage({ type: 'error', text: 'Puertos ocupados y libres deben ser números enteros.' });
        return;
      }
    }

    setMessage(null);
    setCurrentStep((step) => Math.min(step + 1, SACS_STEPS.length - 1));
  };

  const goToPreviousStep = () => {
    setMessage(null);
    setCurrentStep((step) => Math.max(step - 1, 0));
  };

  return {
    checkedItems,
    currentStep,
    databaseError,
    devicesCount: devices.length,
    fotoAntes,
    fotoDespues,
    formData,
    goToNextStep,
    goToPreviousStep,
    handleSubmit,
    loadingData,
    matchingDevices,
    message,
    saving,
    selectDevice,
    selectedDevice,
    setFotoAntes,
    setFotoDespues,
    setSheet,
    toggleChecklistItem,
    updateField,
    updateNumericValue,
    captureSession,
  };
}
