// Prueba de Code.gs con los servicios de Google simulados (no toca ningún Sheet real).
// Uso:  node apps-script/prueba_code_gs.cjs
const fs = require('fs')
const vm = require('vm')
const path = require('path')
const assert = require('assert')

const CLAVE = 'clave-secreta-123'
const CLOUD = 'https://res.cloudinary.com/sa0ainfh/image/upload/v1/tezcanela/'

function crearEntorno({ clave = CLAVE, conDescuento = false } = {}) {
  const datos = {
    Productos: [
      ['id', 'nombre', 'categoria', 'descripcion', 'precio', 'imagen', 'activo'].concat(conDescuento ? ['descuento'] : []),
      ['r1', 'Blusa Uno', 'Blusas', 'desc', 100000, '', true].concat(conDescuento ? [0] : []),
      ['r2', 'Vestido Dos', 'Vestidos', 'desc', 200000, '', true].concat(conDescuento ? [0] : []),
      ['r3', 'Vestido Tres', 'Vestidos', 'desc', 300000, '', false].concat(conDescuento ? [0] : []),
    ],
    Variantes: [
      ['producto_id', 'sku', 'talla', 'color', 'stock'],
      ['r1', 'R1-NEG-S', 'S', 'Negro', 3],
      ['r1', 'R1-NEG-M', 'M', 'Negro', 2],
      ['r2', 'R2-ROJ-L', 'L', 'Rojo', 5],
    ],
    Imagenes: [['producto_id', 'orden', 'url'], ['r1', 1, 'http://x/1.jpg']],
  }
  const cacheStore = {}
  const props = clave ? { ADMIN_CLAVE: clave } : {}
  const hoja = (nombre) => ({
    getDataRange: () => ({ getValues: () => datos[nombre].map((f) => f.slice()) }),
    getLastRow: () => datos[nombre].length,
    getRange: (r, c, nr, nc) =>
      nr === undefined
        ? { setValue: (v) => { while (datos[nombre].length < r) datos[nombre].push([]); datos[nombre][r - 1][c - 1] = v } }
        : {
            setValues: (vals) => {
              assert.strictEqual(vals.length, nr)
              vals.forEach((fila, i) => {
                assert.strictEqual(fila.length, nc)
                while (datos[nombre].length < r + i) datos[nombre].push([])
                fila.forEach((v, j) => { datos[nombre][r - 1 + i][c - 1 + j] = v })
              })
            },
          },
    appendRow: (fila) => datos[nombre].push(fila),
    deleteRow: (r) => { datos[nombre].splice(r - 1, 1) },
  })
  const ctx = {
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ({
        getSheetByName: (n) => (datos[n] ? hoja(n) : null),
        insertSheet: (n) => { datos[n] = []; return hoja(n) },
      }),
    },
    CacheService: {
      getScriptCache: () => ({
        get: (k) => (k in cacheStore ? cacheStore[k] : null),
        put: (k, v) => { cacheStore[k] = v },
        remove: (k) => { delete cacheStore[k] },
      }),
    },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] || null }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ContentService: {
      MimeType: { JSON: 'json' },
      createTextOutput: (t) => ({ t, setMimeType() { return this }, getContent: () => t }),
    },
    JSON, Date, Number, String, Array, Math, isFinite, Object, RegExp,
  }
  vm.createContext(ctx)
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'Code.gs'), 'utf8'), ctx)
  const post = (cuerpo) => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(cuerpo) } }).getContent())
  const admin = (accion, datosExtra) => post({ clave: CLAVE, accion, ...datosExtra })
  const get = () => JSON.parse(ctx.doGet({}).getContent())
  const copia = () => JSON.stringify(datos)
  return { datos, cacheStore, post, admin, get, copia }
}

let n = 0
function prueba(nombre, fn) { fn(); n++; console.log('  ok -', nombre) }

const nuevo = (extra = {}) => ({
  ref: '9438', nombre: 'Vestido Sirena', categoria: 'Vestidos', descripcion: 'Largo', precio: 399990,
  variantes: [{ color: 'Verde', talla: 'M', stock: 1 }, { color: 'Verde', talla: 'L', stock: 2 }],
  imagenes: [CLOUD + 'a.jpg', CLOUD + 'b.jpg'], ...extra,
})

