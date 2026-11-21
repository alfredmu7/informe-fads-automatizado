const HEADER_ALIASES = {
  item: ['ITEM'],
  id: ['ID'],
  phase: ['FASE I,II O AMPL.', 'FASE'],
  location: ['UBICACION'],
  date: ['FECHA'],
  technician: ['TECNICO RESPONSABLE'],
  initialState: ['ESTADO INICIAL'],
  inspectionVisual: ['INSP. VISUAL'],
  mountSupport: ['MONTAJE MASTIL SOPORTE'],
  cameraConnections: ['CONEXIONES CAMARA'],
  lensCleaning: ['LIMPIEZA LENTE'],
  housingCleaning: ['HOUSING LIMPIEZA AJUSTE'],
  finalState: ['ESTADO FINAL'],
  doubleHeight: ['DOBLE ALTURA'],
  observation: ['OBSERVACIONES', 'OBSERVACION'],
  focus: ['FOCO'],
  iris: ['IRIS'],
  sharpness: ['NITIDEZ'],
  movement: ['MOVIMIENTO'],
  marquilla: ['MARQUILLA'],
  photoBefore: ['FOTO ANTES'],
  photoAfter: ['FOTO DESPUES'],
};

const REQUIRED_FIELDS = Object.keys(HEADER_ALIASES);

const CHECKLIST_COLUMN_BY_ITEM = {
  'inspection-visual': 'inspectionVisual',
  'mount-support': 'mountSupport',
  'camera-connections': 'cameraConnections',
  'lens-cleaning': 'lensCleaning',
  'housing-cleaning': 'housingCleaning',
  'double-height': 'doubleHeight',
  focus: 'focus',
  iris: 'iris',
  sharpness: 'sharpness',
  movement: 'movement',
  marquilla: 'marquilla',
};

function normalizeHeader(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/gi, '')
    .toUpperCase();
}

function getCellText(cell) {
  const value = cell?.value;
  if (value == null) return '';
  if (typeof value === 'object') {
    if (value.text) return String(value.text);
    if (Array.isArray(value.richText)) return value.richText.map((item) => item.text).join('');
    if (value.result !== undefined) return String(value.result);
  }
  return String(value);
}

function normalizeCctvId(id) {
  return String(id ?? '').trim().toUpperCase();
}

function findCctvCameraById(cameras, id) {
  const normalizedId = normalizeCctvId(id);
  if (!normalizedId) return null;

  return cameras.find((camera) => normalizeCctvId(camera.ID) === normalizedId) || null;
}

function buildCctvPhotoFilename(fieldName, id, extension, uniqueSuffix) {
  const photoName = fieldName === 'fotoAntes'
    ? 'antes'
    : fieldName === 'fotoDespues'
      ? 'despues'
      : null;
  if (!photoName) throw new Error(`Campo de foto CCTV no reconocido: ${fieldName}`);

  const safeId = normalizeCctvId(id).replace(/[^A-Z0-9]/g, '_') || 'CAMARA';
  const safeExtension = /^\.[A-Z0-9]{1,10}$/i.test(extension) ? extension.toLowerCase() : '.jpg';
  const suffix = String(uniqueSuffix || '').replace(/[^A-Z0-9_-]/gi, '_');
  return `${photoName}_${safeId}_${suffix}${safeExtension}`;
}

function findCctvReportColumns(worksheet) {
  const maxRowToScan = Math.min(Math.max(worksheet.rowCount, 1), 15);
  const maxColToScan = Math.max(worksheet.columnCount, 22);

  for (let rowNumber = 1; rowNumber <= maxRowToScan; rowNumber += 1) {
    const headerRow = worksheet.getRow(rowNumber);
    const headers = [];
    for (let columnNumber = 1; columnNumber <= maxColToScan; columnNumber += 1) {
      headers.push(normalizeHeader(getCellText(headerRow.getCell(columnNumber))));
    }

    const columns = {};
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      const normalizedAliases = aliases.map(normalizeHeader);
      const foundIndex = headers.findIndex((header) => normalizedAliases.includes(header));
      columns[field] = foundIndex >= 0 ? foundIndex + 1 : -1;
    }

    if (columns.item > 0 && columns.id > 0) {
      return { headerRow: rowNumber, columns };
    }
  }

  throw new Error('No se encontraron los encabezados ITEM e ID en la hoja de CCTV.');
}

function assertRequiredCctvColumns(columns) {
  const missing = REQUIRED_FIELDS.filter((field) => columns[field] < 1);
  if (missing.length) {
    const names = missing.map((field) => HEADER_ALIASES[field][0]).join(', ');
    const error = new Error(`La hoja de CCTV no tiene estas columnas requeridas: ${names}.`);
    error.statusCode = 400;
    throw error;
  }
}

