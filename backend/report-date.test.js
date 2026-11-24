const assert = require('node:assert/strict');
const test = require('node:test');
const { getOptionalInstallationDate } = require('./report-date');

test('uses the registration day as a UTC Excel date when newly installed is selected', () => {
  assert.equal(
    getOptionalInstallationDate('true', '2026-03-09').toISOString(),
    '2026-03-09T00:00:00.000Z',
  );
});

test('leaves the installation date empty when the option is not selected', () => {
  assert.equal(getOptionalInstallationDate('false', '2026-03-09'), null);
  assert.equal(getOptionalInstallationDate(undefined, '2026-03-09'), null);
});

test('rejects invalid checkbox values and invalid registration dates', () => {
  assert.throws(() => getOptionalInstallationDate('yes', '2026-03-09'), { statusCode: 400 });
  assert.throws(() => getOptionalInstallationDate('true', '2026-02-30'), { statusCode: 400 });
});
