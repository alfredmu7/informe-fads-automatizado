const HEADER_ALIASES = {
  item: ['ITEM'],
  id: ['ID'],
  deviceType: ['D/TIVO'],
  panel: ['POSICION/PANEL', 'POSICION', 'PANEL'],
  location: ['UBICACION'],
  technology: ['TECNOLOGIA'],
  date: ['FECHA'],
  technician: ['TECNICO RESPONSABLE'],
  state: ['ESTADO FINAL'],
  observation: ['OBSERVACION', 'OBSERVACIONES'],
  photoBefore: ['FOTO ANTES'],
  photoAfter: ['FOTO DESPUES'],
  selectedType: ['TIPO SELECCIONADO'],
  otherType: ['OTRO TIPO'],
  aroProtector: ['ARO PROTECTOR'],
  marquilla: ['MARQUILLA'],
  cupulaGoodState: ['CUPULA BUEN ESTADO'],
  cupulaBadState: ['CUPULA MAL ESTADO'],
  tapaGoodState: ['TAPA BUEN ESTADO'],
  carcasaGoodState: ['CARCASA BUEN ESTADO'],
  equipoGoodState: ['EQUIPO BUEN ESTADO'],
};

const REQUIRED_REPORT_FIELDS = [
  'id',
  'deviceType',
  'location',
  'technology',
  'photoBefore',
  'photoAfter',
  'selectedType',
  'otherType',
  'aroProtector',
  'marquilla',
  'cupulaGoodState',
  'cupulaBadState',
  'tapaGoodState',
  'carcasaGoodState',
  'equipoGoodState',
];

const CHECKLIST_ITEMS_BY_TYPE = {
  SH: ['aro-protector', 'marquilla'],
  DT: ['aro-protector', 'marquilla'],
  STB: ['equipo-buen-estado', 'marquilla'],
  EM: ['cupula-buen-estado', 'cupula-mal-estado', 'marquilla'],
  MM: ['tapa-buen-estado', 'marquilla'],
  BD: ['carcasa-buen-estado', 'marquilla'],
  FTE: ['equipo-buen-estado', 'marquilla'],
  PANEL: ['equipo-buen-estado', 'marquilla'],
  AMPLIFICADOR: ['equipo-buen-estado', 'marquilla'],
  OTRO: [],
};

const CHECKLIST_COLUMN_BY_ITEM = {
  'aro-protector': 'aroProtector',
  marquilla: 'marquilla',
  'cupula-buen-estado': 'cupulaGoodState',
  'cupula-mal-estado': 'cupulaBadState',
  'tapa-buen-estado': 'tapaGoodState',
  'carcasa-buen-estado': 'carcasaGoodState',
  'equipo-buen-estado': 'equipoGoodState',
};

const COLUMN_MIN_WIDTHS = {
  item: 10,
  id: 18,
  deviceType: 15,
  panel: 18,
  location: 38,
  technology: 18,
  date: 15,
  technician: 28,
  state: 18,
  observation: 35,
  photoBefore: 20,
  photoAfter: 20,
  selectedType: 20,
  otherType: 24,
  aroProtector: 18,
  marquilla: 16,
  cupulaGoodState: 22,
  cupulaBadState: 22,
  tapaGoodState: 20,
  carcasaGoodState: 22,
  equipoGoodState: 22,
};

function normalizeDeviceId(id) {
  return String(id ?? '')
    .trim()
    .toUpperCase()
    .replace(/\d+/g, (digits) => digits.replace(/^0+(?=\d)/, ''));
}

function findDeviceById(devices, id) {
  const normalizedId = normalizeDeviceId(id);
  if (!normalizedId) return null;

  return devices.find((device) => normalizeDeviceId(device.ID) === normalizedId) || null;
}

function resolveDeviceForRegistration(devices, id, manualData = {}) {
  const knownDevice = findDeviceById(devices, id);
  if (knownDevice) return knownDevice;

  const deviceId = String(id ?? '').trim().toUpperCase();
  const device = {
    ID: deviceId,
    DISPOSITIVO: String(manualData.dTivo ?? '').trim().toUpperCase(),
    PANEL: '',
    UBICACION: String(manualData.ubicacion ?? '').trim().toUpperCase(),
    TIPO: String(manualData.tecnologia ?? '').trim().toUpperCase(),
  };
  const missingFields = [
    ['D/TIVO', device.DISPOSITIVO],
    ['ubicación', device.UBICACION],
    ['tecnología', device.TIPO],
  ].filter(([, value]) => !value);

  if (!deviceId || missingFields.length) {
    const requiredFields = missingFields.map(([label]) => label).join(', ');
    const detail = deviceId
      ? `Completa manualmente: ${requiredFields}.`
      : 'Ingresa un ID de dispositivo.';
    const error = new Error(`El dispositivo no aparece en la base de datos. ${detail}`);
    error.statusCode = 400;
    throw error;
  }

  return device;
}