function buildCctvChecklistValues(selectedItems) {
  if (!Array.isArray(selectedItems) || selectedItems.some((item) => typeof item !== 'string')) {
    const error = new Error('Datos de inspección CCTV inválidos: la lista de casillas no tiene un formato válido.');
    error.statusCode = 400;
    throw error;
  }

  const selected = new Set(selectedItems);
  const allowedItems = Object.keys(CHECKLIST_COLUMN_BY_ITEM);
  if (
    selected.size !== selectedItems.length
    || selectedItems.some((item) => !allowedItems.includes(item))
  ) {
    const error = new Error('Datos de inspección CCTV inválidos: hay casillas no reconocidas.');
    error.statusCode = 400;
    throw error;
  }

  return Object.fromEntries(
    Object.entries(CHECKLIST_COLUMN_BY_ITEM).map(([item, field]) => [
      field,
      selected.has(item) ? 'SI' : 'NO',
    ]),
  );
}

function findCctvReportRowMismatch(row, columns, expectedValues) {
  return Object.entries(expectedValues).find(([field, expected]) => {
    const column = columns[field];
    if (!Number.isInteger(column) || column < 1) return false;

    const value = row?.getCell(column).value;
    const actual = field === 'photoBefore' || field === 'photoAfter'
      ? value?.hyperlink ?? ''
      : value;
    return String(actual ?? '') !== String(expected ?? '');
  });
}

function normalizeCctvWriteError(error, workbookSaved) {
  if (error.code === 'EBUSY' || error.code === 'EPERM') {
    return workbookSaved
      ? {
        statusCode: 500,
        message: 'El informe CCTV se escribió, pero quedó bloqueado antes de poder verificarse. Revisa la fila más reciente antes de volver a enviar el registro.',
      }
      : {
        statusCode: 409,
        message: 'El informe CCTV está abierto o bloqueado por Excel/OneDrive. No se confirmó el guardado; cierra el archivo y vuelve a intentarlo.',
      };
  }

  return {
    statusCode: error.statusCode || 500,
    message: error.message || 'Error interno al actualizar el Excel CCTV.',
  };
}

async function writeCctvReportRow(worksheet, registration) {
  const { headerRow, columns } = findCctvReportColumns(worksheet);
  assertRequiredCctvColumns(columns);

  const initialState = String(registration.initialState ?? '');
  const finalState = String(registration.finalState ?? '');
  const allowedStates = ['Operativo', 'Defectuoso'];
  if (!allowedStates.includes(initialState) || !allowedStates.includes(finalState)) {
    const error = new Error('Datos de estado inválidos: selecciona un estado inicial y final.');
    error.statusCode = 400;
    throw error;
  }

  const checklistValues = buildCctvChecklistValues(registration.selectedItems);
  const id = normalizeCctvId(registration.camera?.ID);
  if (!id) {
    const error = new Error('El ID de la cámara es obligatorio.');
    error.statusCode = 400;
    throw error;
  }

  let rowNumber = headerRow + 1;
  while (getCellText(worksheet.getRow(rowNumber).getCell(columns.id)).trim() !== '') {
    rowNumber += 1;
  }

  let nextItem = 1;
  for (let currentRow = headerRow + 1; currentRow < rowNumber; currentRow += 1) {
    const numericItem = Number(getCellText(
      worksheet.getRow(currentRow).getCell(columns.item),
    ).trim());
    if (Number.isFinite(numericItem) && numericItem > 0) {
      nextItem = Math.max(nextItem, numericItem + 1);
    }
  }

  const values = {
    item: nextItem,
    id,
    phase: registration.camera.FASE ?? '',
    location: registration.camera.UBICACION ?? '',
    date: registration.date,
    technician: registration.technician,
    initialState,
    finalState,
    observation: registration.observation,
    ...checklistValues,
  };

  const targetRow = worksheet.getRow(rowNumber);
  targetRow.height = 24;
  for (const [field, value] of Object.entries(values)) {
    targetRow.getCell(columns[field]).value = typeof value === 'number' ? value : String(value ?? '');
  }

  for (const [field, text] of [
    ['photoBefore', 'Ver Foto Antes'],
    ['photoAfter', 'Ver Foto Después'],
  ]) {
    const url = registration.photoLinks?.[field];
    if (!url) {
      targetRow.getCell(columns[field]).value = '';
      continue;
    }
    targetRow.getCell(columns[field]).value = { text, hyperlink: url, tooltip: text };
  }

  targetRow.commit();
  return { row: rowNumber - 1, item: nextItem, columns, values };
}

module.exports = {
  assertRequiredCctvColumns,
  buildCctvPhotoFilename,
  buildCctvChecklistValues,
  findCctvCameraById,
  findCctvReportColumns,
  findCctvReportRowMismatch,
  normalizeCctvWriteError,
  normalizeCctvId,
  writeCctvReportRow,
};
