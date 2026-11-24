const crypto = require('node:crypto');

const LEDGER_SHEET_NAME = '__REPORT_REQUESTS';
const LEDGER_HEADERS = [
  'REQUEST ID',
  'REPORT SHEET',
  'ROW NUMBER',
  'FIELDS',
  'COLUMNS',
  'FINGERPRINT',
  'RESPONSE',
];

/** Validates the optional client key used to make retries safe without relying on device IDs. */
function parseRequestId(value) {
  if (value == null || value === '') return '';
  const requestId = String(value).trim();
  if (!/^[\da-f]{8}-[\da-f]{4}-[1-8][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(requestId)) {
    const error = new Error('El identificador único del registro no es válido.');
    error.statusCode = 400;
    throw error;
  }
  return requestId;
}

function getLedgerWorksheet(workbook, create = false) {
  let worksheet = workbook.getWorksheet(LEDGER_SHEET_NAME);
  if (!worksheet && create) {
    worksheet = workbook.addWorksheet(LEDGER_SHEET_NAME);
    worksheet.addRow(LEDGER_HEADERS);
  }
  if (worksheet) worksheet.state = 'veryHidden';
  return worksheet;
}

function normalizeValue(field, value) {
  if (field.startsWith('photo') && value && typeof value === 'object') {
    value = value.hyperlink ?? value.text ?? '';
  }
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value ?? '');
}

function createFingerprint(fields, values) {
  const comparable = fields
    .slice()
    .sort()
    .map((field) => [field, normalizeValue(field, values[field])]);
  return crypto.createHash('sha256').update(JSON.stringify(comparable)).digest('hex');
}

/** Looks up a previously committed request in the workbook's very-hidden ledger. */
function findSavedRequest(workbook, requestId) {
  if (!requestId) return null;
  const worksheet = getLedgerWorksheet(workbook);
  if (!worksheet) return null;

  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    if (String(row.getCell(1).value ?? '') !== requestId) continue;

    try {
      return {
        requestId,
        sheetName: String(row.getCell(2).value ?? ''),
        rowNumber: Number(row.getCell(3).value),
        fields: JSON.parse(String(row.getCell(4).value ?? '[]')),
        columns: JSON.parse(String(row.getCell(5).value ?? '{}')),
        fingerprint: String(row.getCell(6).value ?? ''),
        response: JSON.parse(String(row.getCell(7).value ?? 'null')),
      };
    } catch (error) {
      const invalidRecord = new Error(`No se pudo leer el registro idempotente ${requestId}.`);
      invalidRecord.statusCode = 500;
      throw invalidRecord;
    }
  }
  return null;
}

/** Adds retry metadata to the same workbook save as the report row. */
function recordSavedRequest(workbook, {
  requestId,
  sheetName,
  rowNumber,
  columns,
  expectedValues,
  response,
}) {
  if (!requestId) return null;
  if (findSavedRequest(workbook, requestId)) {
    const error = new Error('Este envío ya existe en el libro de reportes.');
    error.statusCode = 409;
    throw error;
  }

  const worksheet = getLedgerWorksheet(workbook, true);
  const fields = Object.keys(expectedValues).filter(
    (field) => Number.isInteger(columns[field]) && columns[field] > 0,
  );
  const fingerprint = createFingerprint(fields, expectedValues);
  worksheet.addRow([
    requestId,
    sheetName,
    rowNumber,
    JSON.stringify(fields),
    JSON.stringify(columns),
    fingerprint,
    JSON.stringify(response),
  ]);
  return { requestId, sheetName, rowNumber, fields, columns, fingerprint, response };
}

/** Confirms that a retry's ledger entry still matches the committed report row. */
function verifySavedRequest(workbook, record) {
  if (!record) return false;
  const worksheet = workbook.getWorksheet(record.sheetName);
  const row = worksheet?.getRow(record.rowNumber);
  if (!row) return false;

  const values = {};
  for (const field of record.fields) {
    const column = record.columns[field];
    if (!Number.isInteger(column) || column < 1) return false;
    values[field] = row.getCell(column).value;
  }
  return createFingerprint(record.fields, values) === record.fingerprint;
}

module.exports = {
  findSavedRequest,
  parseRequestId,
  recordSavedRequest,
  verifySavedRequest,
};
