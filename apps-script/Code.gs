// Este script se pega en Extensiones > Apps Script del Google Sheet del catálogo.
// 1) doGet: sirve los datos de las hojas "Productos", "Variantes" e "Imagenes" como
//    JSON, para que el sitio web los lea automáticamente (público, solo lectura).
// 2) doPost: panel de administración del sitio (/admin). Permite ajustar stock,
//    precio y descuento, editar nombre/descripción/categoría/fotos,
//    activar/desactivar productos y CREAR productos nuevos
//    SIN dar acceso al Google Sheet.
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
      descuento: Number(p.descuento) || 0,
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
  if (req.accion === 'crearProducto') return crearProducto_(req)
  if (req.accion === 'guardarFotos') return guardarFotos_(req)
  if (req.accion === 'aplicarDescuento') return aplicarDescuento_(req)
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

// Si la pestaña aún no tiene la columna (p. ej. "descuento"), la agrega al final.
function asegurarColumna_(hoja, nombre) {
  if (hoja.col[nombre] !== undefined) return
  var nueva = hoja.valores[0].length
  hoja.sheet.getRange(1, nueva + 1).setValue(nombre)
  hoja.col[nombre] = nueva
  hoja.valores[0].push(nombre)
  for (var i = 1; i < hoja.valores.length; i++) hoja.valores[i].push('')
}

function esEntero_(v, min, max) {
  return typeof v === 'number' && isFinite(v) && v === Math.floor(v) && v >= min && v <= max
}

// Los textos que empiezan con = + - @ se guardan como texto, nunca como fórmula.
function textoSeguro_(t) {
  return /^[=+\-@]/.test(t) ? "'" + t : t
}

