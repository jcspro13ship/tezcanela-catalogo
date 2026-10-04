import { SHEETS_API_URL } from '../config'

// Llama al panel de administración del Apps Script (doPost). La clave se valida
// en el servidor: aquí nunca hay una clave guardada en el código.
// "text/plain" evita la solicitud previa (preflight) que Apps Script no admite.
export async function llamarAdmin(clave, accion, datos = {}) {
  if (!SHEETS_API_URL) return { ok: false, error: 'El sitio no está conectado al Sheet.' }

  let res
  try {
    res = await fetch(SHEETS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ clave, accion, ...datos }),
    })
  } catch {
    return { ok: false, error: 'No se pudo conectar con el servidor. Revisa tu conexión a internet.' }
  }

  try {
    return await res.json()
  } catch {
    return {
      ok: false,
      error: 'El servidor todavía no tiene activado el panel de administración (falta actualizar el script).',
    }
  }
}
