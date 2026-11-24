const assert = require('node:assert/strict');
const ExcelJS = require('exceljs');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  SHEET_CONFIG,
  buildSacsChecklistValues,
  buildSacsPhotoFilename,
  findSacsDeviceByIdAndItem,
  findSacsDevicesById,
  findSacsReportColumns,
  parseSacsNumericValues,
  writeSacsReportRow,
} = require('./sacs-report');

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

function createReportWorksheet(sheetName) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);
  worksheet.addRow(['', '', '', '', '', `REPORTE ${sheetName}`]);
  worksheet.addRow(SHEET_HEADERS[sheetName]);
  return { workbook, worksheet };
}

function createRegistration(sheetName, overrides = {}) {
  const checklist = SHEET_CONFIG[sheetName].checklist;
  const numericValues = Object.fromEntries(
    (SHEET_CONFIG[sheetName].numeric || []).map((field) => [field.id, field.defaultValue]),
  );
  return {
    sheetName,
    device: { ID: 'SACS-100', ITEM: 100, UBICACION: 'PASILLO NORTE' },
    date: '2026-11-23',
    technician: 'TECNICO SACS',
    general: SHEET_CONFIG[sheetName].general ? 'SWINGATE' : '',
    observation: 'Mantenimiento realizado.',
    selectedItems: checklist.filter((field) => field.defaultChecked).map((field) => field.id),
    numericValues,
    photoLinks: {},
    ...overrides,
  };
}

test('writes SACS checklist, database metadata, and sheet-specific values to all four matrices', async () => {
  for (const sheetName of Object.keys(SHEET_HEADERS)) {
    const { worksheet } = createReportWorksheet(sheetName);
    const registration = createRegistration(sheetName);
    const result = await writeSacsReportRow(worksheet, registration);
    const row = worksheet.getRow(3);
    const { columns } = findSacsReportColumns(worksheet, sheetName);

    assert.equal(result.item, 1, sheetName);
    assert.equal(row.getCell(columns.id).value, 'SACS-100', sheetName);
    assert.equal(row.getCell(columns.location).value, 'PASILLO NORTE', sheetName);
    assert.equal(row.getCell(columns.technician).value, 'TECNICO SACS', sheetName);
    assert.equal(row.getCell(columns.observation).value, 'Mantenimiento realizado.', sheetName);
    for (const checklistField of SHEET_CONFIG[sheetName].checklist) {
      assert.equal(
        row.getCell(columns[checklistField.field]).value,
        checklistField.defaultChecked ? 'SI' : 'NO',
        `${sheetName}: ${checklistField.id}`,
      );
    }

    if (SHEET_CONFIG[sheetName].general) {
      assert.equal(row.getCell(columns.general).value, 'SWINGATE', sheetName);
    }
    for (const numericField of SHEET_CONFIG[sheetName].numeric || []) {
      assert.equal(row.getCell(columns[numericField.field]).value, numericField.defaultValue, `${sheetName}: ${numericField.id}`);
    }
  }
});

test('maps duplicate SACS IDs to a selected database row and its corresponding location', () => {
  const devices = JSON.parse(fs.readFileSync(
    path.join(__dirname, 'public', 'SQL_sacs_backend.json'),
    'utf8',
  ));
  const matches = findSacsDevicesById(devices, '1099a-01');
  assert.equal(matches.length, 2);
  assert.equal(findSacsDeviceByIdAndItem(devices, '1099A-01', 132).UBICACION, 'PUERTA BMS HACIA ALFA 13 N 00');
  assert.notEqual(matches[0].UBICACION, matches[1].UBICACION);
});

test('maps defaults to SI/NO and rejects checklist items from another SACS matrix', () => {
  const doorsValues = buildSacsChecklistValues('Puertas', ['marquilla']);
  assert.equal(doorsValues.biometricReaderEntry, 'NO');
  assert.equal(doorsValues.marquilla, 'SI');
  assert.throws(
    () => buildSacsChecklistValues('Puertas', ['pedal']),
    /no corresponden a la pestaña/,
  );
});

test('validates numeric values and creates unique SACS photo names', () => {
  assert.deepEqual(parseSacsNumericValues('Citofonia', {
    'supply-voltage': '48',
    'occupied-ports': '23',
    'free-ports': '7',
  }), {
    supplyVoltage: 48,
    occupiedPorts: 23,
    freePorts: 7,
  });
  assert.throws(
    () => parseSacsNumericValues('Citofonia', {
      'supply-voltage': '48',
      'occupied-ports': '2.5',
      'free-ports': '7',
    }),
    /no es válido/,
  );
  assert.equal(
    buildSacsPhotoFilename('fotoAntes', '1099A-01', '.JPG', '123-456'),
    'antes_1099A_01_123-456.jpg',
  );
});