// ---- acceso -------------------------------------------------------------
prueba('sin clave configurada en el script → error claro', () => {
  const r = crearEntorno({ clave: null }).post({ clave: 'x', accion: 'verificar' })
  assert.strictEqual(r.ok, false); assert.match(r.error, /ADMIN_CLAVE/)
})
prueba('clave incorrecta se rechaza y NO crea ni cambia nada', () => {
  const t = crearEntorno(); const antes = t.copia()
  const r = t.post({ clave: 'mala', accion: 'crearProducto', ...nuevo() })
  assert.strictEqual(r.claveIncorrecta, true); assert.strictEqual(t.copia(), antes)
})
prueba('se bloquea tras 5 intentos fallidos', () => {
  const t = crearEntorno()
  for (let i = 0; i < 5; i++) t.post({ clave: 'x' + i, accion: 'verificar' })
  assert.strictEqual(t.admin('verificar').bloqueado, true)
})

// ---- datos públicos -----------------------------------------------------
prueba('doGet entrega descuento (0 si la hoja aún no tiene la columna)', () => {
  const t = crearEntorno()
  assert.strictEqual(t.get().productos[0].descuento, 0)
  const t2 = crearEntorno({ conDescuento: true })
  t2.datos.Productos[1][7] = 25
  assert.strictEqual(t2.get().productos[0].descuento, 25)
})

// ---- descuento por producto --------------------------------------------
prueba('guardarProducto con descuento crea la columna si falta y guarda el valor', () => {
  const t = crearEntorno()
  assert.strictEqual(t.admin('guardarProducto', { id: 'r1', descuento: 20 }).ok, true)
  assert.strictEqual(t.datos.Productos[0][7], 'descuento')
  assert.strictEqual(t.datos.Productos[1][7], 20)
  assert.strictEqual(t.get().productos.find((p) => p.id === 'r1').descuento, 20)
  assert.strictEqual(t.get().productos.find((p) => p.id === 'r2').descuento, 0)
  assert.match(t.datos.Registro[1][2], /descuento=20/)
})
prueba('guardarProducto rechaza descuentos inválidos', () => {
  const t = crearEntorno(); const antes = t.copia()
  for (const d of [-1, 91, 10.5, '10', NaN, true]) {
    assert.strictEqual(t.admin('guardarProducto', { id: 'r1', descuento: d }).ok, false, 'debía rechazar ' + d)
  }
  assert.strictEqual(t.copia(), antes)
})
prueba('descuento 0 quita el descuento', () => {
  const t = crearEntorno({ conDescuento: true }); t.datos.Productos[1][7] = 30
  assert.strictEqual(t.admin('guardarProducto', { id: 'r1', descuento: 0 }).ok, true)
  assert.strictEqual(t.datos.Productos[1][7], 0)
})

// ---- descuento por categoría -------------------------------------------
prueba('aplicarDescuento a una categoría solo toca esa categoría', () => {
  const t = crearEntorno({ conDescuento: true })
  const r = t.admin('aplicarDescuento', { descuento: 15, categoria: 'Vestidos' })
  assert.strictEqual(r.ok, true); assert.strictEqual(r.productos, 2)
  assert.deepStrictEqual(t.datos.Productos.slice(1).map((f) => f[7]), [0, 15, 15])
  assert.match(t.datos.Registro[1][2], /Vestidos \| descuento=15 \| 2 productos/)
})
prueba('aplicarDescuento sin categoría = todo el catálogo; con 0 lo quita', () => {
  const t = crearEntorno()
  assert.strictEqual(t.admin('aplicarDescuento', { descuento: 10 }).productos, 3)
  assert.deepStrictEqual(t.datos.Productos.slice(1).map((f) => f[7]), [10, 10, 10])
  t.admin('aplicarDescuento', { descuento: 0 })
  assert.deepStrictEqual(t.datos.Productos.slice(1).map((f) => f[7]), [0, 0, 0])
})
prueba('aplicarDescuento: categoría inexistente o porcentaje inválido no cambian nada', () => {
  const t = crearEntorno({ conDescuento: true }); const antes = t.copia()
  assert.strictEqual(t.admin('aplicarDescuento', { descuento: 10, categoria: 'Zapatos' }).ok, false)
  assert.strictEqual(t.admin('aplicarDescuento', { descuento: 95 }).ok, false)
  assert.strictEqual(t.admin('aplicarDescuento', { descuento: '10' }).ok, false)
  assert.strictEqual(t.copia(), antes)
})

