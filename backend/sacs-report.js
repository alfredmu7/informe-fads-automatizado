const SHEET_CONFIG = {
  Puertas: {
    general: true,
    checklist: [
      { id: 'biometric-reader-entry', field: 'biometricReaderEntry', label: 'Lectora biométrica entrada', header: ['LECTORA BIOMETRICA ENTRADA'] },
      { id: 'key-switch', field: 'keySwitch', label: 'Key switch', header: ['KEY SWITCH'] },
      { id: 'entry-reader', field: 'entryReader', label: 'Lectora de entrada', header: ['LECTORA DE ENTRADA'] },
      { id: 'strobe-siren', field: 'strobeSiren', label: 'Sirena estroboscópica', header: ['SIRENA ESTROBOSCOPICA'] },
      { id: 'button', field: 'button', label: 'Botón', header: ['BOTON'] },
      { id: 'exit-reader', field: 'exitReader', label: 'Lectora de salida', header: ['LECTORA DE SALIDA'] },
      { id: 'exit-intercom', field: 'exitIntercom', label: 'Intercom de salida', header: ['INTERCOM DE SALIDA'] },
      { id: 'maglock-1', field: 'maglock1', label: 'Electroimán #1', header: ['ELECTROIMAN #1'] },
      { id: 'maglock-2', field: 'maglock2', label: 'Electroimán #2', header: ['ELECTROIMAN #2'] },
      { id: 'tamper', field: 'tamper', label: 'Tamper', header: ['TAMPER'] },
      { id: 'timer', field: 'timer', label: 'Timer', header: ['TIMER'] },
      { id: 'reader-controller', field: 'readerController', label: 'Controladora RDR', header: ['CONTROLADORA RDR'] },
      { id: 'battery-1', field: 'battery1', label: 'Batería #1', header: ['BATERIA #1'] },
      { id: 'battery-2', field: 'battery2', label: 'Batería #2', header: ['BATERIA #2'] },
      { id: 'marquilla', field: 'marquilla', label: 'Marquilla', header: ['MARQUILLA'], defaultChecked: true },
    ],
    observation: ['OBSERVACIONES', 'OBSERVACION'],
  },
  Botones: {
    checklist: [
      { id: 'pedal', field: 'pedal', label: 'Pedal', header: ['PEDAL'], defaultChecked: false },
      { id: 'button', field: 'button', label: 'Botón', header: ['BOTON'], defaultChecked: true },
      { id: 'acrylic', field: 'acrylic', label: 'Acrílico', header: ['ACRILICO'], defaultChecked: false },
      { id: 'initial-state', field: 'initialState', label: 'Estado inicial', header: ['ESTADO INICIAL'], defaultChecked: true },
      { id: 'visual-inspection', field: 'visualInspection', label: 'Inspección visual', header: ['INSP. VISUAL'], defaultChecked: true },
      { id: 'mounting', field: 'mounting', label: 'Montaje', header: ['MONTAJE'], defaultChecked: true },
      { id: 'connection', field: 'connection', label: 'Conexión', header: ['CONEX.'], defaultChecked: true },
      { id: 'final-state', field: 'finalState', label: 'Estado final', header: ['ESTADO FINAL'], defaultChecked: true },
      { id: 'ccure-graphic', field: 'ccureGraphic', label: 'Gráfico CCURE', header: ['GRAFICO CCURE'], defaultChecked: true },
      { id: 'real-time', field: 'realTime', label: 'Real time', header: ['REAL TIME'], defaultChecked: true },
      { id: 'marquilla', field: 'marquilla', label: 'Marquilla', header: ['MARQUILLA'], defaultChecked: true },
    ],
    observation: ['OBSERVACIONES', 'OBSERVACION'],
  },
  Citofonia: {
    general: true,
    checklist: [
      { id: 'led-state', field: 'ledState', label: 'Estado de LEDs', header: ['ESTADO DE LEDS'], defaultChecked: true },
      { id: 'connections-adjustments', field: 'connectionsAdjustments', label: 'Conexiones y ajustes', header: ['CONEX. Y AJUSTES'], defaultChecked: true },
      { id: 'rack-mounting', field: 'rackMounting', label: 'Montaje en RAC', header: ['MONTAJE EN RAC'], defaultChecked: true },
      { id: 'rack-number', field: 'rackNumber', label: 'Número de RAC', header: ['NUM. RAC'], defaultChecked: true },
      { id: 'cleaning', field: 'cleaning', label: 'Limpieza', header: ['LIMPIEZA'], defaultChecked: true },
      { id: 'led-verification', field: 'ledVerification', label: 'Verificación de LEDs', header: ['VERIFICACION LEDS'], defaultChecked: true },
      { id: 'equipment-server-connection', field: 'equipmentServerConnection', label: 'Conexión equipo-servidor', header: ['CONEX. EQUIPO-SERVIDOR'], defaultChecked: true },
      { id: 'final-state', field: 'finalState', label: 'Estado final', header: ['ESTADO FINAL'], defaultChecked: true },
      { id: 'marquilla', field: 'marquilla', label: 'Marquilla', header: ['MARQUILLA'], defaultChecked: true },
    ],
    numeric: [
      { id: 'supply-voltage', field: 'supplyVoltage', label: 'Voltaje de alimentación', header: ['VOLTAJE ALIMENT.'], defaultValue: 48, step: 'any' },
      { id: 'occupied-ports', field: 'occupiedPorts', label: 'Puertos ocupados', header: ['PUERTOS OCUPADOS'], defaultValue: 23, step: 1, integer: true },
      { id: 'free-ports', field: 'freePorts', label: 'Puertos libres', header: ['PUERTOS LIBRES'], defaultValue: 7, step: 1, integer: true },
    ],
    observation: ['OBSERVACIONES', 'OBSERVACION'],
  },
  CK: {
    checklist: [
      { id: 'initial-state', field: 'initialState', label: 'Estado inicial', header: ['ESTADO INICIAL'], defaultChecked: true },
      { id: 'visual-inspection', field: 'visualInspection', label: 'Inspección visual', header: ['INSP. VISUAL'], defaultChecked: true },
      { id: 'mounting', field: 'mounting', label: 'Montaje', header: ['MONTAJE'], defaultChecked: true },
      { id: 'connection', field: 'connection', label: 'Conexión', header: ['CONEX.'], defaultChecked: true },
      { id: 'cleaning', field: 'cleaning', label: 'Limpieza', header: ['LIMPIEZA'], defaultChecked: true },
      { id: 'final-state', field: 'finalState', label: 'Estado final', header: ['ESTADO FINAL'], defaultChecked: true },
      { id: 'led-state', field: 'ledState', label: 'Estado de LEDs', header: ['ESTADO DE LEDS'], defaultChecked: true },
      { id: 'ccure-state', field: 'ccureState', label: 'Estado CCURE', header: ['ESTADO CCURE'], defaultChecked: true },
      { id: 'cabinet-anchoring', field: 'cabinetAnchoring', label: 'Anclaje de gabinete', header: ['ANCLAJE GABINETE'], defaultChecked: true },
      { id: 'terminal-connection', field: 'terminalConnection', label: 'Conexión de borneras', header: ['CONEX. BORNERAS'], defaultChecked: true },
      { id: 'marquilla', field: 'marquilla', label: 'Marquilla', header: ['MARQUILLA'], defaultChecked: true },
    ],
    numeric: [
      { id: 'controller-voltage', field: 'controllerVoltage', label: 'Voltaje alimentación controladores (VDC)', header: ['VOLTAJE ALIMENT. CONTROLADORES VDC'], defaultValue: 27, step: 'any' },
      { id: 'bus-voltage-1', field: 'busVoltage1', label: 'Voltaje 1 del bus 485 (VDC)', header: ['VOLTAJE 1 DEL BUS 485 VDC'], defaultValue: 2.2, step: 'any' },
      { id: 'bus-voltage-2', field: 'busVoltage2', label: 'Voltaje 2 del bus 485 (VDC)', header: ['VOLTAJE 2 DEL BUS 485 VDC'], defaultValue: 1.5, step: 'any' },
      { id: 'bus-voltage-3', field: 'busVoltage3', label: 'Voltaje 3 del bus 485 (VDC)', header: ['VOLTAJE 3 DEL BUS 485 VDC'], defaultValue: 0.5, step: 'any' },
    ],
    observation: ['OBSERVACIONES', 'OBSERVACION'],
  },
};

