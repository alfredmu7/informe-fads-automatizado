export const CCTV_STEPS = [
  {
    title: 'Datos de la cámara',
    description: 'Busca el ID en la base de cámaras y confirma la ubicación.',
  },
  {
    title: 'Lista de revisión',
    description: 'Registra los estados y las verificaciones realizadas.',
  },
  {
    title: 'Evidencia y cierre',
    description: 'Agrega observaciones y fotografías de la inspección.',
  },
];

export const CCTV_CHECKLIST_ITEMS = [
  { id: 'inspection-visual', label: 'Inspección visual', defaultChecked: true },
  { id: 'mount-support', label: 'Montaje mástil / soporte', defaultChecked: true },
  { id: 'camera-connections', label: 'Conexiones cámara / face plate', defaultChecked: true },
  { id: 'lens-cleaning', label: 'Limpieza de lente', defaultChecked: true },
  { id: 'housing-cleaning', label: 'Housing: limpieza y ajuste', defaultChecked: true },
  { id: 'double-height', label: 'Doble altura', defaultChecked: false },
  { id: 'focus', label: 'Foco', defaultChecked: true },
  { id: 'iris', label: 'Iris', defaultChecked: true },
  { id: 'sharpness', label: 'Nitidez', defaultChecked: true },
  { id: 'movement', label: 'Movimiento', defaultChecked: false },
  { id: 'marquilla', label: 'Marquilla', defaultChecked: true },
];

export const createInitialCctvFormData = () => ({
  idDispositivo: '',
  estadoInicial: 'Operativo',
  estadoFinal: 'Operativo',
  observacion: '',
});

export const createInitialCctvChecklist = () => CCTV_CHECKLIST_ITEMS
  .filter((item) => item.defaultChecked)
  .map((item) => item.id);
