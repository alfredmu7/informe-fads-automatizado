const assert = require('node:assert/strict');
const ExcelJS = require('exceljs');
const express = require('express');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { SHEET_CONFIG } = require('./sacs-report');

const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'sacs-route-'));
process.env.SACS_EXCEL_PATH = path.join(temporaryDirectory, 'informe-sacs.xlsx');
process.env.SACS_IMAGES_DIR = path.join(temporaryDirectory, 'fotos');
const sacsRouter = require('./sacs');

const SHEET_HEADERS = {
  Puertas: [
    'ITEM', 'ID', 'UBICACION', 'FECHA', 'TECNICO RESPONSABLE', 'GENERAL||SWINGATE||AMPLIACION',
    'LECTORA BIOMETRICA ENTRADA', 'KEY SWITCH', 'LECTORA DE ENTRADA', 'SIRENA ESTROBOSCOPICA',
    'BOTON', 'LECTORA DE SALIDA', 'INTERCOM DE SALIDA', 'ELECTROÍMAN #1', 'ELECTROÍMAN #2',
    'TAMPER', 'TIMER', 'CONTROLADORA RDR', 'BATERIA #1', 'BATERIA #2', 'OBSERVACIONES',
    'MARQUILLA', 'FOTO ANTES', 'FOTO DESPUES',
  ],
  Botones: [
    'ITEM', 'ID', 'UBICACION', 'FECHA', 'TECNICO RESPONSABLE', 'PEDAL', 'BOTON', 'ACRILICO',
    'ESTADO INICIAL', 'INSP. VISUAL', 'MONTAJE', 'CONEX.', 'ESTADO FINAL', 'OBSERVACIONES',
    'GRAFICO CCURE', 'REAL TIME', 'MARQUILLA', 'FOTO ANTES', 'FOTO DESPUES',
  ],
  Citofonia: [
    'ITEM', 'ID', 'UBICACION', 'FECHA', 'TECNICO RESPONSABLE', 'GENERAL||SWINGATE||AMPLIACION',
    'ESTADO DE LEDS', 'CONEX. Y AJUSTES', 'MONTAJE EN RAC', 'NUM. RAC', 'LIMPIEZA',
    'VOLTAJE ALIMENT.', 'VERIFICACION LEDS', 'PUERTOS OCUPADOS', 'PUERTOS LIBRES',
    'CONEX. EQUIPO-SERVIDOR', 'ESTADO FINAL', 'MARQUILLA', 'OBSERVACIONES', 'FOTO ANTES', 'FOTO DESPUES',
  ],
  CK: [
    'ITEM', 'ID', 'UBICACION', 'FECHA', 'TECNICO RESPONSABLE', 'ESTADO INICIAL', 'INSP. VISUAL',
    'MONTAJE', 'CONEX.', 'LIMPIEZA', 'ESTADO FINAL', 'OBSERVACIONES', 'ESTADO DE LEDS',
    'ESTADO CCURE', 'VOLTAJE ALIMENT.  CONTROLADORES VDC', 'VOLTAJE 1 DEL BUS 485 VDC',
    'VOLTAJE 2 DEL BUS 485 VDC', 'VOLTAJE 3 DEL BUS  485 VDC', 'ANCLAJE GABINETE',
    'CONEX. BORNERAS', 'MARQUILLA', 'FOTO ANTES', 'FOTO DESPUES',
  ],
};

async function createTemporaryWorkbook() {
  const workbook = new ExcelJS.Workbook();
  for (const [sheetName, headers] of Object.entries(SHEET_HEADERS)) {
    const worksheet = workbook.addWorksheet(sheetName);
    worksheet.addRow(['', '', '', '', '', `REPORTE ${sheetName}`]);
    worksheet.addRow(headers);
  }
  await workbook.xlsx.writeFile(process.env.SACS_EXCEL_PATH);
}

function createRequestData(sheetName, device, overrides = {}) {
  const data = new FormData();
  data.append('hoja', sheetName);
  data.append('idDispositivo', device.ID);
  data.append('itemDispositivo', String(device.ITEM));
  data.append('tecnico', 'TECNICO PRUEBA');
  data.append('general', SHEET_CONFIG[sheetName].general ? 'GENERAL' : '');
  data.append('observacion', 'Prueba SACS');
  data.append(
    'checklistItems',
    JSON.stringify(SHEET_CONFIG[sheetName].checklist
      .filter((field) => field.defaultChecked)
      .map((field) => field.id)),
  );
  data.append('numericValues', JSON.stringify(Object.fromEntries(
    (SHEET_CONFIG[sheetName].numeric || [])
      .map((field) => [field.id, field.defaultValue]),
  )));
  Object.entries(overrides).forEach(([key, value]) => data.set(key, String(value)));
  return data;
}

test('serves SACS data and registers all four matrices through the dedicated route', async () => {
  await createTemporaryWorkbook();
  const app = express();
  app.use('/api/sacs', sacsRouter);
  const server = app.listen(0, '127.0.0.1');

  try {
    await new Promise((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });
    const baseUrl = `http://127.0.0.1:${server.address().port}/api/sacs`;
    const devicesResponse = await fetch(`${baseUrl}/dispositivos`);
    const devices = await devicesResponse.json();
    assert.equal(devicesResponse.status, 200);
    assert.equal(devices.length, 1163);

    const selectedDevice = devices.find((device) => device.ID === '1157-01');
    for (const sheetName of Object.keys(SHEET_HEADERS)) {
      const requestData = createRequestData(sheetName, selectedDevice);
      if (sheetName === 'CK') {
        requestData.append(
          'fotoAntes',
          new Blob(['test image'], { type: 'image/jpeg' }),
          'before.jpg',
        );
      }
      const response = await fetch(`${baseUrl}/registrar`, {
        method: 'POST',
        body: requestData,
      });
      const result = await response.json();
      assert.equal(response.status, 200, `${sheetName}: ${JSON.stringify(result)}`);
      assert.equal(result.success, true);
      assert.equal(result.hoja, sheetName);
      assert.equal(result.fila, 3);
    }

    const duplicateDevice = devices.find(
      (device) => device.ID === '1099A-01' && device.ITEM === 132,
    );
    const duplicateResponse = await fetch(`${baseUrl}/registrar`, {
      method: 'POST',
      body: createRequestData('Puertas', duplicateDevice),
    });
    const duplicateResult = await duplicateResponse.json();
    assert.equal(duplicateResponse.status, 200);
    assert.equal(duplicateResult.ubicacion, 'PUERTA BMS HACIA ALFA 13 N 00');

    const savedWorkbook = new ExcelJS.Workbook();
    await savedWorkbook.xlsx.readFile(process.env.SACS_EXCEL_PATH);
    assert.equal(savedWorkbook.getWorksheet('Puertas').getRow(4).getCell(3).value, 'PUERTA BMS HACIA ALFA 13 N 00');
    assert.equal(savedWorkbook.getWorksheet('Botones').getRow(3).getCell(8).value, 'NO');
    assert.equal(savedWorkbook.getWorksheet('Citofonia').getRow(3).getCell(12).value, 48);
    assert.equal(savedWorkbook.getWorksheet('CK').getRow(3).getCell(15).value, 27);
    assert.match(savedWorkbook.getWorksheet('CK').getRow(3).getCell(22).value.hyperlink, /\/api\/sacs\/fotos\/antes_1157_01_/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});
