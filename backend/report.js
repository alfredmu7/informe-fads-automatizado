const XLSX = require('xlsx');

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
};

const REQUIRED_REPORT_FIELDS = ['id', 'deviceType', 'location', 'technology', 'photoBefore', 'photoAfter'];

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

function findReportColumns(worksheet) {
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  const lastHeaderRow = Math.min(range.e.r, range.s.r + 10);

  for (let row = range.s.r; row <= lastHeaderRow; row += 1) {
    const headerCells = [];
    for (let column = range.s.c; column <= range.e.c; column += 1) {
      const cell = worksheet[XLSX.utils.encode_cell({ r: row, c: column })];
      headerCells.push(normalizeHeader(cell?.v));
    }

    const columns = {};
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      const normalizedAliases = aliases.map(normalizeHeader);
      columns[field] = headerCells.findIndex((header) => normalizedAliases.includes(header));
      if (columns[field] >= 0) columns[field] += range.s.c;
    }

    if (columns.item >= 0) {
      return { headerRow: row, columns };
    }
  }

  throw new Error('No se encontraron los encabezados ITEM y D/TIVO en la hoja.');
}

function assertRequiredReportColumns(columns) {
  const missing = REQUIRED_REPORT_FIELDS.filter((field) => columns[field] < 0);
  if (missing.length) {
    const names = missing.map((field) => HEADER_ALIASES[field][0]).join(', ');
    throw new Error(`La hoja no tiene estas columnas requeridas: ${names}.`);
  }
}

function writeReportRow(worksheet, registration) {
  const { headerRow, columns } = findReportColumns(worksheet);
  assertRequiredReportColumns(columns);

  let row = headerRow + 1;
  while (worksheet[XLSX.utils.encode_cell({ r: row, c: columns.id })]?.v) {
    row += 1;
  }

  let nextItem = 1;
  for (let currentRow = headerRow + 1; currentRow < row; currentRow += 1) {
    const value = worksheet[XLSX.utils.encode_cell({ r: currentRow, c: columns.item })]?.v;
    const numericItem = Number(value);
    if (Number.isFinite(numericItem)) nextItem = Math.max(nextItem, numericItem + 1);
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
  };

  for (const [field, value] of Object.entries(values)) {
    const column = columns[field];
    if (column < 0) continue;

    const address = XLSX.utils.encode_cell({ r: row, c: column });
    worksheet[address] = {
      t: typeof value === 'number' ? 'n' : 's',
      v: typeof value === 'number' ? value : String(value ?? ''),
    };
  }

  for (const [field, text] of [
    ['photoBefore', 'Ver Foto Antes'],
    ['photoAfter', 'Ver Foto Después'],
  ]) {
    const target = registration.photoLinks[field];
    if (!target) continue;

    const address = XLSX.utils.encode_cell({ r: row, c: columns[field] });
    worksheet[address] = {
      t: 's',
      v: text,
      l: { Target: target, Tooltip: text },
    };
  }

  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  range.e.r = Math.max(range.e.r, row);
  range.e.c = Math.max(range.e.c, columns.photoAfter);
  worksheet['!ref'] = XLSX.utils.encode_range(range);

  return { row, item: nextItem, columns };
}

module.exports = {
  assertRequiredReportColumns,
  buildPhotoFilename,
  findDeviceById,
  findReportColumns,
  normalizeDeviceId,
  writeReportRow,
};
