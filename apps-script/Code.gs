// Este script se pega en Extensiones > Apps Script del Google Sheet del catálogo.
// Sirve los datos de las hojas "Productos" y "Variantes" como JSON, para que
// el sitio web los lea automáticamente. No requiere instalar nada más.
//
// Ver docs/INSTRUCTIVO_TECNICO.md para el paso a paso de instalación y publicación.

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet()

  var productos = sheetToObjects(ss.getSheetByName('Productos')).map(function (p) {
    return {
      id: String(p.id),
      nombre: p.nombre,
      categoria: p.categoria,
      descripcion: p.descripcion,
      precio: Number(p.precio) || 0,
      imagen: p.imagen ? String(p.imagen) : null,
      activo: esVerdadero(p.activo),
    }
  })

  var variantes = sheetToObjects(ss.getSheetByName('Variantes')).map(function (v) {
    return {
      producto_id: String(v.producto_id),
      sku: String(v.sku),
      talla: String(v.talla),
      color: String(v.color),
      stock: Number(v.stock) || 0,
    }
  })

  var data = {
    productos: productos,
    variantes: variantes,
    actualizado: new Date().toISOString(),
  }

  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON
  )
}

// Convierte una hoja (con fila de encabezados) en una lista de objetos.
function sheetToObjects(sheet) {
  if (!sheet) return []
  var valores = sheet.getDataRange().getValues()
  var encabezados = valores[0]
  var filas = valores.slice(1)
  return filas
    .filter(function (fila) {
      return fila.join('') !== ''
    })
    .map(function (fila) {
      var obj = {}
      encabezados.forEach(function (h, i) {
        obj[h] = fila[i]
      })
      return obj
    })
}

function esVerdadero(valor) {
  return valor === true || valor === 'TRUE' || valor === 'VERDADERO' || valor === 1
}
