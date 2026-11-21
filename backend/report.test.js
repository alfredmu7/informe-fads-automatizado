const assert = require('node:assert/strict');
const ExcelJS = require('exceljs');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {
  buildInspectionValues,
  buildPhotoFilename,
  findReportRowMismatch,
  findDeviceById,
  resolveDeviceForRegistration,
  writeReportRow,
} = require('./report');
const createReportWriteQueue = require('./report-write-queue');

const HEADERS = [
  'ITEM',
  'ID',
  'D/TIVO',
  'UBICACION',
  'TECNOLOGIA',
  'FECHA',
  'TECNICO RESPONSABLE',
  'ESTADO FINAL',
  'OBSERVACION',
  'FOTO ANTES',
  'FOTO DESPUES',
  'TIPO SELECCIONADO',
  'OTRO TIPO',
  'ARO PROTECTOR',
  'MARQUILLA',
  'CUPULA BUEN ESTADO',
  'CUPULA MAL ESTADO',
  'TAPA BUEN ESTADO',
  'CARCASA BUEN ESTADO',
  'EQUIPO BUEN ESTADO',
];

function createReportSheet() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('DISPOSITIVOS');
  worksheet.addRow(['INFORME']);
  worksheet.addRow(HEADERS);
  return { workbook, worksheet };
}

function createRegistration(overrides = {}) {
  return {
    device: {
      ID: 'P2L01D001',
      DISPOSITIVO: 'SH',
      PANEL: 'PANEL 1',
      UBICACION: 'BANO HOMBRES',
      TIPO: 'PHOTO',
    },
    date: '2026-11-18',
    technician: 'TECNICO',
    state: 'BUENO',
    observation: 'Revisado',
    inspection: {
      type: 'SH',
      otherType: '',
      selectedItems: ['aro-protector', 'marquilla'],
    },
    photoLinks: {},
    ...overrides,
  };
}

test('serializes report writes and continues after a failed write', async () => {
  const serializeReportWrite = createReportWriteQueue();
  const events = [];
  let activeWrites = 0;
  let maximumActiveWrites = 0;

  const write = (name) => serializeReportWrite(async () => {
    activeWrites += 1;
    maximumActiveWrites = Math.max(maximumActiveWrites, activeWrites);
    events.push(`${name}:start`);
    await new Promise((resolve) => setTimeout(resolve, 10));
    events.push(`${name}:end`);
    activeWrites -= 1;
  });

  await Promise.all([write('first'), write('second')]);
  assert.equal(maximumActiveWrites, 1);
  assert.deepEqual(events, ['first:start', 'first:end', 'second:start', 'second:end']);

  await assert.rejects(
    serializeReportWrite(async () => {
      throw new Error('test write failure');
    }),
    /test write failure/,
  );
  await serializeReportWrite(async () => events.push('after-failure'));
  assert.equal(events[events.length - 1], 'after-failure');
});

test('finds a database record using the same normalized device ID as the interface', () => {
  const device = { ID: 'P2L01D001', UBICACION: 'BANO HOMBRES' };

  assert.equal(findDeviceById([device], 'p2l01d0001'), device);
  assert.equal(findDeviceById([device], 'unknown'), null);
});

test('resolves unknown IDs from manually entered device details', () => {
  const manualDevice = resolveDeviceForRegistration([], ' manual-001 ', {
    dTivo: 'MANUAL STATION',
    ubicacion: 'SUB ESTACION',
    tecnologia: 'PHOTO',
  });

  assert.deepEqual(manualDevice, {
    ID: 'MANUAL-001',
    DISPOSITIVO: 'MANUAL STATION',
    PANEL: '',
    UBICACION: 'SUB ESTACION',
    TIPO: 'PHOTO',
  });

  assert.throws(
    () => resolveDeviceForRegistration([], 'MANUAL-002', { dTivo: 'SH' }),
    (error) => error.statusCode === 400 && /ubicación, tecnología/.test(error.message),
  );
});

test('resolves P7L05D014 to the database location', () => {
  const devices = JSON.parse(fs.readFileSync(
    path.join(__dirname, 'public', 'SQL_fads_oficial_backend.json'),
    'utf8',
  ));
  const device = findDeviceById(devices, 'P7L05D014');

  assert.equal(device.UBICACION, 'LOCAL SANTA HELENA');
});

