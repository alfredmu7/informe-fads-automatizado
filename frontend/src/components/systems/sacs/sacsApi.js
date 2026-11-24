const configuredApiUrl = String(import.meta.env.VITE_API_URL || '').trim();

export function getSacsEndpoint(resource) {
  if (!configuredApiUrl) return `/api/sacs/${resource}`;

  const backendOrigin = configuredApiUrl
    .replace(/\/api\/registrar\/?$/i, '')
    .replace(/\/api\/?$/i, '')
    .replace(/\/+$/, '');
  return `${backendOrigin}/api/sacs/${resource}`;
}

export async function readSacsJsonResponse(response) {
  const rawText = await response.text();
  try {
    return rawText ? JSON.parse(rawText) : null;
  } catch {
    throw new Error(
      `El servidor devolvió una respuesta no válida (HTTP ${response.status}). Verifica que el backend y su URL estén activos.`,
    );
  }
}
