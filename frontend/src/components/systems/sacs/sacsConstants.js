export const SACS_STEPS = [
  {
    title: 'Datos del dispositivo',
    description: 'Elige la matriz y busca el ID en la base de dispositivos SACS.',
  },
  {
    title: 'Lista de revisión',
    description: 'Registra las verificaciones y los valores de la matriz seleccionada.',
  },
  {
    title: 'Evidencia y cierre',
    description: 'Agrega observaciones y fotografías del mantenimiento.',
  },
];

export const SACS_SHEETS = [
  { id: 'Puertas', label: 'Puertas', hasGeneral: true },
  { id: 'Botones', label: 'Botones', hasGeneral: false },
  { id: 'Citofonia', label: 'Citofonía', hasGeneral: true },
  { id: 'CK', label: 'CK', hasGeneral: false },
];

export const SACS_CHECKLISTS = {
  Puertas: [
    { id: 'biometric-reader-entry', label: 'Lectora biométrica entrada' },
    { id: 'key-switch', label: 'Key switch' },
    { id: 'entry-reader', label: 'Lectora de entrada' },
    { id: 'strobe-siren', label: 'Sirena estroboscópica' },
    { id: 'button', label: 'Botón' },
    { id: 'exit-reader', label: 'Lectora de salida' },
    { id: 'exit-intercom', label: 'Intercom de salida' },
    { id: 'maglock-1', label: 'Electroimán #1' },
    { id: 'maglock-2', label: 'Electroimán #2' },
    { id: 'tamper', label: 'Tamper' },
    { id: 'timer', label: 'Timer' },
    { id: 'reader-controller', label: 'Controladora RDR' },
    { id: 'battery-1', label: 'Batería #1' },
    { id: 'battery-2', label: 'Batería #2' },
    { id: 'marquilla', label: 'Marquilla', defaultChecked: true },
  ],
  Botones: [
    { id: 'pedal', label: 'Pedal' },
    { id: 'button', label: 'Botón', defaultChecked: true },
    { id: 'acrylic', label: 'Acrílico' },
    { id: 'initial-state', label: 'Estado inicial', defaultChecked: true },
    { id: 'visual-inspection', label: 'Inspección visual', defaultChecked: true },
    { id: 'mounting', label: 'Montaje', defaultChecked: true },
    { id: 'connection', label: 'Conexión', defaultChecked: true },
    { id: 'final-state', label: 'Estado final', defaultChecked: true },
    { id: 'ccure-graphic', label: 'Gráfico CCURE', defaultChecked: true },
    { id: 'real-time', label: 'Real time', defaultChecked: true },
    { id: 'marquilla', label: 'Marquilla', defaultChecked: true },
  ],
  Citofonia: [
    { id: 'led-state', label: 'Estado de LEDs', defaultChecked: true },
    { id: 'connections-adjustments', label: 'Conexiones y ajustes', defaultChecked: true },
    { id: 'rack-mounting', label: 'Montaje en RAC', defaultChecked: true },
    { id: 'rack-number', label: 'Número de RAC', defaultChecked: true },
    { id: 'cleaning', label: 'Limpieza', defaultChecked: true },
    { id: 'led-verification', label: 'Verificación de LEDs', defaultChecked: true },
    { id: 'equipment-server-connection', label: 'Conexión equipo-servidor', defaultChecked: true },
    { id: 'final-state', label: 'Estado final', defaultChecked: true },
    { id: 'marquilla', label: 'Marquilla', defaultChecked: true },
  ],
  CK: [
    { id: 'initial-state', label: 'Estado inicial', defaultChecked: true },
    { id: 'visual-inspection', label: 'Inspección visual', defaultChecked: true },
    { id: 'mounting', label: 'Montaje', defaultChecked: true },
    { id: 'connection', label: 'Conexión', defaultChecked: true },
    { id: 'cleaning', label: 'Limpieza', defaultChecked: true },
    { id: 'final-state', label: 'Estado final', defaultChecked: true },
    { id: 'led-state', label: 'Estado de LEDs', defaultChecked: true },
    { id: 'ccure-state', label: 'Estado CCURE', defaultChecked: true },
    { id: 'cabinet-anchoring', label: 'Anclaje de gabinete', defaultChecked: true },
    { id: 'terminal-connection', label: 'Conexión de borneras', defaultChecked: true },
    { id: 'marquilla', label: 'Marquilla', defaultChecked: true },
  ],
};

export const SACS_NUMERIC_FIELDS = {
  Citofonia: [
    { id: 'supply-voltage', label: 'Voltaje de alimentación', defaultValue: 48, step: 'any' },
    { id: 'occupied-ports', label: 'Puertos ocupados', defaultValue: 23, step: 1, integer: true },
    { id: 'free-ports', label: 'Puertos libres', defaultValue: 7, step: 1, integer: true },
  ],
  CK: [
    { id: 'controller-voltage', label: 'Voltaje alimentación controladores (VDC)', defaultValue: 27, step: 'any' },
    { id: 'bus-voltage-1', label: 'Voltaje 1 del bus 485 (VDC)', defaultValue: 2.2, step: 'any' },
    { id: 'bus-voltage-2', label: 'Voltaje 2 del bus 485 (VDC)', defaultValue: 1.5, step: 'any' },
    { id: 'bus-voltage-3', label: 'Voltaje 3 del bus 485 (VDC)', defaultValue: 0.5, step: 'any' },
  ],
};

export const GENERAL_OPTIONS = ['GENERAL', 'SWINGATE', 'AMPLIACION'];

export function getDefaultSacsChecklist(sheetName) {
  return (SACS_CHECKLISTS[sheetName] || [])
    .filter((item) => item.defaultChecked)
    .map((item) => item.id);
}

export function getDefaultSacsNumericValues(sheetName) {
  return Object.fromEntries(
    (SACS_NUMERIC_FIELDS[sheetName] || []).map((field) => [field.id, String(field.defaultValue)]),
  );
}

export const createInitialSacsFormData = () => ({
  hoja: '',
  idDispositivo: '',
  general: '',
  observacion: '',
  numericValues: {},
});