test('names photos with their before/after label and device ID without overwriting existing names', () => {
  assert.equal(buildPhotoFilename('fotoAntes', 'P7L05D014', '.JPG'), 'antes_P7L05D014.jpg');
  assert.equal(buildPhotoFilename('fotoDespues', 'P7L05D014', '.jpg', '123-456'), 'despues_P7L05D014_123-456.jpg');
});

test('maps each device type checklist to its Excel columns', () => {
  assert.deepEqual(buildInspectionValues({
    type: 'EM',
    otherType: '',
    selectedItems: ['cupula-mal-estado', 'marquilla'],
  }), {
    selectedType: 'EM',
    otherType: '',
    aroProtector: '',
    marquilla: 'SI',
    cupulaGoodState: 'NO',
    cupulaBadState: 'SI',
    tapaGoodState: '',
    carcasaGoodState: '',
    equipoGoodState: '',
  });

  assert.equal(buildInspectionValues({
    type: 'Otro',
    otherType: 'Sensor especial',
    selectedItems: [],
  }).otherType, 'Sensor especial');

  const amplifierValues = buildInspectionValues({
    type: 'Amplificador',
    otherType: '',
    selectedItems: ['equipo-buen-estado'],
  });
  assert.equal(amplifierValues.selectedType, 'AMPLIFICADOR');
  assert.equal(amplifierValues.equipoGoodState, 'SI');
  assert.equal(amplifierValues.marquilla, 'NO');
});

test('rejects checklist selections that do not belong to the selected device type', () => {
  assert.throws(
    () => buildInspectionValues({
      type: 'SH',
      otherType: '',
      selectedItems: ['cupula-buen-estado'],
    }),
    /casillas que no corresponden/,
  );
});

test('writes existing report data and selected checklist values under their matching headers', async () => {
  const { worksheet } = createReportSheet();
  const result = await writeReportRow(worksheet, createRegistration({
    inspection: {
      type: 'EM',
      otherType: '',
      selectedItems: ['cupula-mal-estado', 'marquilla'],
    },
    photoLinks: {
      photoBefore: 'fotos_fads/antes_P2L01D001.jpg',
      photoAfter: 'fotos_fads/despues_P2L01D001.jpg',
    },
  }));
  const row = worksheet.getRow(3);

  assert.equal(result.row, 2);
  assert.equal(row.getCell(1).value, 1);
  assert.equal(row.getCell(2).value, 'P2L01D001');
  assert.equal(row.getCell(3).value, 'SH');
  assert.equal(row.getCell(4).value, 'BANO HOMBRES');
  assert.equal(row.getCell(8).value, 'BUENO');
  assert.equal(row.getCell(9).value, 'Revisado');
  assert.equal(row.getCell(10).value.hyperlink, 'fotos_fads/antes_P2L01D001.jpg');
  assert.equal(row.getCell(11).value.hyperlink, 'fotos_fads/despues_P2L01D001.jpg');
  assert.equal(row.getCell(12).value, 'EM');
  assert.equal(row.getCell(14).value, '');
  assert.equal(row.getCell(15).value, 'SI');
  assert.equal(row.getCell(16).value, 'NO');
  assert.equal(row.getCell(17).value, 'SI');
  assert.equal(row.getCell(20).value, '');
});

test('rejects duplicate device IDs already present in the report', async () => {
  const { worksheet } = createReportSheet();
  await writeReportRow(worksheet, createRegistration());

  await assert.rejects(
    () => writeReportRow(worksheet, createRegistration({
      device: { ...createRegistration().device, ID: 'p2l01d0001' },
    })),
    (error) => error.statusCode === 409 && /ya está registrado en la fila 3/.test(error.message),
  );
  assert.equal(worksheet.getRow(4).getCell(2).value, null);
});

