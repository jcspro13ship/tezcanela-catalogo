// DATOS DE EJEMPLO — se reemplazan por el inventario real de Fanny.
// Estructura pensada para mapear 1:1 con la hoja "Variantes" de Google Sheets:
// producto_id | sku | talla | color | stock
// Un producto puede tener varias filas (una por combinación talla-color).

const TALLAS = ['XS', 'S', 'M', 'L', 'XL']

function generarVariantes(productoId, colores, stockBase = 5) {
  const variantes = []
  colores.forEach((color) => {
    TALLAS.forEach((talla, i) => {
      variantes.push({
        producto_id: productoId,
        sku: `${productoId}-${color.slice(0, 3).toUpperCase()}-${talla}`,
        talla,
        color,
        // stock variable de ejemplo, incluye algunas tallas agotadas
        stock: Math.max(0, stockBase - i + (color.length % 3)),
      })
    })
  })
  return variantes
}

export const variantes = [
  ...generarVariantes('p1', ['Negro', 'Beige'], 6),
  ...generarVariantes('p2', ['Blanco', 'Rosa', 'Negro'], 5),
  ...generarVariantes('p3', ['Negro', 'Café'], 4),
  ...generarVariantes('p4', ['Vinotinto', 'Negro'], 5),
  ...generarVariantes('p5', ['Beige', 'Negro'], 3),
  ...generarVariantes('p6', ['Rojo', 'Negro', 'Verde'], 6),
  ...generarVariantes('p7', ['Blanco', 'Amarillo'], 5),
  ...generarVariantes('p8', ['Azul', 'Negro'], 7),
]

export function variantesPorProducto(productoId) {
  return variantes.filter((v) => v.producto_id === productoId)
}
