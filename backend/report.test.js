const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const XLSX = require('xlsx');
const { buildPhotoFilename, findDeviceById, writeReportRow } = require('./report');

test('finds a database record using the same normalized device ID as the interface', () => {
  const device = { ID: 'P2L01D001', UBICACION: 'BANO HOMBRES' };

  assert.equal(findDeviceById([device], 'p2l01d0001'), device);
  assert.equal(findDeviceById([device], 'unknown'), null);
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

test('writes database values and separate photo links under their matching headers', () => {
  const worksheet = XLSX.utils.aoa_to_sheet([
    ['INFORME'],
    ['ITEM', 'ID', 'D/TIVO', 'UBICACION', 'TECNOLOGIA', 'FECHA', 'TECNICO RESPONSABLE', 'ESTADO FINAL', 'OBSERVACION', 'FOTO ANTES', 'FOTO DESPUES'],
  ]);
  const result = writeReportRow(worksheet, {
    device: { ID: 'P2L01D001', DISPOSITIVO: 'SH', UBICACION: 'BANO HOMBRES', TIPO: 'PHOTO' },
    date: '2026-11-18',
    technician: 'TECNICO',
    state: 'BUENO',
    observation: 'Revisado',
    photoLinks: {
      photoBefore: 'fotos_fads/P2L01D001_fotoAntes.jpg',
      photoAfter: 'fotos_fads/P2L01D001_fotoDespues.jpg',
    },
  });

  assert.equal(result.row, 2);
  assert.equal(worksheet.A3.v, 1);
  assert.equal(worksheet.B3.v, 'P2L01D001');
  assert.equal(worksheet.C3.v, 'SH');
  assert.equal(worksheet.D3.v, 'BANO HOMBRES');
  assert.equal(worksheet.E3.v, 'PHOTO');
  assert.equal(worksheet.I3.v, 'Revisado');
  assert.equal(worksheet.I3.l, undefined);
  assert.equal(worksheet.J3.v, 'Ver Foto Antes');
  assert.equal(worksheet.J3.l.Target, 'fotos_fads/P2L01D001_fotoAntes.jpg');
  assert.equal(worksheet.K3.l.Target, 'fotos_fads/P2L01D001_fotoDespues.jpg');
});

test('appends multiple device rows across separate workbook saves', () => {
  const filePath = path.join(os.tmpdir(), `fads-rows-${process.pid}-${Date.now()}.xlsx`);
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([
    ['INFORME'],
    ['ITEM', 'ID', 'D/TIVO', 'UBICACION', 'TECNOLOGIA', 'FECHA', 'TECNICO RESPONSABLE', 'ESTADO FINAL', 'OBSERVACION', 'FOTO ANTES', 'FOTO DESPUES'],
  ]);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'DISPOSITIVOS');
  const register = (sheet, id) => writeReportRow(sheet, {
      device: { ID: id, DISPOSITIVO: 'SH', UBICACION: 'LOCAL', TIPO: 'PHOTO' },
      date: '2026-11-18',
      technician: 'TECNICO',
      state: 'BUENO',
      observation: '',
      photoLinks: {},
    });

  try {
    assert.equal(register(worksheet, 'P2L01D001').row, 2);
    XLSX.writeFile(workbook, filePath);

    const savedWorkbook = XLSX.readFile(filePath);
    const savedWorksheet = savedWorkbook.Sheets.DISPOSITIVOS;
    assert.equal(register(savedWorksheet, 'P2L01D002').row, 3);
    XLSX.writeFile(savedWorkbook, filePath);

    const finalWorksheet = XLSX.readFile(filePath).Sheets.DISPOSITIVOS;
    assert.equal(finalWorksheet.B3.v, 'P2L01D001');
    assert.equal(finalWorksheet.B4.v, 'P2L01D002');
  } finally {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
});

test('rejects a worksheet that cannot hold the required report data', () => {
  const worksheet = XLSX.utils.aoa_to_sheet([
    ['INFORME'],
    ['ITEM', 'D/TIVO', 'POSICION', 'FECHA', 'TECNICO RESPONSABLE'],
  ]);

  assert.throws(
    () => writeReportRow(worksheet, { device: { ID: 'P2L01D001' }, photoLinks: {} }),
    /ID, UBICACION, TECNOLOGIA, FOTO ANTES, FOTO DESPUES/,
  );
});

test('preserves public photo URLs when the workbook is saved', () => {
  const filePath = path.join(os.tmpdir(), `fads-report-${process.pid}-${Date.now()}.xlsx`);
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([
    ['INFORME'],
    ['ITEM', 'ID', 'D/TIVO', 'UBICACION', 'TECNOLOGIA', 'FECHA', 'TECNICO RESPONSABLE', 'ESTADO FINAL', 'OBSERVACION', 'FOTO ANTES', 'FOTO DESPUES'],
  ]);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'DISPOSITIVOS');

  try {
    writeReportRow(worksheet, {
      device: { ID: 'P2L01D001', DISPOSITIVO: 'SH', UBICACION: 'BANO HOMBRES', TIPO: 'PHOTO' },
      date: '2026-11-18',
      technician: 'TECNICO',
      state: 'BUENO',
      observation: '',
      photoLinks: {
        photoBefore: 'https://backend.example/fotos/antes_P2L01D001.jpg',
        photoAfter: 'https://backend.example/fotos/despues_P2L01D001.jpg',
      },
    });
    XLSX.writeFile(workbook, filePath);

    const savedWorksheet = XLSX.readFile(filePath).Sheets.DISPOSITIVOS;
    assert.equal(savedWorksheet.J3.l.Target, 'https://backend.example/fotos/antes_P2L01D001.jpg');
    assert.equal(savedWorksheet.K3.l.Target, 'https://backend.example/fotos/despues_P2L01D001.jpg');
  } finally {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
});
