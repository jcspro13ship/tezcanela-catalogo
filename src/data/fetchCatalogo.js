import { productos as productosEjemplo } from './productos'
import { variantes as variantesEjemplo } from './variantes'
import { SHEETS_API_URL } from '../config'

// Normaliza el campo de fotos: siempre entrega producto.imagenes como arreglo,
// sin importar si la fuente trae "imagenes" (Sheet nuevo, con la hoja
// "Imagenes") o el "imagen" singular de la estructura anterior.
function normalizarProductos(productos) {
  return productos.map((p) => {
    const imagenes = Array.isArray(p.imagenes) && p.imagenes.length > 0 ? p.imagenes : p.imagen ? [p.imagen] : []
    return { ...p, imagenes }
  })
}

// Si no hay URL configurada (SHEETS_API_URL vacío en config.js), el sitio
// funciona con los datos de ejemplo. En cuanto se configura la URL del
// Apps Script conectado al Google Sheet real, el catálogo se llena solo
// desde ahí — sin tocar código.
export async function cargarCatalogo({ fresco = false } = {}) {
  if (!SHEETS_API_URL) {
    return {
      productos: normalizarProductos(productosEjemplo),
      variantes: variantesEjemplo,
      fuente: 'ejemplo',
    }
  }

  try {
    const res = await fetch(fresco ? `${SHEETS_API_URL}?t=${Date.now()}` : SHEETS_API_URL)
    if (!res.ok) throw new Error(`Respuesta no válida del Sheet (${res.status})`)
    const data = await res.json()
    if (!Array.isArray(data.productos) || !Array.isArray(data.variantes)) {
      throw new Error('Formato inesperado en la respuesta del Sheet')
    }
    return {
      productos: normalizarProductos(data.productos),
      variantes: data.variantes,
      fuente: 'sheets',
    }
  } catch (err) {
    console.error(
      'No se pudo cargar el catálogo desde Google Sheets, usando datos de ejemplo.',
      err
    )
    return {
      productos: normalizarProductos(productosEjemplo),
      variantes: variantesEjemplo,
      fuente: 'ejemplo',
    }
  }
}
