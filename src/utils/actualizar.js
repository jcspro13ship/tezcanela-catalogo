// El sitio es estático y el celular guarda la página hasta 10 minutos; una app
// instalada además se queda "dormida" y retoma la pantalla vieja. Estas
// funciones comparan la versión que está corriendo con la publicada.
const PATRON = /\/assets\/index-[A-Za-z0-9_-]+\.js/

export function bundleDe(texto) {
  const m = String(texto).match(PATRON)
  return m ? m[0] : null
}

function bundleActual() {
  const src = Array.from(document.scripts)
    .map((s) => s.getAttribute('src') || '')
    .find((s) => PATRON.test(s))
  return src ? bundleDe(src) : null
}

// true si hay una versión del sitio más nueva que la que está corriendo.
export async function hayVersionNueva() {
  const actual = bundleActual()
  if (!actual) return false // en desarrollo no hay archivo con hash
  const res = await fetch(`${import.meta.env.BASE_URL}index.html?v=${Date.now()}`, { cache: 'no-store' })
  if (!res.ok) return false
  const publicado = bundleDe(await res.text())
  return !!publicado && publicado !== actual
}