const COMMON_HEADER_ALIASES = {
  item: ['ITEM'],
  id: ['ID'],
  location: ['UBICACION'],
  date: ['FECHA'],
  technician: ['TECNICO RESPONSABLE'],
  installationDate: ['FECHA DE INSTALACION'],
  general: ['GENERAL||SWINGATE||AMPLIACION'],
  photoBefore: ['FOTO ANTES'],
  photoAfter: ['FOTO DESPUES'],
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

function normalizeSacsId(id) {
  return String(id ?? '').trim().toUpperCase();
}

function findSacsDevicesById(devices, id) {
  const normalizedId = normalizeSacsId(id);
  if (!normalizedId) return [];
  return devices.filter((device) => normalizeSacsId(device.ID) === normalizedId);
}

function findSacsDeviceByIdAndItem(devices, id, item) {
  return findSacsDevicesById(devices, id)
    .find((device) => String(device.ITEM) === String(item)) || null;
}

function buildSacsPhotoFilename(fieldName, id, extension, uniqueSuffix) {
  const photoName = fieldName === 'fotoAntes'
    ? 'antes'
    : fieldName === 'fotoDespues'
      ? 'despues'
      : null;
  if (!photoName) throw new Error(`Campo de foto SACS no reconocido: ${fieldName}`);

  const safeId = normalizeSacsId(id).replace(/[^A-Z0-9]/g, '_') || 'DISPOSITIVO';
  const safeExtension = /^\.[A-Z0-9]{1,10}$/i.test(extension) ? extension.toLowerCase() : '.jpg';
  const suffix = String(uniqueSuffix || '').replace(/[^A-Z0-9_-]/gi, '_');
  return `${photoName}_${safeId}_${suffix}${safeExtension}`;
}

function getSheetConfig(sheetName) {
  const config = SHEET_CONFIG[sheetName];
  if (!config) {
    const error = new Error('Selecciona una pestaña SACS válida.');
    error.statusCode = 400;
    throw error;
  }
  return config;
}

function getHeaderAliasesForSheet(sheetName) {
  const config = getSheetConfig(sheetName);
  const aliases = { ...COMMON_HEADER_ALIASES };
  for (const field of config.checklist) aliases[field.field] = field.header;
  for (const field of config.numeric || []) aliases[field.field] = field.header;
  aliases.observation = config.observation;
  return aliases;
}

function findSacsReportColumns(worksheet, sheetName) {
  const aliases = getHeaderAliasesForSheet(sheetName);
  const maxRowToScan = Math.min(Math.max(worksheet.rowCount, 1), 15);
  const maxColToScan = Math.max(worksheet.columnCount, Object.keys(aliases).length);

  for (let rowNumber = 1; rowNumber <= maxRowToScan; rowNumber += 1) {
    const headerRow = worksheet.getRow(rowNumber);
    const headers = [];
    for (let columnNumber = 1; columnNumber <= maxColToScan; columnNumber += 1) {
      headers.push(normalizeHeader(getCellText(headerRow.getCell(columnNumber))));
    }

    const columns = {};
    for (const [field, fieldAliases] of Object.entries(aliases)) {
      const normalizedAliases = fieldAliases.map(normalizeHeader);
      const foundIndex = headers.findIndex((header) => normalizedAliases.includes(header));
      columns[field] = foundIndex >= 0 ? foundIndex + 1 : -1;
    }
    if (columns.item > 0 && columns.id > 0) return { headerRow: rowNumber, columns };
  }

  const error = new Error(`No se encontraron encabezados válidos en la pestaña ${sheetName}.`);
  error.statusCode = 400;
  throw error;
}

function assertRequiredSacsColumns(columns, sheetName) {
  const config = getSheetConfig(sheetName);
  const requiredFields = [
    'item',
    'id',
    'location',
    'date',
    'technician',
    'installationDate',
    'photoBefore',
    'photoAfter',
    'observation',
    ...(config.general ? ['general'] : []),
    ...config.checklist.map((field) => field.field),
    ...(config.numeric || []).map((field) => field.field),
  ];
  const missing = requiredFields.filter((field) => columns[field] < 1);
  if (missing.length) {
    const aliases = getHeaderAliasesForSheet(sheetName);
    const names = missing.map((field) => aliases[field][0]).join(', ');
    const error = new Error(`La pestaña ${sheetName} no tiene estas columnas requeridas: ${names}.`);
    error.statusCode = 400;
    throw error;
  }
}

function buildSacsChecklistValues(sheetName, selectedItems) {
  const checklist = getSheetConfig(sheetName).checklist;
  if (!Array.isArray(selectedItems) || selectedItems.some((item) => typeof item !== 'string')) {
    const error = new Error('Datos SACS inválidos: la lista de casillas no tiene un formato válido.');
    error.statusCode = 400;
    throw error;
  }

  const selected = new Set(selectedItems);
  const allowed = checklist.map((field) => field.id);
  if (selected.size !== selectedItems.length || selectedItems.some((item) => !allowed.includes(item))) {
    const error = new Error('Datos SACS inválidos: hay casillas que no corresponden a la pestaña seleccionada.');
    error.statusCode = 400;
    throw error;
  }

  return Object.fromEntries(
    checklist.map((field) => [field.field, selected.has(field.id) ? 'SI' : 'NO']),
  );
}

function parseSacsNumericValues(sheetName, rawValues = {}) {
  const fields = getSheetConfig(sheetName).numeric || [];
  const values = {};
  for (const field of fields) {
    const rawValue = rawValues[field.id];
    if (rawValue === undefined || String(rawValue).trim() === '') {
      const error = new Error(`Ingresa un valor para ${field.label}.`);
      error.statusCode = 400;
      throw error;
    }

    const value = Number(rawValue);
    if (!Number.isFinite(value) || value < 0 || (field.integer && !Number.isInteger(value))) {
      const error = new Error(`El valor de ${field.label} no es válido.`);
      error.statusCode = 400;
      throw error;
    }
    values[field.field] = value;
  }
  return values;
}

function findSacsReportRowMismatch(row, columns, expectedValues) {
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

function normalizeSacsWriteError(error, workbookSaved) {
  if (error.code === 'EBUSY' || error.code === 'EPERM') {
    return workbookSaved
      ? {
        statusCode: 500,
        message: 'El informe SACS se escribió, pero quedó bloqueado antes de poder verificarse. Revisa la fila más reciente antes de volver a enviar el registro.',
      }
      : {
        statusCode: 409,
        message: 'El informe SACS está abierto o bloqueado por Excel/OneDrive. No se confirmó el guardado; cierra el archivo y vuelve a intentarlo.',
      };
  }

  return {
    statusCode: error.statusCode || 500,
    message: error.message || 'Error interno al actualizar el Excel SACS.',
  };
}

async function writeSacsReportRow(worksheet, registration) {
  const { sheetName } = registration;
  const config = getSheetConfig(sheetName);
  const { headerRow, columns } = findSacsReportColumns(worksheet, sheetName);
  assertRequiredSacsColumns(columns, sheetName);

  const checklistValues = buildSacsChecklistValues(sheetName, registration.selectedItems);
  const numericValues = parseSacsNumericValues(sheetName, registration.numericValues);
  const id = normalizeSacsId(registration.device?.ID);
  if (!id) {
    const error = new Error('El ID del dispositivo SACS es obligatorio.');
    error.statusCode = 400;
    throw error;
  }
  if (config.general && !['GENERAL', 'SWINGATE', 'AMPLIACION'].includes(registration.general)) {
    const error = new Error('Selecciona GENERAL, SWINGATE o AMPLIACION.');
    error.statusCode = 400;
    throw error;
  }

  let rowNumber = headerRow + 1;
  while (getCellText(worksheet.getRow(rowNumber).getCell(columns.id)).trim() !== '') rowNumber += 1;

  let nextItem = 1;
  for (let currentRow = headerRow + 1; currentRow < rowNumber; currentRow += 1) {
    const numericItem = Number(getCellText(
      worksheet.getRow(currentRow).getCell(columns.item),
    ).trim());
    if (Number.isFinite(numericItem) && numericItem > 0) nextItem = Math.max(nextItem, numericItem + 1);
  }

  const values = {
    item: nextItem,
    id,
    location: registration.device.UBICACION ?? '',
    date: registration.date,
    technician: registration.technician,
    installationDate: registration.installationDate,
    ...(config.general ? { general: registration.general } : {}),
    ...checklistValues,
    ...numericValues,
    observation: registration.observation,
  };
  const targetRow = worksheet.getRow(rowNumber);
  targetRow.height = 24;
  for (const [field, value] of Object.entries(values)) {
    const cell = targetRow.getCell(columns[field]);
    cell.value = value instanceof Date
      ? value
      : typeof value === 'number' ? value : String(value ?? '');
    if (value instanceof Date) cell.numFmt = 'dd/mm/yyyy';
  }

  for (const [field, text] of [
    ['photoBefore', 'Ver Foto Antes'],
    ['photoAfter', 'Ver Foto Después'],
  ]) {
    const url = registration.photoLinks?.[field];
    targetRow.getCell(columns[field]).value = url
      ? { text, hyperlink: url, tooltip: text }
      : '';
  }

  targetRow.commit();
  return { row: rowNumber - 1, item: nextItem, columns, values };
}

module.exports = {
  SHEET_CONFIG,
  assertRequiredSacsColumns,
  buildSacsChecklistValues,
  buildSacsPhotoFilename,
  findSacsDeviceByIdAndItem,
  findSacsDevicesById,
  findSacsReportColumns,
  findSacsReportRowMismatch,
  normalizeSacsWriteError,
  parseSacsNumericValues,
  writeSacsReportRow,
};
