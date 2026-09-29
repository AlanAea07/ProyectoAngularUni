// Compatibilidad para las pantallas. ApiClient implementa el transporte Axios y la caché.
export function mensajeError(error: unknown, defecto = 'No se pudo completar la operación.'): string {
  const mensaje = (error as {error?: {message?: unknown}})?.error?.message;
  return typeof mensaje === 'string' ? mensaje : error instanceof Error ? error.message : defecto;
}
