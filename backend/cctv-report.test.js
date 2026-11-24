const assert = require('node:assert/strict');
const ExcelJS = require('exceljs');
const test = require('node:test');
const {
  buildCctvChecklistValues,
  buildCctvPhotoFilename,
  findCctvCameraById,
  findCctvReportColumns,
  normalizeCctvWriteError,
  writeCctvReportRow,
} = require('./cctv-report');

const HEADERS = [
  'ITEM',
  'ID',
  'FASE I,II o AMPL.',
  'UBICACION',
  'FECHA',
  'TECNICO RESPONSABLE',
  'ESTADO INICIAL',
  'INSP. VISUAL',
  'MONTAJE MASTIL SOPORTE',
  'CONEXIONES CAMARA',
  'LIMPIEZA LENTE',
  'HOUSING LIMPIEZA AJUSTE',
  'ESTADO FINAL',
  'DOBLE ALTURA',
  'OBSERVACIONES',
  'FOCO',
  'IRIS',
  'NITIDEZ',
  'MOVIMIENTO',
  'MARQUILLA',
  'FOTO ANTES',
  'FOTO DESPUES',
  'FECHA DE INSTALACION',
];

const DEFAULT_CHECKLIST = [
  'inspection-visual',
  'mount-support',
  'camera-connections',
  'lens-cleaning',
  'housing-cleaning',
  'focus',
  'iris',
  'sharpness',
  'marquilla',
];

function createCctvWorksheet() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Registro cctv');
  worksheet.addRow(['', '', '', '', '', 'REPORTE CCTV']);
  worksheet.addRow(HEADERS);
  return { workbook, worksheet };
}

function createRegistration(overrides = {}) {
  return {
    camera: {
      ID: '2-40-1',
      FASE: 'FASE 1',
      UBICACION: 'POS 47',
    },
    date: '2026-11-21',
    technician: 'TECNICO CCTV',
    initialState: 'Defectuoso',
    finalState: 'Operativo',
    observation: 'Limpieza y ajuste realizados.',
    selectedItems: DEFAULT_CHECKLIST,
    photoLinks: {},
    ...overrides,
  };
}

test('finds camera IDs case-insensitively without changing punctuation', () => {
  const camera = { ID: '2-40-1' };
  assert.equal(findCctvCameraById([camera], ' 2-40-1 '), camera);
  assert.equal(findCctvCameraById([camera], '2401'), null);
});

test('builds the selected and unselected CCTV checklist values', () => {
  assert.deepEqual(buildCctvChecklistValues(DEFAULT_CHECKLIST), {
    inspectionVisual: 'SI',
    mountSupport: 'SI',
    cameraConnections: 'SI',
    lensCleaning: 'SI',
    housingCleaning: 'SI',
    doubleHeight: 'NO',
    focus: 'SI',
    iris: 'SI',
    sharpness: 'SI',
    movement: 'NO',
    marquilla: 'SI',
  });

  assert.throws(
    () => buildCctvChecklistValues(['not-a-cctv-item']),
    /casillas no reconocidas/,
  );
});

test('maps camera database fields and inspection values to the CCTV sheet headers', async () => {
  const { worksheet } = createCctvWorksheet();
  const result = await writeCctvReportRow(worksheet, createRegistration({
    photoLinks: {
      photoBefore: 'https://backend.example/api/cctv/fotos/antes_2_40_1_1.jpg',
      photoAfter: 'https://backend.example/api/cctv/fotos/despues_2_40_1_2.jpg',
    },
  }));
  const row = worksheet.getRow(3);

  assert.equal(result.row, 2);
  assert.equal(row.getCell(1).value, 1);
  assert.equal(row.getCell(2).value, '2-40-1');
  assert.equal(row.getCell(3).value, 'FASE 1');
  assert.equal(row.getCell(4).value, 'POS 47');
  assert.equal(row.getCell(7).value, 'Defectuoso');
  assert.equal(row.getCell(8).value, 'SI');
  assert.equal(row.getCell(9).value, 'SI');
  assert.equal(row.getCell(13).value, 'Operativo');
  assert.equal(row.getCell(14).value, 'NO');
  assert.equal(row.getCell(15).value, 'Limpieza y ajuste realizados.');
  assert.equal(row.getCell(19).value, 'NO');
  assert.equal(row.getCell(20).value, 'SI');
  assert.equal(row.getCell(21).value.hyperlink, 'https://backend.example/api/cctv/fotos/antes_2_40_1_1.jpg');
});

test('writes a new installation date as an Excel date', async () => {
  const { worksheet } = createCctvWorksheet();
  await writeCctvReportRow(worksheet, createRegistration({
    installationDate: new Date('2026-11-21T00:00:00.000Z'),
  }));
  const cell = worksheet.getRow(3).getCell(23);

  assert.equal(cell.value.toISOString(), '2026-11-21T00:00:00.000Z');
  assert.equal(cell.numFmt, 'dd/mm/yyyy');
});

test('allows repeated maintenance inspections for the same CCTV camera', async () => {
  const { worksheet } = createCctvWorksheet();
  await writeCctvReportRow(worksheet, createRegistration());
  const second = await writeCctvReportRow(worksheet, createRegistration({
    date: '2026-12-21',
    observation: 'Segunda inspección.',
  }));

  assert.equal(second.item, 2);
  assert.equal(second.row, 3);
  assert.equal(worksheet.getRow(4).getCell(2).value, '2-40-1');
});

test('detects the workbook header row and makes missing CCTV fields explicit', async () => {
  const { worksheet } = createCctvWorksheet();
  const { headerRow, columns } = findCctvReportColumns(worksheet);
  assert.equal(headerRow, 2);
  assert.equal(columns.mountSupport, 9);

  const incompleteWorkbook = new ExcelJS.Workbook();
  const incompleteWorksheet = incompleteWorkbook.addWorksheet('Registro cctv');
  incompleteWorksheet.addRow(['ITEM', 'ID']);
  await assert.rejects(
    () => writeCctvReportRow(incompleteWorksheet, createRegistration()),
    /no tiene estas columnas requeridas/,
  );
});

test('creates unique, safe before/after CCTV photo names', () => {
  assert.equal(
    buildCctvPhotoFilename('fotoAntes', '2-40-1', '.JPG', '123-456'),
    'antes_2_40_1_123-456.jpg',
  );
  assert.equal(
    buildCctvPhotoFilename('fotoDespues', '2-40-1', '.png', '987'),
    'despues_2_40_1_987.png',
  );
  assert.throws(
    () => buildCctvPhotoFilename('fotoOtro', '2-40-1', '.jpg', '987'),
    /Campo de foto CCTV no reconocido/,
  );
});

test('reports an Excel lock as a retryable conflict only when the workbook was not saved', () => {
  assert.deepEqual(normalizeCctvWriteError({ code: 'EBUSY' }, false), {
    statusCode: 409,
    message: 'El informe CCTV está abierto o bloqueado por Excel/OneDrive. No se confirmó el guardado; cierra el archivo y vuelve a intentarlo.',
  });
  assert.deepEqual(normalizeCctvWriteError({ code: 'EBUSY' }, true), {
    statusCode: 500,
    message: 'El informe CCTV se escribió, pero quedó bloqueado antes de poder verificarse. Revisa la fila más reciente antes de volver a enviar el registro.',
  });
});
