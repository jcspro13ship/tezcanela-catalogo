// Descuento por producto: un porcentaje entero (1 a 90) que se guarda en la
// columna "descuento" de la pestaña Productos. Sin descuento (vacío o 0), el
// producto se vende a su precio normal.

export function porcentajeDescuento(producto) {
  const d = Math.round(Number(producto && producto.descuento))
  return Number.isFinite(d) && d >= 1 && d <= 90 ? d : 0
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
