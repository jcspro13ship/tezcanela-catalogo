// Este script se pega en Extensiones > Apps Script del Google Sheet del catálogo.
// 1) doGet: sirve los datos de las hojas "Productos", "Variantes" e "Imagenes" como
//    JSON, para que el sitio web los lea automáticamente (público, solo lectura).
// 2) doPost: panel de administración del sitio (/admin). Permite ajustar stock,
//    precio y activar/desactivar productos SIN dar acceso al Google Sheet.
//    Exige la clave guardada en Propiedades del script (ADMIN_CLAVE); esa clave
//    NUNCA se escribe en este archivo (el repositorio de GitHub es público).
//
// Ver docs/INSTRUCTIVO_TECNICO.md para el paso a paso de instalación y publicación.

var CACHE_KEY = 'catalogo_json_v1'
var CACHE_SEGUNDOS = 300 // 5 minutos: evita releer todo el Sheet en cada visita

function doGet(e) {
  var cache = CacheService.getScriptCache()
  var cacheado = cache.get(CACHE_KEY)
  if (cacheado) {
    return ContentService.createTextOutput(cacheado).setMimeType(ContentService.MimeType.JSON)
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet()

  var imagenesPorProducto = {}
  sheetToObjects(ss.getSheetByName('Imagenes')).forEach(function (img) {
    var pid = String(img.producto_id)
    if (!imagenesPorProducto[pid]) imagenesPorProducto[pid] = []
    imagenesPorProducto[pid].push({
      orden: Number(img.orden) || 0,
      url: String(img.url),
    })
  })
  Object.keys(imagenesPorProducto).forEach(function (pid) {
    imagenesPorProducto[pid].sort(function (a, b) {
      return a.orden - b.orden
    })
  })

  var productos = sheetToObjects(ss.getSheetByName('Productos')).map(function (p) {
    var id = String(p.id)
    var imagenes = (imagenesPorProducto[id] || []).map(function (img) {
      return img.url
    })
    // Compatibilidad: si el producto no tiene filas en "Imagenes" pero sí tiene
    // algo en la columna "imagen" (formato anterior), se usa como única foto.
    if (imagenes.length === 0 && p.imagen) {
      imagenes = [String(p.imagen)]
    }
    return {
      id: id,
      nombre: p.nombre,
      categoria: p.categoria,
      descripcion: p.descripcion,
      precio: Number(p.precio) || 0,
      imagenes: imagenes,
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

  var json = JSON.stringify(data)
  cache.put(CACHE_KEY, json, CACHE_SEGUNDOS)

  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON)
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


// ============================================================================
// ADMINISTRACIÓN (panel /admin del sitio)
// ============================================================================

var MAX_INTENTOS = 5          // intentos fallidos de clave antes de bloquear
var BLOQUEO_SEGUNDOS = 600    // 10 minutos
var CLAVE_FALLOS = 'admin_fallos'

function doPost(e) {
  var resp
  try {
    var req = JSON.parse(e.postData.contents)
    resp = manejarAdmin_(req)
  } catch (err) {
    resp = { ok: false, error: 'Solicitud inválida.' }
  }
  return ContentService.createTextOutput(JSON.stringify(resp)).setMimeType(
    ContentService.MimeType.JSON
  )
}

function manejarAdmin_(req) {
  var cache = CacheService.getScriptCache()
  var fallos = Number(cache.get(CLAVE_FALLOS)) || 0
  if (fallos >= MAX_INTENTOS) {
    return { ok: false, bloqueado: true, error: 'Demasiados intentos fallidos. Espera 10 minutos.' }
  }

  var clave = PropertiesService.getScriptProperties().getProperty('ADMIN_CLAVE')
  if (!clave) {
    return { ok: false, error: 'El administrador aún no configuró la clave (ADMIN_CLAVE) en el script.' }
  }
  if (!req || typeof req.clave !== 'string' || req.clave !== clave) {
    cache.put(CLAVE_FALLOS, String(fallos + 1), BLOQUEO_SEGUNDOS)
    return { ok: false, claveIncorrecta: true, error: 'Clave incorrecta.' }
  }
  cache.remove(CLAVE_FALLOS)

  if (req.accion === 'verificar') return { ok: true }
  if (req.accion === 'guardarProducto') return guardarProducto_(req)
  return { ok: false, error: 'Acción no reconocida.' }
}

// Lee una hoja y devuelve { valores, col } donde col[nombreColumna] = índice (base 0).
function leerHoja_(nombre) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nombre)
  if (!sheet) throw new Error('No existe la pestaña "' + nombre + '".')
  var valores = sheet.getDataRange().getValues()
  var col = {}
  valores[0].forEach(function (h, i) {
    col[String(h)] = i
  })
  return { sheet: sheet, valores: valores, col: col }
}

function buscarFila_(hoja, columna, valor) {
  var c = hoja.col[columna]
  if (c === undefined) throw new Error('Falta la columna "' + columna + '".')
  for (var i = 1; i < hoja.valores.length; i++) {
    if (String(hoja.valores[i][c]) === String(valor)) return i + 1 // fila real (base 1)
  }
  return -1
}

// req: { id, precio?, activo?, stocks?: [{ sku, stock }] }
function guardarProducto_(req) {
  var id = typeof req.id === 'string' ? req.id.trim() : ''
  if (!id) return { ok: false, error: 'Falta el id del producto.' }

  var tienePrecio = req.precio !== undefined && req.precio !== null
  var tieneActivo = req.activo !== undefined && req.activo !== null
  var stocks = Array.isArray(req.stocks) ? req.stocks : []

  if (tienePrecio && !(typeof req.precio === 'number' && isFinite(req.precio) && req.precio >= 0 && req.precio < 100000000)) {
    return { ok: false, error: 'Precio inválido.' }
  }
  if (tieneActivo && typeof req.activo !== 'boolean') return { ok: false, error: 'Valor de "activo" inválido.' }
  if (stocks.length > 300) return { ok: false, error: 'Demasiados cambios de stock en una sola solicitud.' }
  for (var k = 0; k < stocks.length; k++) {
    var st = stocks[k]
    if (!st || typeof st.sku !== 'string' || !st.sku || !(typeof st.stock === 'number' && st.stock >= 0 && st.stock <= 100000 && st.stock === Math.floor(st.stock))) {
      return { ok: false, error: 'Stock inválido (debe ser un número entero de 0 o más).' }
    }
  }
  if (!tienePrecio && !tieneActivo && stocks.length === 0) return { ok: false, error: 'No hay cambios para guardar.' }

  var lock = LockService.getScriptLock()
  lock.waitLock(20000)
  try {
    var productos = leerHoja_('Productos')
    var filaProd = buscarFila_(productos, 'id', id)
    if (filaProd < 0) return { ok: false, error: 'No se encontró el producto "' + id + '".' }

    var variantes = stocks.length ? leerHoja_('Variantes') : null
    var filasStock = []
    for (var i = 0; i < stocks.length; i++) {
      var fila = buscarFila_(variantes, 'sku', stocks[i].sku)
      if (fila < 0) return { ok: false, error: 'No se encontró la variante "' + stocks[i].sku + '".' }
      // el sku debe pertenecer al producto indicado
      if (String(variantes.valores[fila - 1][variantes.col['producto_id']]) !== id) {
        return { ok: false, error: 'La variante "' + stocks[i].sku + '" no pertenece al producto "' + id + '".' }
      }
      filasStock.push(fila)
    }

    // Todo validado: recién ahora se escribe.
    var detalle = []
    if (tienePrecio) {
      productos.sheet.getRange(filaProd, productos.col['precio'] + 1).setValue(req.precio)
      detalle.push('precio=' + req.precio)
    }
    if (tieneActivo) {
      productos.sheet.getRange(filaProd, productos.col['activo'] + 1).setValue(req.activo)
      detalle.push('activo=' + req.activo)
    }
    for (var j = 0; j < stocks.length; j++) {
      variantes.sheet.getRange(filasStock[j], variantes.col['stock'] + 1).setValue(stocks[j].stock)
      detalle.push(stocks[j].sku + '=' + stocks[j].stock)
    }

    registrar_('guardarProducto', id + ' | ' + detalle.join(', '))
    CacheService.getScriptCache().remove(CACHE_KEY) // el sitio vuelve a leer datos frescos
    return { ok: true }
  } finally {
    lock.releaseLock()
  }
}

// Bitácora simple: pestaña "Registro" (fecha, acción, detalle).
function registrar_(accion, detalle) {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  var hoja = ss.getSheetByName('Registro')
  if (!hoja) {
    hoja = ss.insertSheet('Registro')
    hoja.appendRow(['fecha', 'accion', 'detalle'])
  }
  hoja.appendRow([new Date(), accion, detalle])
}
