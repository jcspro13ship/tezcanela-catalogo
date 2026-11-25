import { useMemo, useState } from 'react'
import { llamarAdmin } from '../admin/api'
import { subirPendientes } from '../admin/fotos'
import EditorFotos from './EditorFotos'
import { formatoFecha, formatoPrecio, hoyColombia, precioFinal } from '../utils/precios'

const TALLAS_RAPIDAS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'G10', 'G12', 'G14', 'G16', '2', '4', '6', '8', '10', '12', '14', '16', 'Única']
const OTRA = '__otra__'

const entero = (t, min = 0, max = Infinity) => /^\d+$/.test(String(t).trim()) && Number(t) >= min && Number(t) <= max
// Los números se aceptan como se escriben en Colombia (289.990, $ 289.990): se dejan solo los dígitos.
const soloDigitos = (t) => String(t).replace(/\D/g, '')
const normalizarRef = (t) => t.toUpperCase().replace(/[^A-Z0-9]/g, '')
const llave = (v) => `${v.color.trim().toLowerCase()}|${v.talla.trim().toLowerCase()}`

export default function NuevoProducto({ clave, productos, categorias, recargar, onSalir, onCerrar }) {
  const [ref, setRef] = useState('')
  const [nombre, setNombre] = useState('')
  const [categoria, setCategoria] = useState('')
  const [categoriaNueva, setCategoriaNueva] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [precio, setPrecio] = useState('')
  const [descuento, setDescuento] = useState('0')
  const [hasta, setHasta] = useState('')
  const [visible, setVisible] = useState(true)
  const [variantes, setVariantes] = useState([])
  const [colorNuevo, setColorNuevo] = useState('')
  const [tallasSel, setTallasSel] = useState([])
  const [tallaOtra, setTallaOtra] = useState('')
  const [stockGen, setStockGen] = useState('1')
  const [fotos, setFotos] = useState([])
  const [fase, setFase] = useState('editando') // editando | enviando | listo
  const [progreso, setProgreso] = useState('')
  const [error, setError] = useState('')
  const [creado, setCreado] = useState(null)

  const refLimpia = normalizarRef(ref)
  const idNuevo = 'r' + refLimpia.toLowerCase()
  const categoriaFinal = categoria === OTRA ? categoriaNueva.trim() : categoria
  const repetido = refLimpia && productos.some((p) => p.id === idNuevo)

  const problemas = useMemo(() => {
    const p = []
    if (!refLimpia) p.push('Escribe la referencia.')
    else if (repetido) p.push(`Ya existe un producto con la referencia ${refLimpia}.`)
    if (!nombre.trim()) p.push('Escribe el nombre.')
    if (!categoriaFinal) p.push('Elige o escribe la categoría.')
    if (!entero(precio, 1, 99999999)) p.push('Escribe el precio (solo el número, ej: 289990).')
    if (!entero(descuento || '0', 0, 90)) p.push('El descuento debe ser un número entre 0 y 90.')
    if (Number(descuento) > 0 && hasta && hasta < hoyColombia()) p.push('La fecha de fin del descuento ya pasó.')
    if (variantes.length === 0) p.push('Agrega al menos una talla y color.')
    if (variantes.some((v) => !entero(v.stock))) p.push('Revisa las cantidades (números enteros de 0 o más).')
    return p
  }, [refLimpia, repetido, nombre, categoriaFinal, precio, descuento, hasta, variantes])

  const bloqueado = fase === 'enviando'

  function agregarVariantes() {
    const color = colorNuevo.trim()
    const tallas = [...tallasSel, ...(tallaOtra.trim() ? [tallaOtra.trim()] : [])]
    if (!color || tallas.length === 0) return
    setVariantes((actual) => {
      const nuevas = tallas
        .map((t) => ({ color, talla: t, stock: stockGen.trim() || '1' }))
        .filter((n) => !actual.some((a) => llave(a) === llave(n)))
      return [...actual, ...nuevas]
    })
    setTallasSel([])
    setTallaOtra('')
  }

  async function crear() {
    setError('')
    setFase('enviando')
    let urls
    try {
      urls = await subirPendientes(
        fotos,
        idNuevo,
        setProgreso,
        (key, url) => setFotos((f) => f.map((x) => (x.key === key ? { ...x, url } : x)))
      )
    } catch {
      setProgreso('')
      setFase('editando')
      return setError('No se pudo subir una foto. Revisa tu conexión a internet e inténtalo de nuevo (las fotos que ya subieron no se repiten).')
    }

    setProgreso('Guardando el producto…')
    const r = await llamarAdmin(clave, 'crearProducto', {
      ref: refLimpia,
      nombre: nombre.trim(),
      categoria: categoriaFinal,
      descripcion: descripcion.trim(),
      precio: Number(precio),
      descuento: Number(descuento || 0),
      ...(Number(descuento) > 0 && hasta ? { hasta } : {}),
      activo: visible,
      variantes: variantes.map((v) => ({ color: v.color.trim(), talla: v.talla.trim(), stock: Number(v.stock) })),
      imagenes: urls,
    })
    setProgreso('')
    if (!r.ok) {
      setFase('editando')
      if (r.claveIncorrecta || r.bloqueado) return onSalir(r.error)
      return setError(r.error || 'No se pudo crear el producto.')
    }
    try {
      await recargar()
    } catch {
      /* se verá al recargar la página */
    }
    setCreado({ id: r.id, nombre: nombre.trim(), visible })
    setFase('listo')
  }

  function otro() {
    fotos.forEach((f) => URL.revokeObjectURL(f.vista))
    setRef('')
    setNombre('')
    setDescripcion('')
    setPrecio('')
    setDescuento('0')
    setHasta('')
    setVisible(true)
    setVariantes([])
    setColorNuevo('')
    setTallasSel([])
    setFotos([])
    setError('')
    setCreado(null)
    setFase('editando')
  }

  if (fase === 'listo' && creado) {
    return (
      <div className="admin-nuevo">
        <p className="admin-ok">
          Listo: «{creado.nombre}» quedó creado{creado.visible ? ' y ya está visible en el catálogo' : ' pero está oculto (actívalo cuando quieras)'}.
        </p>
        <div className="admin-acciones">
          <button className="chip" onClick={onCerrar}>
            Cerrar
          </button>
          <button className="boton boton-primario" onClick={otro}>
            Crear otro producto
          </button>
        </div>
      </div>
    )
  }

  const dto = entero(descuento || '0', 0, 90) ? Number(descuento || 0) : 0
  const precioNum = entero(precio, 1) ? Number(precio) : 0

  return (
    <div className="admin-nuevo">
      <h2>Nuevo producto</h2>

      <div className="admin-grid2">
        <label className="admin-campo">
          Referencia *
          <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Ej: 9438 o CD21634" disabled={bloqueado} className={repetido ? 'admin-invalido' : ''} />
        </label>
        <label className="admin-campo">
          Nombre *
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Vestido Sirena Verde" disabled={bloqueado} />
        </label>
        <label className="admin-campo">
          Categoría *
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)} disabled={bloqueado}>
            <option value="" disabled>
              Elige una categoría…
            </option>
            {categorias.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            <option value={OTRA}>Otra categoría…</option>
          </select>
          {categoria === OTRA && (
            <input value={categoriaNueva} onChange={(e) => setCategoriaNueva(e.target.value)} placeholder="Nombre de la categoría (en plural: Vestidos)" disabled={bloqueado} />
          )}
        </label>
        <label className="admin-campo">
          Precio (COP) *
          <input inputMode="numeric" value={precio} onChange={(e) => setPrecio(soloDigitos(e.target.value))} placeholder="Ej: 289990" disabled={bloqueado} className={precio && !entero(precio, 1) ? 'admin-invalido' : ''} />
          {precioNum > 0 && <small>{formatoPrecio(precioNum)}</small>}
        </label>
        <label className="admin-campo">
          Descuento (%)
          <input inputMode="numeric" value={descuento} onChange={(e) => setDescuento(soloDigitos(e.target.value))} disabled={bloqueado} className={entero(descuento || '0', 0, 90) ? '' : 'admin-invalido'} />
          {dto > 0 && precioNum > 0 && <small>Se venderá en {formatoPrecio(precioFinal({ precio: precioNum, descuento: dto }))}</small>}
        </label>
        {Number(descuento) > 0 && (
          <label className="admin-campo">
            Último día del descuento (opcional)
            <input type="date" min={hoyColombia()} value={hasta} onChange={(e) => setHasta(e.target.value)} disabled={bloqueado} />
            <small>{hasta ? `Vale hasta el ${formatoFecha(hasta)} inclusive.` : 'Sin fecha: dura hasta que lo quites.'}</small>
          </label>
        )}
        <label className="admin-campo admin-check">
          <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} disabled={bloqueado} />
          Visible en el catálogo al crearlo
        </label>
      </div>

      <label className="admin-campo">
        Descripción
        <textarea rows={3} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Tela, corte, detalles…" maxLength={600} disabled={bloqueado} />
      </label>

      <h3>Tallas y colores *</h3>
      <div className="admin-variantes-gen">
        <label className="admin-campo">
          Color
          <input value={colorNuevo} onChange={(e) => setColorNuevo(e.target.value)} placeholder="Ej: Negro" disabled={bloqueado} />
        </label>
        <div className="admin-campo">
          Tallas de ese color
          <div className="admin-chips">
            {TALLAS_RAPIDAS.map((t) => (
              <button
                type="button"
                key={t}
                disabled={bloqueado}
                className={`chip ${tallasSel.includes(t) ? 'chip-activo' : ''}`}
                onClick={() => setTallasSel((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]))}
              >
                {t}
              </button>
            ))}
            <input className="admin-talla-otra" value={tallaOtra} onChange={(e) => setTallaOtra(e.target.value)} placeholder="Otra talla" maxLength={10} disabled={bloqueado} />
          </div>
        </div>
        <label className="admin-campo admin-stock-gen">
          Cantidad de cada una
          <input inputMode="numeric" value={stockGen} onChange={(e) => setStockGen(soloDigitos(e.target.value))} disabled={bloqueado} />
        </label>
        <button type="button" className="chip" onClick={agregarVariantes} disabled={bloqueado || !colorNuevo.trim() || (tallasSel.length === 0 && !tallaOtra.trim())}>
          Agregar al listado
        </button>
      </div>

      {variantes.length > 0 && (
        <table className="admin-variantes">
          <thead>
            <tr>
              <th>Color</th>
              <th>Talla</th>
              <th>Cantidad</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {variantes.map((v, i) => (
              <tr key={llave(v)}>
                <td>{v.color}</td>
                <td>{v.talla}</td>
                <td>
                  <input
                    inputMode="numeric"
                    value={v.stock}
                    disabled={bloqueado}
                    className={entero(v.stock) ? '' : 'admin-invalido'}
                    onChange={(e) => setVariantes((a) => a.map((x, k) => (k === i ? { ...x, stock: soloDigitos(e.target.value) } : x)))}
                  />
                </td>
                <td>
                  <button type="button" className="chip" disabled={bloqueado} onClick={() => setVariantes((a) => a.filter((_, k) => k !== i))}>
                    Quitar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3>Fotos</h3>
      <p className="admin-ayuda">La primera es la que se ve en el catálogo. Puedes subir hasta 10 (con modelo, sin modelo, detalles).</p>
      <EditorFotos fotos={fotos} setFotos={setFotos} bloqueado={bloqueado} />
      {fotos.length === 0 && <p className="admin-ayuda">Sin fotos, el producto aparece con un recuadro gris. Puedes dejarlo oculto hasta tenerlas.</p>}

      {problemas.length > 0 && (
        <ul className="admin-problemas">
          {problemas.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      {error && <p className="checkout-error">{error}</p>}
      {progreso && <p className="admin-estado">{progreso}</p>}

      <div className="admin-acciones">
        <button className="chip" onClick={onCerrar} disabled={bloqueado}>
          Cancelar
        </button>
        <button className="boton boton-primario" onClick={crear} disabled={bloqueado || problemas.length > 0}>
          {bloqueado ? 'Creando…' : 'Crear producto'}
        </button>
      </div>
    </div>
  )
}