// ---- crear producto ------------------------------------------------------
prueba('crearProducto escribe Productos, Variantes e Imagenes y se ve en doGet', () => {
  const t = crearEntorno()
  t.get() // llena la caché
  const r = t.admin('crearProducto', nuevo({ descuento: 10 }))
  assert.deepStrictEqual(r, { ok: true, id: 'r9438' })
  assert.ok(!t.cacheStore['catalogo_json_v1'], 'la caché debe quedar vacía')
  const fp = t.datos.Productos[4]
  assert.deepStrictEqual(fp.slice(0, 8), ['r9438', 'Vestido Sirena', 'Vestidos', 'Largo', 399990, '', true, 10])
  assert.deepStrictEqual(t.datos.Variantes.slice(4), [['r9438', '9438-VER-M', 'M', 'Verde', 1], ['r9438', '9438-VER-L', 'L', 'Verde', 2]])
  assert.deepStrictEqual(t.datos.Imagenes.slice(2), [['r9438', 1, CLOUD + 'a.jpg'], ['r9438', 2, CLOUD + 'b.jpg']])
  const pub = t.get()
  const p = pub.productos.find((x) => x.id === 'r9438')
  assert.deepStrictEqual(p.imagenes, [CLOUD + 'a.jpg', CLOUD + 'b.jpg'])
  assert.strictEqual(p.descuento, 10); assert.strictEqual(p.activo, true)
  assert.strictEqual(pub.variantes.filter((v) => v.producto_id === 'r9438').length, 2)
  assert.match(t.datos.Registro[1][2], /r9438 \| Vestido Sirena \| precio=399990 \| 2 variantes \| 2 fotos/)
})
prueba('crearProducto: la referencia se normaliza (mayúsculas, sin símbolos) y activo/descuento tienen valores por defecto', () => {
  const t = crearEntorno({ conDescuento: true })
  const r = t.admin('crearProducto', nuevo({ ref: ' cd-216.34 ', activo: false }))
  assert.strictEqual(r.id, 'rcd21634')
  assert.strictEqual(t.datos.Productos[4][6], false); assert.strictEqual(t.datos.Productos[4][7], 0)
  assert.strictEqual(t.datos.Variantes[4][1], 'CD21634-VER-M')
})
prueba('crearProducto: sin fotos no toca Imagenes; el SKU quita tildes y no se repite', () => {
  const t = crearEntorno(); const imgAntes = JSON.stringify(t.datos.Imagenes)
  const r = t.admin('crearProducto', nuevo({ ref: '1', imagenes: [], variantes: [{ color: 'Negro', talla: 'S', stock: 1 }, { color: 'Café', talla: 'S', stock: 1 }, { color: 'Cafetal', talla: 'S', stock: 1 }] }))
  assert.strictEqual(r.ok, false); assert.match(r.error, /Ya existe/) // r1 ya existe
  const r2 = t.admin('crearProducto', nuevo({ ref: 'X1', imagenes: [], variantes: [{ color: 'Café', talla: 's', stock: 1 }, { color: 'Cafetal', talla: 'S', stock: 1 }] }))
  assert.strictEqual(r2.ok, true)
  assert.deepStrictEqual(t.datos.Variantes.slice(4).map((f) => f[1]), ['X1-CAF-S', 'X1-CAF-S-2'])
  assert.strictEqual(JSON.stringify(t.datos.Imagenes), imgAntes)
})
prueba('crearProducto: rechaza referencia repetida, aunque cambien mayúsculas', () => {
  const t = crearEntorno(); t.admin('crearProducto', nuevo()); const antes = t.copia()
  const r = t.admin('crearProducto', nuevo({ ref: '9438' }))
  assert.strictEqual(r.ok, false); assert.match(r.error, /Ya existe/); assert.strictEqual(t.copia(), antes)
})
prueba('crearProducto: datos inválidos no dejan NADA escrito', () => {
  const t = crearEntorno(); const antes = t.copia()
  const malos = [
    { ref: '' }, { ref: '###' }, { ref: 'A'.repeat(21) }, { nombre: '' }, { nombre: 'x'.repeat(121) },
    { categoria: '' }, { descripcion: 'x'.repeat(601) }, { precio: 0 }, { precio: -5 }, { precio: 1.5 }, { precio: '100' },
    { descuento: 91 }, { descuento: '5' }, { activo: 'si' },
    { variantes: [] }, { variantes: 'x' },
    { variantes: [{ color: '', talla: 'S', stock: 1 }] }, { variantes: [{ color: 'Rojo', talla: '', stock: 1 }] },
    { variantes: [{ color: 'Rojo', talla: 'S', stock: -1 }] }, { variantes: [{ color: 'Rojo', talla: 'S', stock: 1.5 }] },
    { variantes: [{ color: 'Rojo', talla: 'S', stock: 1 }, { color: 'ROJO', talla: 's', stock: 2 }] },
    { variantes: Array.from({ length: 101 }, (_, i) => ({ color: 'C' + i, talla: 'S', stock: 1 })) },
    { imagenes: ['https://evil.example.com/a.jpg'] }, { imagenes: ['http://res.cloudinary.com/sa0ainfh/image/upload/a.jpg'] },
    { imagenes: ['https://res.cloudinary.com/otra/image/upload/a.jpg'] }, { imagenes: [CLOUD + 'con espacio.jpg'] },
    { imagenes: Array.from({ length: 11 }, (_, i) => CLOUD + i + '.jpg') }, { imagenes: [5] },
  ]
  for (const m of malos) {
    const r = t.admin('crearProducto', nuevo(m))
    assert.strictEqual(r.ok, false, 'debía rechazar ' + JSON.stringify(m).slice(0, 80))
  }
  assert.strictEqual(t.copia(), antes)
})
prueba('crearProducto: los textos que parecen fórmula se guardan como texto', () => {
  const t = crearEntorno()
  t.admin('crearProducto', nuevo({ ref: 'F1', nombre: '=HYPERLINK("http://x")', descripcion: '+cmd', categoria: '@x', variantes: [{ color: '-1', talla: '=1', stock: 1 }] }))
  const f = t.datos.Productos[4]
  assert.ok(f[1].startsWith("'=") && f[3].startsWith("'+") && f[2].startsWith("'@"))
  assert.ok(t.datos.Variantes[4][3].startsWith("'-") && t.datos.Variantes[4][2].startsWith("'="))
})
prueba('crearProducto respeta el orden de columnas de la hoja (aunque esté reordenada)', () => {
  const t = crearEntorno()
  t.datos.Productos = t.datos.Productos.map((f) => f.slice().reverse())
  t.datos.Productos.forEach((f) => {})
  const r = t.admin('crearProducto', nuevo())
  assert.strictEqual(r.ok, true)
  const enc = t.datos.Productos[0]
  const fila = t.datos.Productos[4]
  assert.strictEqual(fila[enc.indexOf('id')], 'r9438'); assert.strictEqual(fila[enc.indexOf('precio')], 399990)
})

