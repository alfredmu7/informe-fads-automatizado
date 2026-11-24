const assert = require('node:assert/strict');
const ExcelJS = require('exceljs');
const test = require('node:test');
const {
  findSavedRequest,
  parseRequestId,
  recordSavedRequest,
  verifySavedRequest,
} = require('./report-idempotency');

const requestId = '123e4567-e89b-42d3-a456-426614174000';

test('stores request identity with the report workbook and verifies the linked row', () => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Citofonia');
  worksheet.addRow(['ITEM', 'ID', 'FOTO ANTES']);
  worksheet.addRow([3, 'CITO-01', '']);
  const response = { success: true, inspectionSaved: true, hoja: 'Citofonia', fila: 3, item: 3 };

  recordSavedRequest(workbook, {
    requestId,
    sheetName: 'Citofonia',
    rowNumber: 2,
    columns: { item: 1, id: 2, photoBefore: 3 },
    expectedValues: { item: 3, id: 'CITO-01', photoBefore: '' },
    response,
  });

  const saved = findSavedRequest(workbook, requestId);
  assert.equal(workbook.getWorksheet('__REPORT_REQUESTS').state, 'veryHidden');
  assert.deepEqual(saved.response, response);
  assert.equal(verifySavedRequest(workbook, saved), true);

  worksheet.getRow(2).getCell(2).value = 'CITO-02';
  assert.equal(verifySavedRequest(workbook, saved), false);
});

test('rejects malformed request IDs while allowing legacy clients without a key', () => {
  assert.equal(parseRequestId(undefined), '');
  assert.equal(parseRequestId(requestId), requestId);
  assert.throws(() => parseRequestId('not-a-uuid'), { statusCode: 400 });
});
