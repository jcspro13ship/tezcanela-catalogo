import { formatoPrecio, porcentajeDescuento, precioFinal } from './precios'
import { conAncho } from './imagenUrl'

// Enlace que se comparte. Apunta a la página /catalogo (que GitHub Pages sirve
// con éxito y con la tarjeta de vista previa); el parámetro "ver" hace que la
// app abra directamente la ficha del producto.
export function urlProducto(id) {
  return `${window.location.origin}${import.meta.env.BASE_URL}catalogo/?ver=${encodeURIComponent(id)}`
}

export function textoCompartir(producto) {
  const d = porcentajeDescuento(producto)
  const precio = formatoPrecio(precioFinal(producto))
  return [
    `${producto.nombre} — Tez Canela`,
    d > 0 ? `${precio} (${d}% de descuento)` : precio,
    `Mírala aquí: ${urlProducto(producto.id)}`,
  ].join('\n')
}

// La foto se descarga ANTES de que la persona toque "Compartir": los celulares
// solo dejan abrir el menú de compartir justo después de un toque, no tras una espera.
const fotos = new Map() // url de la portada -> File | null (null = no se pudo)

function urlPortada(producto) {
  const portada = producto.imagenes && producto.imagenes[0]
  return portada ? conAncho(portada, 800) : null
}

export function precargarFoto(producto) {
  const url = urlPortada(producto)
  if (!url || fotos.has(url)) return
  fotos.set(url, null)
  fetch(url)
    .then((r) => (r.ok ? r.blob() : null))
    .then((b) => {
      if (b) fotos.set(url, new File([b], `${producto.id}.jpg`, { type: b.type || 'image/jpeg' }))
    })
    .catch(() => {})
}

export function puedeCompartirNativo() {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function'
}

// Abre el menú de compartir del celular (con la foto si ya está descargada).
// Devuelve 'ok', 'cancelado' o 'no' (hay que usar las opciones de respaldo).
export async function compartirNativo(producto) {
  if (!puedeCompartirNativo()) return 'no'
  const texto = textoCompartir(producto)
  const url = urlPortada(producto)
  const foto = url ? fotos.get(url) : null
  try {
    if (foto && navigator.canShare && navigator.canShare({ files: [foto] })) {
      await navigator.share({ files: [foto], text: texto })
    } else {
      await navigator.share({ title: producto.nombre, text: texto })
    }
    return 'ok'
  } catch (e) {
    return e && e.name === 'AbortError' ? 'cancelado' : 'no'
  }
}

export function enlaceWhatsApp(producto) {
  return `https://wa.me/?text=${encodeURIComponent(textoCompartir(producto))}`
}

export async function copiarTexto(texto) {
  try {
    await navigator.clipboard.writeText(texto)
    return true
  } catch {
    return false
  }
}