// ---- lo que ya existía sigue igual ---------------------------------------
prueba('guardarProducto: precio, activo y stock; todo o nada; no toca variantes de otro producto', () => {
  const t = crearEntorno()
  assert.strictEqual(t.admin('guardarProducto', { id: 'r1', precio: 120000, activo: false, stocks: [{ sku: 'R1-NEG-S', stock: 0 }, { sku: 'R1-NEG-M', stock: 7 }] }).ok, true)
  assert.strictEqual(t.datos.Productos[1][4], 120000); assert.strictEqual(t.datos.Variantes[2][4], 7); assert.strictEqual(t.datos.Variantes[3][4], 5)
  const antes = t.copia()
  assert.strictEqual(t.admin('guardarProducto', { id: 'r1', precio: 5, stocks: [{ sku: 'R1-NEG-S', stock: 9 }, { sku: 'NO-EXISTE', stock: 1 }] }).ok, false)
  assert.strictEqual(t.admin('guardarProducto', { id: 'r1', stocks: [{ sku: 'R2-ROJ-L', stock: 1 }] }).ok, false)
  assert.strictEqual(t.copia(), antes)
})

// ---- editar nombre, descripción y categoría -----------------------------
prueba('guardarProducto cambia nombre, descripción y categoría (y deja bitácora)', () => {
  const t = crearEntorno(); t.get()
  const r = t.admin('guardarProducto', { id: 'r1', nombre: '  Blusa Nueva  ', descripcion: 'Tela suave', categoria: 'Tops' })
  assert.strictEqual(r.ok, true)
  assert.deepStrictEqual(t.datos.Productos[1].slice(1, 4), ['Blusa Nueva', 'Tops', 'Tela suave'])
  assert.strictEqual(t.datos.Productos[2][1], 'Vestido Dos') // otro producto intacto
  assert.ok(!t.cacheStore['catalogo_json_v1'])
  assert.match(t.datos.Registro[1][2], /nombre=Blusa Nueva, descripcion, categoria=Tops/)
  const p = t.get().productos.find((x) => x.id === 'r1')
  assert.strictEqual(p.nombre, 'Blusa Nueva'); assert.strictEqual(p.descripcion, 'Tela suave')
})
prueba('guardarProducto permite dejar la descripción vacía, pero no el nombre ni la categoría', () => {
  const t = crearEntorno()
  assert.strictEqual(t.admin('guardarProducto', { id: 'r1', descripcion: '' }).ok, true)
  assert.strictEqual(t.datos.Productos[1][3], '')
  const antes = t.copia()
  for (const mal of [{ nombre: '' }, { nombre: '   ' }, { nombre: 'x'.repeat(121) }, { nombre: 5 }, { categoria: '' }, { categoria: 'x'.repeat(41) }, { descripcion: 'x'.repeat(601) }, { descripcion: 5 }]) {
    assert.strictEqual(t.admin('guardarProducto', { id: 'r1', ...mal }).ok, false, 'debía rechazar ' + JSON.stringify(mal).slice(0, 40))
  }
  assert.strictEqual(t.copia(), antes)
})
prueba('guardarProducto: nombre inválido no deja cambios a medias aunque el precio sea válido', () => {
  const t = crearEntorno(); const antes = t.copia()
  assert.strictEqual(t.admin('guardarProducto', { id: 'r1', precio: 5, nombre: '' }).ok, false)
  assert.strictEqual(t.copia(), antes)
})
prueba('guardarProducto: textos que parecen fórmula se guardan como texto', () => {
  const t = crearEntorno()
  t.admin('guardarProducto', { id: 'r1', nombre: '=1+1', descripcion: '@x' })
  assert.strictEqual(t.datos.Productos[1][1], "'=1+1"); assert.strictEqual(t.datos.Productos[1][3], "'@x")
})