function buildPhotoFilename(fieldName, id, extension, uniqueSuffix = '') {
  const photoName = fieldName === 'fotoAntes'
    ? 'antes'
    : fieldName === 'fotoDespues'
      ? 'despues'
      : null;
  if (!photoName) throw new Error(`Campo de foto no reconocido: ${fieldName}`);

  const safeId = String(id ?? 'DISPOSITIVO')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '_') || 'DISPOSITIVO';
  const safeExtension = /^\.[A-Z0-9]{1,10}$/i.test(extension) ? extension.toLowerCase() : '.jpg';
  const suffix = uniqueSuffix ? `_${uniqueSuffix}` : '';

  return `${photoName}_${safeId}${suffix}${safeExtension}`;
}

function normalizeHeader(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/gi, '')
    .toUpperCase();
}

function getCellText(cell) {
  const val = cell?.value;
  if (val == null) return '';
  if (typeof val === 'object') {
    if (val.text) return String(val.text);
    if (Array.isArray(val.richText)) return val.richText.map((t) => t.text).join('');
    if (val.result !== undefined) return String(val.result);
  }
  return String(val);
}

// ExcelJS usa índices base 1 para filas y columnas
function findReportColumns(worksheet) {
  const maxRowToScan = Math.min(Math.max(worksheet.rowCount, 1), 15);
  const maxColToScan = Math.max(worksheet.columnCount, 20);

  for (let row = 1; row <= maxRowToScan; row += 1) {
    const currentRow = worksheet.getRow(row);
    const headerCells = [];

    for (let col = 1; col <= maxColToScan; col += 1) {
      headerCells.push(normalizeHeader(getCellText(currentRow.getCell(col))));
    }

    const columns = {};
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      const normalizedAliases = aliases.map(normalizeHeader);
      const foundIndex = headerCells.findIndex((header) => normalizedAliases.includes(header));
      columns[field] = foundIndex >= 0 ? foundIndex + 1 : -1;
    }

    if (columns.item >= 1) {
      return { headerRow: row, columns };
    }
  }

  throw new Error('No se encontraron los encabezados ITEM y D/TIVO en la hoja.');
}

function assertRequiredReportColumns(columns) {
  const missing = REQUIRED_REPORT_FIELDS.filter((field) => columns[field] < 1);
  if (missing.length) {
    const names = missing.map((field) => HEADER_ALIASES[field][0]).join(', ');
    throw new Error(`La hoja no tiene estas columnas requeridas: ${names}.`);
  }
}

function findReportRowMismatch(row, columns, expectedValues) {
  return Object.entries(expectedValues).find(([field, expected]) => {
    const column = columns[field];
    if (!Number.isInteger(column) || column < 1) return false;

    const actualValue = row?.getCell(column).value;
    const actual = field === 'photoBefore' || field === 'photoAfter'
      ? actualValue?.hyperlink ?? ''
      : actualValue;
    return String(actual ?? '') !== String(expected ?? '');
  });
}

function buildInspectionValues(inspection) {
  const type = String(inspection?.type ?? '').trim().toUpperCase();
  const allowedItems = CHECKLIST_ITEMS_BY_TYPE[type];
  if (!allowedItems) {
    throw new Error('Datos de inspección inválidos: selecciona un tipo de dispositivo válido.');
  }

  const otherType = String(inspection?.otherType ?? '').trim();
  if (type === 'OTRO' && !otherType) {
    throw new Error('Datos de inspección inválidos: especifica el tipo de dispositivo seleccionado como Otro.');
  }

  const selectedItems = inspection?.selectedItems;
  if (!Array.isArray(selectedItems) || selectedItems.some((item) => typeof item !== 'string')) {
    throw new Error('Datos de inspección inválidos: la lista de casillas no tiene un formato válido.');
  }

  const selected = new Set(selectedItems);
  if (
    selected.size !== selectedItems.length
    || selectedItems.some((item) => !allowedItems.includes(item))
  ) {
    throw new Error('Datos de inspección inválidos: hay casillas que no corresponden al tipo de dispositivo.');
  }

  const checklistValues = {};
  for (const [item, column] of Object.entries(CHECKLIST_COLUMN_BY_ITEM)) {
    checklistValues[column] = allowedItems.includes(item)
      ? selected.has(item) ? 'SI' : 'NO'
      : '';
  }

  return {
    selectedType: type,
    otherType: type === 'OTRO' ? otherType : '',
    ...checklistValues,
  };
}