test('writes manually supplied metadata for a device not found in the database', async () => {
  const { worksheet } = createReportSheet();
  const device = resolveDeviceForRegistration([], 'MANUAL-001', {
    dTivo: 'MANUAL STATION',
    ubicacion: 'SUB ESTACION',
    tecnologia: 'PHOTO',
  });

  await writeReportRow(worksheet, createRegistration({ device }));

  assert.equal(worksheet.getRow(3).getCell(2).value, 'MANUAL-001');
  assert.equal(worksheet.getRow(3).getCell(3).value, 'MANUAL STATION');
  assert.equal(worksheet.getRow(3).getCell(4).value, 'SUB ESTACION');
  assert.equal(worksheet.getRow(3).getCell(5).value, 'PHOTO');
});

test('appends multiple device rows across separate workbook saves', async () => {
  const filePath = path.join(os.tmpdir(), `fads-rows-${process.pid}-${Date.now()}.xlsx`);
  const { workbook, worksheet } = createReportSheet();

  try {
    assert.equal((await writeReportRow(worksheet, createRegistration())).row, 2);
    await workbook.xlsx.writeFile(filePath);

    const savedWorkbook = new ExcelJS.Workbook();
    await savedWorkbook.xlsx.readFile(filePath);
    const savedWorksheet = savedWorkbook.getWorksheet('DISPOSITIVOS');
    assert.equal((await writeReportRow(savedWorksheet, createRegistration({
      device: { ...createRegistration().device, ID: 'P2L01D002' },
      inspection: { type: 'DT', otherType: '', selectedItems: ['aro-protector'] },
    }))).row, 3);
    await savedWorkbook.xlsx.writeFile(filePath);

    const finalWorkbook = new ExcelJS.Workbook();
    await finalWorkbook.xlsx.readFile(filePath);
    const finalWorksheet = finalWorkbook.getWorksheet('DISPOSITIVOS');
    assert.equal(finalWorksheet.getRow(3).getCell(2).value, 'P2L01D001');
    assert.equal(finalWorksheet.getRow(4).getCell(2).value, 'P2L01D002');
    assert.equal(finalWorksheet.getRow(4).getCell(15).value, 'NO');
  } finally {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
});

test('requires the complete report and inspection header set', async () => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('DISPOSITIVOS');
  worksheet.addRow(['INFORME']);
  worksheet.addRow([
    'ITEM',
    'ID',
    'D/TIVO',
    'UBICACION',
    'TECNOLOGIA',
    'FECHA',
    'TECNICO RESPONSABLE',
    'ESTADO FINAL',
    'OBSERVACION',
    'FOTO ANTES',
    'FOTO DESPUES',
  ]);

  await assert.rejects(
    () => writeReportRow(worksheet, createRegistration()),
    /TIPO SELECCIONADO, OTRO TIPO, ARO PROTECTOR, MARQUILLA/,
  );
});

test('skips missing optional columns while verifying saved fields', () => {
  const row = {
    getCell(column) {
      assert.equal(column, 2);
      return { value: 'P2L01D001' };
    },
  };

  assert.equal(findReportRowMismatch(row, { id: 2, panel: -1 }, {
    id: 'P2L01D001',
    panel: 'PANEL 1',
  }), undefined);
  assert.deepEqual(findReportRowMismatch(row, { id: 2, panel: -1 }, {
    id: 'P2L01D002',
    panel: 'PANEL 1',
  }), ['id', 'P2L01D002']);
});

test('preserves public photo URLs when the workbook is saved', async () => {
  const filePath = path.join(os.tmpdir(), `fads-report-${process.pid}-${Date.now()}.xlsx`);
  const { workbook, worksheet } = createReportSheet();

  try {
    await writeReportRow(worksheet, createRegistration({
      photoLinks: {
        photoBefore: 'https://backend.example/fotos/antes_P2L01D001.jpg',
        photoAfter: 'https://backend.example/fotos/despues_P2L01D001.jpg',
      },
    }));
    await workbook.xlsx.writeFile(filePath);

    const savedWorkbook = new ExcelJS.Workbook();
    await savedWorkbook.xlsx.readFile(filePath);
    const savedWorksheet = savedWorkbook.getWorksheet('DISPOSITIVOS');
    assert.equal(savedWorksheet.getRow(3).getCell(10).value.hyperlink, 'https://backend.example/fotos/antes_P2L01D001.jpg');
    assert.equal(savedWorksheet.getRow(3).getCell(11).value.hyperlink, 'https://backend.example/fotos/despues_P2L01D001.jpg');
  } finally {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
});
