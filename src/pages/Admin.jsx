import { useEffect, useMemo, useState } from 'react'
import { useCatalogo, variantesDe } from '../context/CatalogoContext'
import { formatoPrecio } from '../components/ProductoCard'
import { llamarAdmin } from '../admin/api'
import { conAncho } from '../utils/imagenUrl'

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

  return (
    <div className="admin">
      <div className="admin-barra">
        <div>
          <h1>Administración</h1>
          <p className="admin-resumen">
            {productos.length} productos · {activos} visibles · {productos.length - activos} ocultos
          </p>
        </div>
        <button className="boton boton-secundario" onClick={() => onSalir()}>
          Salir
        </button>
      </div>

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

const entero = (t) => /^\d+$/.test(String(t).trim())

function ProductoFila({ producto, variantes, clave, recargar, onSalir }) {
  const [abierto, setAbierto] = useState(false)
  const [precio, setPrecio] = useState(String(producto.precio))
  const [stocks, setStocks] = useState(() => Object.fromEntries(variantes.map((v) => [v.sku, String(v.stock)])))
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)

  const stockTotal = variantes.reduce((a, v) => a + v.stock, 0)
  const precioCambio = precio.trim() !== String(producto.precio)
  const stocksCambiados = variantes.filter((v) => (stocks[v.sku] ?? String(v.stock)).trim() !== String(v.stock))
  const hayCambios = precioCambio || stocksCambiados.length > 0
  const valido = entero(precio) && variantes.every((v) => entero(stocks[v.sku] ?? v.stock))

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
        ...(precioCambio ? { precio: Number(precio) } : {}),
        ...(stocksCambiados.length
          ? { stocks: stocksCambiados.map((v) => ({ sku: v.sku, stock: Number(stocks[v.sku]) })) }
          : {}),
      },
      'Cambios guardados'
    )

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
            {producto.id} · {producto.categoria} · {formatoPrecio(producto.precio)} ·{' '}
            {stockTotal === 0 ? <strong>Agotado</strong> : `${stockTotal} en stock`}
          </p>
        </div>
        <label className="admin-switch" title={producto.activo ? 'Visible en el catálogo' : 'Oculto del catálogo'}>
          <input type="checkbox" checked={producto.activo} disabled={guardando} onChange={cambiarActivo} />
          <span>{producto.activo ? 'Visible' : 'Oculto'}</span>
        </label>
        <button className="chip" onClick={() => setAbierto((a) => !a)}>
          {abierto ? 'Cerrar' : 'Editar'}
        </button>
      </div>

      {abierto && (
        <div className="admin-detalle">
          <label className="admin-campo">
            Precio (COP)
            <input
              inputMode="numeric"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              className={entero(precio) ? '' : 'admin-invalido'}
            />
          </label>

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
        </div>
      )}

      {mensaje && <p className={mensaje.tipo === 'ok' ? 'admin-ok' : 'checkout-error'}>{mensaje.texto}</p>}
    </div>
  )
}
