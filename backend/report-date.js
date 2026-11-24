/** Uses the report's recorded day for installation, avoiding a second date input or timezone drift. */
function getOptionalInstallationDate(enabled, registrationDate) {
  const flag = enabled == null ? '' : String(enabled).toLowerCase();
  if (flag && flag !== 'true' && flag !== 'false') {
    const error = new Error('El indicador de dispositivo recién instalado no es válido.');
    error.statusCode = 400;
    throw error;
  }
  if (flag !== 'true') return null;

  const value = String(registrationDate ?? '').trim();
  const date = new Date(`${value}T00:00:00.000Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
    || Number.isNaN(date.getTime())
    || date.toISOString().slice(0, 10) !== value
  ) {
    const error = new Error('No se pudo determinar una fecha de registro válida para la instalación.');
    error.statusCode = 400;
    throw error;
  }
  return date;
}

module.exports = { getOptionalInstallationDate };
