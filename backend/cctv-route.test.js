const assert = require('node:assert/strict');
const ExcelJS = require('exceljs');
const express = require('express');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'cctv-route-'));
process.env.CCTV_EXCEL_PATH = path.join(temporaryDirectory, 'informe-cctv.xlsx');
process.env.CCTV_IMAGES_DIR = path.join(temporaryDirectory, 'fotos');
const cctvRouter = require('./cctv');

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
];

test('serves camera data and registers a CCTV record through its dedicated API route', async () => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Registro cctv');
  worksheet.addRow(['', '', '', '', '', 'REPORTE CCTV']);
  worksheet.addRow(HEADERS);
  await workbook.xlsx.writeFile(process.env.CCTV_EXCEL_PATH);

  const app = express();
  app.use('/api/cctv', cctvRouter);
  const server = app.listen(0, '127.0.0.1');

  try {
    await new Promise((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}/api/cctv`;

    const devicesResponse = await fetch(`${baseUrl}/dispositivos`);
    const cameras = await devicesResponse.json();
    assert.equal(devicesResponse.status, 200);
    assert.equal(cameras.length, 1557);
    assert.equal(cameras.find((camera) => camera.ID === '2-40-1').FASE.trim(), 'AMPLIACIoN');

    const formData = new FormData();
    formData.append('idDispositivo', '2-40-1');
    formData.append('tecnico', 'TECNICO CCTV');
    formData.append('estadoInicial', 'Defectuoso');
    formData.append('estadoFinal', 'Operativo');
    formData.append('observacion', 'Inspección de prueba.');
    formData.append('checklistItems', JSON.stringify([
      'inspection-visual',
      'mount-support',
      'camera-connections',
      'lens-cleaning',
      'housing-cleaning',
      'focus',
      'iris',
      'sharpness',
      'marquilla',
    ]));

    const registerResponse = await fetch(`${baseUrl}/registrar`, {
      method: 'POST',
      body: formData,
    });
    const registration = await registerResponse.json();
    assert.equal(registerResponse.status, 200);
    assert.equal(registration.success, true);
    assert.equal(registration.inspectionSaved, true);
    assert.equal(registration.fila, 3);

    const savedWorkbook = new ExcelJS.Workbook();
    await savedWorkbook.xlsx.readFile(process.env.CCTV_EXCEL_PATH);
    const savedRow = savedWorkbook.getWorksheet('Registro cctv').getRow(3);
    assert.equal(savedRow.getCell(2).value, '2-40-1');
    assert.equal(savedRow.getCell(3).value.trim(), 'AMPLIACIoN');
    assert.equal(savedRow.getCell(7).value, 'Defectuoso');
    assert.equal(savedRow.getCell(13).value, 'Operativo');
    assert.equal(savedRow.getCell(20).value, 'SI');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});