// req: { id, nombre?, descripcion?, categoria?, precio?, descuento?, activo?, stocks?: [{ sku, stock }] }
function guardarProducto_(req) {
  var id = typeof req.id === 'string' ? req.id.trim() : ''
  if (!id) return { ok: false, error: 'Falta el id del producto.' }

  var tieneNombre = req.nombre !== undefined && req.nombre !== null
  var tieneDescripcion = req.descripcion !== undefined && req.descripcion !== null
  var tieneCategoria = req.categoria !== undefined && req.categoria !== null
  var tienePrecio = req.precio !== undefined && req.precio !== null
  var tieneDescuento = req.descuento !== undefined && req.descuento !== null
  var tieneActivo = req.activo !== undefined && req.activo !== null
  var stocks = Array.isArray(req.stocks) ? req.stocks : []

  if (tienePrecio && !(typeof req.precio === 'number' && isFinite(req.precio) && req.precio >= 0 && req.precio < 100000000)) {
    return { ok: false, error: 'Precio inválido.' }
  }
  if (tieneNombre && !(typeof req.nombre === 'string' && req.nombre.trim() && req.nombre.trim().length <= 120)) {
    return { ok: false, error: 'El nombre es obligatorio (hasta 120 letras).' }
  }
  if (tieneCategoria && !(typeof req.categoria === 'string' && req.categoria.trim() && req.categoria.trim().length <= 40)) {
    return { ok: false, error: 'La categoría es obligatoria (hasta 40 letras).' }
  }
  if (tieneDescripcion && !(typeof req.descripcion === 'string' && req.descripcion.trim().length <= 600)) {
    return { ok: false, error: 'La descripción es muy larga (máximo 600 letras).' }
  }
  if (tieneDescuento && !esEntero_(req.descuento, 0, 90)) {
    return { ok: false, error: 'Descuento inválido (debe ser un número entero entre 0 y 90).' }
  }
  if (tieneActivo && typeof req.activo !== 'boolean') return { ok: false, error: 'Valor de "activo" inválido.' }
  if (stocks.length > 300) return { ok: false, error: 'Demasiados cambios de stock en una sola solicitud.' }
  for (var k = 0; k < stocks.length; k++) {
    var st = stocks[k]
    if (!st || typeof st.sku !== 'string' || !st.sku || !(typeof st.stock === 'number' && st.stock >= 0 && st.stock <= 100000 && st.stock === Math.floor(st.stock))) {
      return { ok: false, error: 'Stock inválido (debe ser un número entero de 0 o más).' }
    }
  }
  if (!tieneNombre && !tieneDescripcion && !tieneCategoria && !tienePrecio && !tieneDescuento && !tieneActivo && stocks.length === 0) return { ok: false, error: 'No hay cambios para guardar.' }

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
    if (tieneNombre) {
      productos.sheet.getRange(filaProd, productos.col['nombre'] + 1).setValue(textoSeguro_(req.nombre.trim()))
      detalle.push('nombre=' + req.nombre.trim())
    }
    if (tieneDescripcion) {
      productos.sheet.getRange(filaProd, productos.col['descripcion'] + 1).setValue(textoSeguro_(req.descripcion.trim()))
      detalle.push('descripcion')
    }
    if (tieneCategoria) {
      productos.sheet.getRange(filaProd, productos.col['categoria'] + 1).setValue(textoSeguro_(req.categoria.trim()))
      detalle.push('categoria=' + req.categoria.trim())
    }
    if (tienePrecio) {
      productos.sheet.getRange(filaProd, productos.col['precio'] + 1).setValue(req.precio)
      detalle.push('precio=' + req.precio)
    }
    if (tieneDescuento) {
      asegurarColumna_(productos, 'descuento')
      productos.sheet.getRange(filaProd, productos.col['descuento'] + 1).setValue(req.descuento)
      detalle.push('descuento=' + req.descuento)
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

// Aplica (o quita, con 0) un descuento a todos los productos de una categoría,
// o a todo el catálogo si no se indica categoría.
// req: { descuento: 0..90, categoria?: string }
function aplicarDescuento_(req) {
  if (!esEntero_(req.descuento, 0, 90)) {
    return { ok: false, error: 'Descuento inválido (debe ser un número entero entre 0 y 90).' }
  }
  var categoria = typeof req.categoria === 'string' ? req.categoria.trim() : ''

  var lock = LockService.getScriptLock()
  lock.waitLock(20000)
  try {
    var productos = leerHoja_('Productos')
    asegurarColumna_(productos, 'descuento')
    var cCat = productos.col['categoria']
    var cDto = productos.col['descuento']
    var cId = productos.col['id']
    var nuevos = []
    var cambiados = 0
    for (var i = 1; i < productos.valores.length; i++) {
      var fila = productos.valores[i]
      var coincide = !categoria || String(fila[cCat]) === categoria
      var actual = fila[cDto]
      nuevos.push([coincide && fila[cId] !== '' ? req.descuento : actual])
      if (coincide && fila[cId] !== '') cambiados++
    }
    if (cambiados === 0) return { ok: false, error: 'No hay productos en esa categoría.' }
    productos.sheet.getRange(2, cDto + 1, nuevos.length, 1).setValues(nuevos)
    registrar_('aplicarDescuento', (categoria || 'TODO EL CATÁLOGO') + ' | descuento=' + req.descuento + ' | ' + cambiados + ' productos')
    CacheService.getScriptCache().remove(CACHE_KEY)
    return { ok: true, productos: cambiados }
  } finally {
    lock.releaseLock()
  }
}

var CLOUDINARY_PREFIJO = 'https://res.cloudinary.com/sa0ainfh/image/upload/'

// Devuelve un mensaje de error, o '' si la lista de fotos es válida.
function validarFotos_(fotos) {
  if (fotos.length > 10) return 'Máximo 10 fotos por producto.'
  for (var f = 0; f < fotos.length; f++) {
    if (typeof fotos[f] !== 'string' || fotos[f].indexOf(CLOUDINARY_PREFIJO) !== 0 || fotos[f].length > 400 || /\s/.test(fotos[f])) {
      return 'Una de las fotos no es válida.'
    }
  }
  return ''
}

// Reemplaza TODAS las fotos de un producto por la lista indicada (en ese orden;
// la primera es la portada). Una lista vacía deja el producto sin fotos.
// req: { id, imagenes: [url de Cloudinary] }
function guardarFotos_(req) {
  var id = typeof req.id === 'string' ? req.id.trim() : ''
  if (!id) return { ok: false, error: 'Falta el id del producto.' }
  if (!Array.isArray(req.imagenes)) return { ok: false, error: 'Falta la lista de fotos.' }
  var errorFotos = validarFotos_(req.imagenes)
  if (errorFotos) return { ok: false, error: errorFotos }

  var lock = LockService.getScriptLock()
  lock.waitLock(20000)
  try {
    var productos = leerHoja_('Productos')
    var filaProd = buscarFila_(productos, 'id', id)
    if (filaProd < 0) return { ok: false, error: 'No se encontró el producto "' + id + '".' }
    var imagenes = leerHoja_('Imagenes')
    var cId = imagenes.col['producto_id']
    if (cId === undefined) return { ok: false, error: 'Falta la columna "producto_id" en Imagenes.' }

    // Todo validado: recién ahora se escribe. Primero se borran las filas viejas
    // (de abajo hacia arriba, para que los números de fila no se corran).
    var filasViejas = []
    for (var i = 1; i < imagenes.valores.length; i++) {
      if (String(imagenes.valores[i][cId]) === id) filasViejas.push(i + 1)
    }
    for (var k = filasViejas.length - 1; k >= 0; k--) imagenes.sheet.deleteRow(filasViejas[k])

    if (req.imagenes.length) {
      var filas = req.imagenes.map(function (u, n) {
        var fila = []
        for (var c = 0; c < imagenes.valores[0].length; c++) {
          var h = String(imagenes.valores[0][c])
          fila.push(h === 'producto_id' ? id : h === 'orden' ? n + 1 : h === 'url' ? u : '')
        }
        return fila
      })
      var primera = imagenes.sheet.getLastRow() + 1
      imagenes.sheet.getRange(primera, 1, filas.length, filas[0].length).setValues(filas)
    }
    // Si el producto usaba la columna "imagen" (formato antiguo), se vacía para que no reaparezca.
    if (productos.col['imagen'] !== undefined) {
      productos.sheet.getRange(filaProd, productos.col['imagen'] + 1).setValue('')
    }

    registrar_('guardarFotos', id + ' | ' + req.imagenes.length + ' fotos (antes ' + filasViejas.length + ')')
    CacheService.getScriptCache().remove(CACHE_KEY)
    return { ok: true }
  } finally {
    lock.releaseLock()
  }
}

function sinTildes_(t) {
  return String(t).normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// Crea un producto nuevo: una fila en Productos, una por cada talla/color en
// Variantes y una por foto en Imagenes. Todo se valida antes de escribir nada.
// req: { ref, nombre, categoria, descripcion?, precio, descuento?, activo?,
//        variantes: [{ color, talla, stock }], imagenes?: [url de Cloudinary] }
function crearProducto_(req) {
  var ref = typeof req.ref === 'string' ? req.ref.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') : ''
  if (!ref || ref.length > 20) return { ok: false, error: 'Referencia inválida (usa letras y números, hasta 20).' }
  var id = 'r' + ref.toLowerCase()

  var nombre = typeof req.nombre === 'string' ? req.nombre.trim() : ''
  var categoria = typeof req.categoria === 'string' ? req.categoria.trim() : ''
  var descripcion = typeof req.descripcion === 'string' ? req.descripcion.trim() : ''
  if (!nombre || nombre.length > 120) return { ok: false, error: 'El nombre es obligatorio (hasta 120 letras).' }
  if (!categoria || categoria.length > 40) return { ok: false, error: 'La categoría es obligatoria (hasta 40 letras).' }
  if (descripcion.length > 600) return { ok: false, error: 'La descripción es muy larga (máximo 600 letras).' }
  if (!esEntero_(req.precio, 1, 99999999)) return { ok: false, error: 'Precio inválido (número entero mayor que 0).' }
  var descuento = req.descuento === undefined || req.descuento === null ? 0 : req.descuento
  if (!esEntero_(descuento, 0, 90)) return { ok: false, error: 'Descuento inválido (número entero entre 0 y 90).' }
  var activo = req.activo === undefined || req.activo === null ? true : req.activo
  if (typeof activo !== 'boolean') return { ok: false, error: 'Valor de "activo" inválido.' }

  var vars = Array.isArray(req.variantes) ? req.variantes : []
  if (vars.length < 1 || vars.length > 100) return { ok: false, error: 'Agrega entre 1 y 100 combinaciones de talla y color.' }
  var vistas = {}
  var variantesOk = []
  for (var i = 0; i < vars.length; i++) {
    var v = vars[i] || {}
    var color = typeof v.color === 'string' ? v.color.trim() : ''
    var talla = typeof v.talla === 'string' ? v.talla.trim() : ''
    if (!color || color.length > 40) return { ok: false, error: 'Cada variante necesita un color (hasta 40 letras).' }
    if (!talla || talla.length > 10) return { ok: false, error: 'Cada variante necesita una talla (hasta 10 caracteres).' }
    if (!esEntero_(v.stock, 0, 100000)) return { ok: false, error: 'Stock inválido (número entero de 0 o más).' }
    var llave = color.toLowerCase() + '|' + talla.toLowerCase()
    if (vistas[llave]) return { ok: false, error: 'La combinación ' + color + ' / ' + talla + ' está repetida.' }
    vistas[llave] = true
    variantesOk.push({ color: color, talla: talla, stock: v.stock })
  }

  var fotos = Array.isArray(req.imagenes) ? req.imagenes : []
  var errorFotos = validarFotos_(fotos)
  if (errorFotos) return { ok: false, error: errorFotos }

  var lock = LockService.getScriptLock()
  lock.waitLock(20000)
  try {
    var productos = leerHoja_('Productos')
    if (buscarFila_(productos, 'id', id) > 0) {
      return { ok: false, error: 'Ya existe un producto con la referencia ' + ref + '.' }
    }
    var variantes = leerHoja_('Variantes')
    var imagenes = fotos.length ? leerHoja_('Imagenes') : null
    asegurarColumna_(productos, 'descuento')

    // SKU único: REF-COL-TALLA (y -2, -3… si ya existiera)
    var usados = {}
    var cSku = variantes.col['sku']
    for (var r = 1; r < variantes.valores.length; r++) usados[String(variantes.valores[r][cSku])] = true
    var filasVar = variantesOk.map(function (x) {
      var abr = sinTildes_(x.color).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3) || 'COL'
      var base = ref + '-' + abr + '-' + x.talla.toUpperCase().replace(/\s+/g, '')
      var sku = base
      var n = 2
      while (usados[sku]) sku = base + '-' + n++
      usados[sku] = true
      return { producto_id: id, sku: sku, talla: textoSeguro_(x.talla), color: textoSeguro_(x.color), stock: x.stock }
    })

    function aFila(hoja, obj) {
      var fila = []
      for (var c = 0; c < hoja.valores[0].length; c++) {
        var h = String(hoja.valores[0][c])
        fila.push(obj[h] === undefined ? '' : obj[h])
      }
      return fila
    }
    function agregar(hoja, objs) {
      var filas = objs.map(function (o) { return aFila(hoja, o) })
      var primera = hoja.sheet.getLastRow() + 1
      hoja.sheet.getRange(primera, 1, filas.length, filas[0].length).setValues(filas)
    }

    // Todo validado: recién ahora se escribe.
    agregar(productos, [{
      id: id,
      nombre: textoSeguro_(nombre),
      categoria: textoSeguro_(categoria),
      descripcion: textoSeguro_(descripcion),
      precio: req.precio,
      imagen: '',
      activo: activo,
      descuento: descuento,
    }])
    agregar(variantes, filasVar)
    if (fotos.length) {
      agregar(imagenes, fotos.map(function (u, k) { return { producto_id: id, orden: k + 1, url: u } }))
    }

    registrar_('crearProducto', id + ' | ' + nombre + ' | precio=' + req.precio + ' | ' + filasVar.length + ' variantes | ' + fotos.length + ' fotos')
    CacheService.getScriptCache().remove(CACHE_KEY)
    return { ok: true, id: id }
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
