// Descuento por producto: un porcentaje entero (1 a 90) que se guarda en la
// columna "descuento" de la pestaña Productos, con una fecha de fin opcional en
// "descuento_hasta" (el último día en que vale, hora de Colombia). Sin descuento
// (vacío o 0) o con la fecha vencida, el producto se vende a su precio normal.

const ZONA = 'America/Bogota'

// Fecha de hoy en Colombia como "2026-12-31" (se compara como texto).
export function hoyColombia() {
  return new Date().toLocaleDateString('en-CA', { timeZone: ZONA })
}

// "2026-12-31" -> "31 de diciembre"
export function formatoFecha(iso) {
  if (!iso) return ''
  return new Date(`${iso}T12:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })
}

// true si el producto tiene descuento cargado pero su fecha de fin ya pasó.
export function descuentoVencido(producto) {
  const d = Math.round(Number(producto && producto.descuento))
  return d >= 1 && !!producto.descuento_hasta && producto.descuento_hasta < hoyColombia()
}

// Porcentaje que rige HOY (0 si no hay descuento o ya venció).
export function porcentajeDescuento(producto) {
  const d = Math.round(Number(producto && producto.descuento))
  if (!(Number.isFinite(d) && d >= 1 && d <= 90)) return 0
  if (producto.descuento_hasta && producto.descuento_hasta < hoyColombia()) return 0
  return d
}

// Precio que paga la clienta, redondeado a la decena (como los precios del catálogo: ...990).
export function precioFinal(producto) {
  const d = porcentajeDescuento(producto)
  if (!d) return producto.precio
  return Math.round((producto.precio * (100 - d)) / 100 / 10) * 10
}

export function formatoPrecio(valor) {
  return valor.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
}
