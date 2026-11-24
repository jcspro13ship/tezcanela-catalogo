import { useEffect, useMemo, useState } from 'react'
import { useCatalogo, variantesDe } from '../context/CatalogoContext'
import { formatoPrecio, porcentajeDescuento, precioFinal } from '../utils/precios'
import { llamarAdmin } from '../admin/api'
import { conAncho } from '../utils/imagenUrl'
import BotonCompartir from '../components/BotonCompartir'
import NuevoProducto from './NuevoProducto'
import EditorFotos from './EditorFotos'
import { subirPendientes } from '../admin/fotos'

const CLAVE_SS = 'tc_admin_clave'
const POR_PAGINA = 30

function leerClaveGuardada() {
  try {
    return sessionStorage.getItem(CLAVE_SS) || ''
  } catch {
    return ''
  }
}
function guardarClave(valor) {
  try {
    if (valor) sessionStorage.setItem(CLAVE_SS, valor)
    else sessionStorage.removeItem(CLAVE_SS)
  } catch {
    /* sin almacenamiento: se pedirá la clave de nuevo al recargar */
  }
}

export default function Admin() {
  const [clave, setClave] = useState(leerClaveGuardada)
  const [fase, setFase] = useState(() => (leerClaveGuardada() ? 'verificando' : 'login'))
  const [error, setError] = useState('')

  // Que Google no indexe esta página.
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex'
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])

  async function verificar(claveProbar) {
    setFase('verificando')
    const r = await llamarAdmin(claveProbar, 'verificar')
    if (r.ok) {
      guardarClave(claveProbar)
      setClave(claveProbar)
      setError('')
      setFase('panel')
    } else {
      guardarClave('')
      setClave('')
      setError(r.error || 'No se pudo entrar.')
      setFase('login')
    }
  }

  useEffect(() => {
    if (fase === 'verificando' && clave) verificar(clave)
    // solo al montar: revalida la clave de la sesión
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function salir(mensaje = '') {
    guardarClave('')
    setClave('')
    setError(mensaje)
    setFase('login')
  }

  if (fase === 'verificando') return <p className="admin-estado">Verificando…</p>
  if (fase === 'login') return <Login onEntrar={verificar} error={error} />
  return <Panel clave={clave} onSalir={salir} />
}

function Login({ onEntrar, error }) {
  const [valor, setValor] = useState('')
  return (
    <form
      className="admin-login"
      onSubmit={(e) => {
        e.preventDefault()
        if (valor) onEntrar(valor)
      }}
    >
      <h1>Administración</h1>
      <p>Ingresa la clave para ajustar inventario y productos.</p>
      <input
        type="password"
        autoComplete="current-password"
        placeholder="Clave"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        autoFocus
      />
      {error && <p className="checkout-error">{error}</p>}
      <button className="boton boton-primario" type="submit" disabled={!valor}>
        Entrar
      </button>
    </form>
  )
}

function Panel({ clave, onSalir }) {
  const { productos, variantes, cargando, recargar } = useCatalogo()
  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState('todos')
  const [visibles, setVisibles] = useState(POR_PAGINA)
  const [herramienta, setHerramienta] = useState(null) // null | 'nuevo' | 'descuentos'

  const categorias = useMemo(() => [...new Set(productos.map((p) => p.categoria))].sort(), [productos])

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return productos.filter((p) => {
      if (estado === 'activos' && !p.activo) return false
      if (estado === 'inactivos' && p.activo) return false
      if (!q) return true
      return p.nombre.toLowerCase().includes(q) || p.id.toLowerCase().includes(q.replace(/^ref\s*/, 'r'))
    })
  }, [productos, busqueda, estado])

  useEffect(() => setVisibles(POR_PAGINA), [busqueda, estado])

  const activos = productos.filter((p) => p.activo).length
  const conDescuento = productos.filter((p) => porcentajeDescuento(p) > 0).length

  return (
    <div className="admin">
      <div className="admin-barra">
        <div>
          <h1>Administración</h1>
          <p className="admin-resumen">
            {productos.length} productos · {activos} visibles · {productos.length - activos} ocultos
            {conDescuento > 0 && ` · ${conDescuento} con descuento`}
          </p>
        </div>
        <button className="boton boton-secundario" onClick={() => onSalir()}>
          Salir
        </button>
      </div>

      <div className="admin-herramientas">
        <button
          className={`chip ${herramienta === 'nuevo' ? 'chip-activo' : ''}`}
          onClick={() => setHerramienta((h) => (h === 'nuevo' ? null : 'nuevo'))}
        >
          + Nuevo producto
        </button>
        <button
          className={`chip ${herramienta === 'descuentos' ? 'chip-activo' : ''}`}
          onClick={() => setHerramienta((h) => (h === 'descuentos' ? null : 'descuentos'))}
        >
          Descuentos por categoría
        </button>
      </div>

      {herramienta === 'nuevo' && (
        <NuevoProducto
          clave={clave}
          productos={productos}
          categorias={categorias}
          recargar={recargar}
          onSalir={onSalir}
          onCerrar={() => setHerramienta(null)}
        />
      )}
      {herramienta === 'descuentos' && (
        <DescuentosPorCategoria clave={clave} productos={productos} categorias={categorias} recargar={recargar} onSalir={onSalir} />
      )}

      <div className="admin-filtros">
        <input
          type="text"
          className="catalogo-buscador"
          placeholder="Buscar por nombre o referencia…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <div className="catalogo-categorias">
          {[
            ['todos', 'Todos'],
            ['activos', 'Visibles'],
            ['inactivos', 'Ocultos'],
          ].map(([valor, texto]) => (
            <button
              key={valor}
              className={`chip ${estado === valor ? 'chip-activo' : ''}`}
              onClick={() => setEstado(valor)}
            >
              {texto}
            </button>
          ))}
        </div>
      </div>

      {cargando ? (
        <p className="admin-estado">Cargando catálogo…</p>
      ) : filtrados.length === 0 ? (
        <p className="admin-estado">No hay productos con ese filtro.</p>
      ) : (
        <>
          {filtrados.slice(0, visibles).map((p) => (
            <ProductoFila
              key={p.id}
              producto={p}
              categorias={categorias}
              variantes={variantesDe(variantes, p.id)}
              clave={clave}
              recargar={recargar}
              onSalir={onSalir}
            />
          ))}
          {visibles < filtrados.length && (
            <div className="catalogo-cargar-mas">
              <button className="boton boton-secundario" onClick={() => setVisibles((v) => v + POR_PAGINA)}>
                Mostrar más ({filtrados.length - visibles} restantes)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

const OTRA = '__otra__'
const entero = (t) => /^\d+$/.test(String(t).trim())
const descuentoValido = (t) => entero(t) && Number(t) <= 90

function DescuentosPorCategoria({ clave, productos, categorias, recargar, onSalir }) {
  const [categoria, setCategoria] = useState('')
  const [porcentaje, setPorcentaje] = useState('')
  const [trabajando, setTrabajando] = useState(false)
  const [mensaje, setMensaje] = useState(null)

  const afectados = productos.filter((p) => !categoria || p.categoria === categoria).length
  const donde = categoria ? `la categoría ${categoria}` : 'TODO el catálogo'

  async function aplicar(valor) {
    const texto =
      valor === 0
        ? `¿Quitar el descuento a ${afectados} productos de ${donde}?`
        : `¿Aplicar ${valor}% de descuento a ${afectados} productos de ${donde}? Reemplaza el descuento que tengan ahora.`
    if (!window.confirm(texto)) return
    setTrabajando(true)
    setMensaje(null)
    const r = await llamarAdmin(clave, 'aplicarDescuento', { descuento: valor, ...(categoria ? { categoria } : {}) })
    if (!r.ok) {
      setTrabajando(false)
      if (r.claveIncorrecta || r.bloqueado) return onSalir(r.error)
      return setMensaje({ tipo: 'error', texto: r.error || 'No se pudo aplicar.' })
    }
    try {
      await recargar()
      setMensaje({ tipo: 'ok', texto: valor === 0 ? `Descuento quitado en ${r.productos} productos.` : `${valor}% aplicado a ${r.productos} productos.` })
    } catch {
      setMensaje({ tipo: 'ok', texto: 'Listo (recarga la página para verlo).' })
    }
    setTrabajando(false)
  }

  return (
    <div className="admin-nuevo">
      <h2>Descuentos por categoría</h2>
      <p className="admin-ayuda">
        Para un solo producto, usa «Editar» en su fila. Aquí puedes poner el mismo descuento a toda una categoría (o a todo el catálogo) de una vez.
      </p>
      <div className="admin-grid2">
        <label className="admin-campo">
          ¿A qué productos?
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)} disabled={trabajando}>
            <option value="">Todo el catálogo</option>
            {categorias.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-campo">
          Descuento (%)
          <input inputMode="numeric" value={porcentaje} onChange={(e) => setPorcentaje(e.target.value)} placeholder="Ej: 20" disabled={trabajando} className={!porcentaje || descuentoValido(porcentaje) ? '' : 'admin-invalido'} />
        </label>
      </div>
      <div className="admin-acciones">
        <button className="chip" onClick={() => aplicar(0)} disabled={trabajando || afectados === 0}>
          Quitar descuentos
        </button>
        <button className="boton boton-primario" onClick={() => aplicar(Number(porcentaje))} disabled={trabajando || !descuentoValido(porcentaje) || Number(porcentaje) < 1 || afectados === 0}>
          {trabajando ? 'Aplicando…' : `Aplicar a ${afectados} productos`}
        </button>
      </div>
      {mensaje && <p className={mensaje.tipo === 'ok' ? 'admin-ok' : 'checkout-error'}>{mensaje.texto}</p>}
    </div>
  )
}

function ProductoFila({ producto, categorias, variantes, clave, recargar, onSalir }) {
  const [abierto, setAbierto] = useState(false)
  const [precio, setPrecio] = useState(String(producto.precio))
  const [descuento, setDescuento] = useState(String(porcentajeDescuento(producto)))
  const [nombre, setNombre] = useState(producto.nombre)
  const [descripcion, setDescripcion] = useState(producto.descripcion || '')
  const [categoria, setCategoria] = useState(producto.categoria)
  const [categoriaNueva, setCategoriaNueva] = useState('')
  const [fotos, setFotos] = useState(() =>
    producto.imagenes.map((url, i) => ({ key: `${url}-${i}`, url, vista: conAncho(url, 300) }))
  )
  const [subiendo, setSubiendo] = useState('')
  const [stocks, setStocks] = useState(() => Object.fromEntries(variantes.map((v) => [v.sku, String(v.stock)])))
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)

  const stockTotal = variantes.reduce((a, v) => a + v.stock, 0)
  const precioCambio = precio.trim() !== String(producto.precio)
  const descuentoActual = porcentajeDescuento(producto)
  const descuentoCambio = descuento.trim() !== String(descuentoActual)
  const categoriaFinal = categoria === OTRA ? categoriaNueva.trim() : categoria
  const nombreCambio = nombre.trim() !== producto.nombre
  const descripcionCambio = descripcion.trim() !== (producto.descripcion || '').trim()
  const categoriaCambio = categoriaFinal !== producto.categoria
  const fotosCambiaron =
    fotos.length !== producto.imagenes.length || fotos.some((f, i) => f.url !== producto.imagenes[i])
  const stocksCambiados = variantes.filter((v) => (stocks[v.sku] ?? String(v.stock)).trim() !== String(v.stock))
  const hayCambios = precioCambio || descuentoCambio || nombreCambio || descripcionCambio || categoriaCambio || stocksCambiados.length > 0
  const valido =
    entero(precio) &&
    descuentoValido(descuento) &&
    nombre.trim().length > 0 &&
    nombre.trim().length <= 120 &&
    categoriaFinal.length > 0 &&
    descripcion.trim().length <= 600 &&
    variantes.every((v) => entero(stocks[v.sku] ?? v.stock))

  async function enviar(cambios, textoOk) {
    setGuardando(true)
    setMensaje(null)
    const r = await llamarAdmin(clave, 'guardarProducto', { id: producto.id, ...cambios })
    if (!r.ok) {
      setGuardando(false)
      if (r.claveIncorrecta || r.bloqueado) return onSalir(r.error)
      return setMensaje({ tipo: 'error', texto: r.error || 'No se pudo guardar.' })
    }
    try {
      await recargar()
      setMensaje({ tipo: 'ok', texto: textoOk })
    } catch {
      setMensaje({ tipo: 'ok', texto: `${textoOk} (recarga la página para verlo)` })
    }
    setGuardando(false)
  }

  const guardar = () =>
    enviar(
      {
        ...(nombreCambio ? { nombre: nombre.trim() } : {}),
        ...(descripcionCambio ? { descripcion: descripcion.trim() } : {}),
        ...(categoriaCambio ? { categoria: categoriaFinal } : {}),
        ...(precioCambio ? { precio: Number(precio) } : {}),
        ...(descuentoCambio ? { descuento: Number(descuento) } : {}),
        ...(stocksCambiados.length
          ? { stocks: stocksCambiados.map((v) => ({ sku: v.sku, stock: Number(stocks[v.sku]) })) }
          : {}),
      },
      'Cambios guardados'
    )

  async function guardarFotos() {
    setGuardando(true)
    setMensaje(null)
    let urls
    try {
      urls = await subirPendientes(
        fotos,
        producto.id,
        setSubiendo,
        (key, url) => setFotos((f) => f.map((x) => (x.key === key ? { ...x, url } : x)))
      )
    } catch {
      setSubiendo('')
      setGuardando(false)
      return setMensaje({ tipo: 'error', texto: 'No se pudo subir una foto. Revisa tu conexión e inténtalo de nuevo (las que ya subieron no se repiten).' })
    }
    setSubiendo('Guardando…')
    const r = await llamarAdmin(clave, 'guardarFotos', { id: producto.id, imagenes: urls })
    setSubiendo('')
    if (!r.ok) {
      setGuardando(false)
      if (r.claveIncorrecta || r.bloqueado) return onSalir(r.error)
      return setMensaje({ tipo: 'error', texto: r.error || 'No se pudieron guardar las fotos.' })
    }
    try {
      await recargar()
      setMensaje({ tipo: 'ok', texto: 'Fotos guardadas' })
    } catch {
      setMensaje({ tipo: 'ok', texto: 'Fotos guardadas (recarga la página para verlas)' })
    }
    setGuardando(false)
  }

  const cambiarActivo = () =>
    enviar({ activo: !producto.activo }, producto.activo ? 'Producto oculto del catálogo' : 'Producto visible en el catálogo')

  const portada = producto.imagenes[0]

  return (
    <div className={`admin-fila ${producto.activo ? '' : 'admin-fila-oculta'}`}>
      <div className="admin-fila-cab">
        {portada ? <img src={conAncho(portada, 150)} alt="" loading="lazy" /> : <div className="admin-sinfoto" />}
        <div className="admin-fila-info">
          <p className="admin-fila-nombre">{producto.nombre}</p>
          <p className="admin-fila-meta">
            {producto.id} · {producto.categoria} ·{' '}
            {descuentoActual > 0 ? (
              <>
                <strong>{formatoPrecio(precioFinal(producto))}</strong> <s>{formatoPrecio(producto.precio)}</s> (-{descuentoActual}%)
              </>
            ) : (
              formatoPrecio(producto.precio)
            )}{' '}
            ·{' '}
            {stockTotal === 0 ? <strong>Agotado</strong> : `${stockTotal} en stock`}
          </p>
        </div>
        <label className="admin-switch" title={producto.activo ? 'Visible en el catálogo' : 'Oculto del catálogo'}>
          <input type="checkbox" checked={producto.activo} disabled={guardando} onChange={cambiarActivo} />
          <span>{producto.activo ? 'Visible' : 'Oculto'}</span>
        </label>
        <BotonCompartir producto={producto} className="chip" />
        <button className="chip" onClick={() => setAbierto((a) => !a)}>
          {abierto ? 'Cerrar' : 'Editar'}
        </button>
      </div>

      {abierto && (
        <div className="admin-detalle">
          <label className="admin-campo">
            Nombre
            <input value={nombre} maxLength={120} onChange={(e) => setNombre(e.target.value)} className={nombre.trim() ? '' : 'admin-invalido'} />
          </label>
          <div className="admin-grid2">
            <label className="admin-campo">
              Categoría
              <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                {categorias.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                <option value={OTRA}>Otra categoría…</option>
              </select>
              {categoria === OTRA && (
                <input value={categoriaNueva} onChange={(e) => setCategoriaNueva(e.target.value)} placeholder="Nombre de la categoría (en plural)" />
              )}
            </label>
          </div>
          <label className="admin-campo">
            Descripción
            <textarea rows={3} value={descripcion} maxLength={600} onChange={(e) => setDescripcion(e.target.value)} />
          </label>
          <div className="admin-grid2">
            <label className="admin-campo">
              Precio (COP)
              <input
                inputMode="numeric"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                className={entero(precio) ? '' : 'admin-invalido'}
              />
            </label>
            <label className="admin-campo">
              Descuento (%) — 0 para quitarlo
              <input
                inputMode="numeric"
                value={descuento}
                onChange={(e) => setDescuento(e.target.value)}
                className={descuentoValido(descuento) ? '' : 'admin-invalido'}
              />
              {descuentoValido(descuento) && entero(precio) && Number(descuento) > 0 && (
                <small>Se venderá en {formatoPrecio(precioFinal({ precio: Number(precio), descuento: Number(descuento) }))}</small>
              )}
            </label>
          </div>

          <table className="admin-variantes">
            <thead>
              <tr>
                <th>Color</th>
                <th>Talla</th>
                <th>Stock</th>
              </tr>
            </thead>
            <tbody>
              {variantes.map((v) => (
                <tr key={v.sku}>
                  <td>{v.color}</td>
                  <td>{v.talla}</td>
                  <td>
                    <input
                      inputMode="numeric"
                      value={stocks[v.sku] ?? String(v.stock)}
                      onChange={(e) => setStocks((s) => ({ ...s, [v.sku]: e.target.value }))}
                      className={entero(stocks[v.sku] ?? v.stock) ? '' : 'admin-invalido'}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="admin-acciones">
            <button
              className="chip"
              onClick={() => setStocks(Object.fromEntries(variantes.map((v) => [v.sku, '0'])))}
              disabled={guardando}
            >
              Poner todo en 0 (agotar)
            </button>
            <button className="boton boton-primario" onClick={guardar} disabled={!hayCambios || !valido || guardando}>
              {guardando ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>

          <div className="admin-seccion">
            <h3>Fotos</h3>
            <p className="admin-ayuda">La primera es la que se ve en el catálogo. Puedes agregar, quitar y reordenar; hasta 10 fotos.</p>
            <EditorFotos fotos={fotos} setFotos={setFotos} bloqueado={guardando} />
            {subiendo && <p className="admin-estado">{subiendo}</p>}
            <div className="admin-acciones">
              <button className="boton boton-primario" onClick={guardarFotos} disabled={!fotosCambiaron || guardando}>
                {guardando && subiendo ? 'Guardando fotos…' : 'Guardar fotos'}
              </button>
            </div>
          </div>
        </div>
      )}

      {mensaje && <p className={mensaje.tipo === 'ok' ? 'admin-ok' : 'checkout-error'}>{mensaje.texto}</p>}
    </div>
  )
}