function styleHeaderAndColumns(worksheet, headerRowNumber, columns) {
  const headerRow = worksheet.getRow(headerRowNumber);
  if (!headerRow.height || headerRow.height < 26) {
    headerRow.height = 28;
  }

  for (const [field, colNumber] of Object.entries(columns)) {
    if (colNumber < 1) continue;

    // Asegurar ancho mínimo para que el texto no se desborde
    const column = worksheet.getColumn(colNumber);
    const minWidth = COLUMN_MIN_WIDTHS[field] || 18;
    if (!column.width || column.width < minWidth) {
      column.width = minWidth;
    }

    // Dar estilo al encabezado (conserva relleno si ya tiene uno puesto en Excel)
    const headerCell = headerRow.getCell(colNumber);
    if (!headerCell.fill || headerCell.fill.type === 'none') {
      headerCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E3A8A' },
      };
      headerCell.font = {
        ...(headerCell.font || {}),
        bold: true,
        color: { argb: 'FFFFFFFF' },
      };
    }

    headerCell.alignment = {
      ...(headerCell.alignment || {}),
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true,
    };
  }
}

function styleDataCell(cell, isLink = false) {
  cell.alignment = {
    horizontal: 'right',
    vertical: 'middle',
    wrapText: true,
  };

  cell.border = cell.border || {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  };

  if (isLink) {
    cell.font = {
      ...(cell.font || {}),
      color: { argb: 'FF2563EB' },
      underline: true,
    };
  }
}

async function writeReportRow(worksheet, registration) {
  const inspectionValues = buildInspectionValues(registration.inspection);
  const { headerRow, columns } = findReportColumns(worksheet);
  assertRequiredReportColumns(columns);
  styleHeaderAndColumns(worksheet, headerRow, columns);

  const normalizedDeviceId = normalizeDeviceId(registration.device.ID);
  for (let currentRow = headerRow + 1; currentRow <= worksheet.rowCount; currentRow += 1) {
    const existingId = getCellText(worksheet.getRow(currentRow).getCell(columns.id)).trim();
    if (existingId && normalizeDeviceId(existingId) === normalizedDeviceId) {
      const error = new Error(
        `El ID ${registration.device.ID} ya está registrado en la fila ${currentRow}.`,
      );
      error.statusCode = 409;
      throw error;
    }
  }

  let rowNumber = headerRow + 1;
  while (getCellText(worksheet.getRow(rowNumber).getCell(columns.id)).trim() !== '') {
    rowNumber += 1;
  }

  let nextItem = 1;
  for (let currentRow = headerRow + 1; currentRow < rowNumber; currentRow += 1) {
    const rawValue = getCellText(worksheet.getRow(currentRow).getCell(columns.item)).trim();
    const numericItem = Number(rawValue);
    if (Number.isFinite(numericItem) && numericItem > 0) {
      nextItem = Math.max(nextItem, numericItem + 1);
    }
  }

  const values = {
    item: nextItem,
    id: registration.device.ID,
    deviceType: registration.device.DISPOSITIVO ?? '',
    panel: registration.device.PANEL ?? '',
    location: registration.device.UBICACION ?? '',
    technology: registration.device.TIPO ?? '',
    date: registration.date,
    technician: registration.technician,
    state: registration.state,
    observation: registration.observation,
    ...inspectionValues,
  };

  const targetRow = worksheet.getRow(rowNumber);
  targetRow.height = 24;

  for (const [field, value] of Object.entries(values)) {
    const colNumber = columns[field];
    if (colNumber < 1) continue;

    const cell = targetRow.getCell(colNumber);
    cell.value = typeof value === 'number' ? value : String(value ?? '');
    styleDataCell(cell, false);
  }

  for (const [field, text] of [
    ['photoBefore', 'Ver Foto Antes'],
    ['photoAfter', 'Ver Foto Después'],
  ]) {
    const target = registration.photoLinks[field];
    const colNumber = columns[field];
    if (!target || colNumber < 1) continue;

    const cell = targetRow.getCell(colNumber);
    cell.value = {
      text,
      hyperlink: target,
      tooltip: text,
    };
    styleDataCell(cell, true);
  }

  targetRow.commit();

  // Devuelve índice base 0 en `row` para mantener compatibilidad con `result.row + 1` en index_2.js
  return { row: rowNumber - 1, item: nextItem, columns, inspectionValues };
}

module.exports = {
  assertRequiredReportColumns,
  buildPhotoFilename,
  buildInspectionValues,
  findReportRowMismatch,
  findDeviceById,
  findReportColumns,
  normalizeDeviceId,
  resolveDeviceForRegistration,
  writeReportRow,
};