// ---- fotos de un producto existente -------------------------------------
prueba('guardarFotos reemplaza todas las fotos del producto, en orden, sin tocar las de otros', () => {
  const t = crearEntorno()
  t.datos.Imagenes.push(['r2', 1, 'http://x/dos.jpg'], ['r1', 2, 'http://x/2.jpg'])
  t.get()
  const nuevas = [CLOUD + 'z.jpg', CLOUD + 'y.jpg', CLOUD + 'x.jpg']
  assert.strictEqual(t.admin('guardarFotos', { id: 'r1', imagenes: nuevas }).ok, true)
  assert.deepStrictEqual(t.datos.Imagenes.filter((f) => f[0] === 'r1'), [['r1', 1, nuevas[0]], ['r1', 2, nuevas[1]], ['r1', 3, nuevas[2]]])
  assert.deepStrictEqual(t.datos.Imagenes.filter((f) => f[0] === 'r2'), [['r2', 1, 'http://x/dos.jpg']])
  assert.ok(!t.cacheStore['catalogo_json_v1'])
  assert.match(t.datos.Registro[1][2], /r1 \| 3 fotos \(antes 2\)/)
  assert.deepStrictEqual(t.get().productos.find((p) => p.id === 'r1').imagenes, nuevas)
})
prueba('guardarFotos: una lista vacía deja el producto sin fotos; y vacía la columna "imagen" antigua', () => {
  const t = crearEntorno(); t.datos.Productos[1][5] = 'http://viejo/foto.jpg'
  assert.strictEqual(t.admin('guardarFotos', { id: 'r1', imagenes: [] }).ok, true)
  assert.deepStrictEqual(t.get().productos.find((p) => p.id === 'r1').imagenes, [])
  assert.strictEqual(t.datos.Productos[1][5], '')
})
prueba('guardarFotos: agrega fotos a un producto que no tenía ninguna', () => {
  const t = crearEntorno()
  assert.strictEqual(t.admin('guardarFotos', { id: 'r2', imagenes: [CLOUD + 'n.jpg'] }).ok, true)
  assert.deepStrictEqual(t.datos.Imagenes.filter((f) => f[0] === 'r2'), [['r2', 1, CLOUD + 'n.jpg']])
})
prueba('guardarFotos: datos inválidos o producto inexistente no cambian nada', () => {
  const t = crearEntorno(); const antes = t.copia()
  const casos = [
    { id: 'r1', imagenes: ['https://evil.example.com/a.jpg'] }, { id: 'r1', imagenes: [CLOUD + 'con espacio.jpg'] },
    { id: 'r1', imagenes: Array.from({ length: 11 }, (_, i) => CLOUD + i + '.jpg') }, { id: 'r1', imagenes: 'x' }, { id: 'r1' },
    { id: 'NO-EXISTE', imagenes: [CLOUD + 'a.jpg'] }, { imagenes: [CLOUD + 'a.jpg'] },
  ]
  for (const c of casos) assert.strictEqual(t.admin('guardarFotos', c).ok, false, 'debía rechazar ' + JSON.stringify(c).slice(0, 60))
  assert.strictEqual(t.copia(), antes)
})
prueba('guardarFotos exige la clave', () => {
  const t = crearEntorno(); const antes = t.copia()
  assert.strictEqual(t.post({ clave: 'mala', accion: 'guardarFotos', id: 'r1', imagenes: [] }).claveIncorrecta, true)
  assert.strictEqual(t.copia(), antes)
})

console.log(`\n${n} pruebas pasaron.`)
