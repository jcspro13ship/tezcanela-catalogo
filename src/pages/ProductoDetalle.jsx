import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useCatalogo, variantesDe } from '../context/CatalogoContext'
import { formatoPrecio } from '../components/ProductoCard'
import GaleriaProducto from '../components/GaleriaProducto'
import { useCart } from '../context/CartContext'

// Orden de las tallas: letras (XS…XXL), luego G10/G12…, luego números, "Única" al final.
const ORDEN_LETRAS = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']
function rangoTalla(t) {
  const s = String(t).trim().toUpperCase()
  const i = ORDEN_LETRAS.indexOf(s)
  if (i >= 0) return [0, i]
  const g = s.match(/^G(\d+)$/)
  if (g) return [1, Number(g[1])]
  if (/^\d+$/.test(s)) return [2, Number(s)]
  if (s === 'ÚNICA' || s === 'UNICA' || s === 'U') return [4, 0]
  return [3, 0]
}
function compararTallas(a, b) {
  const [ga, va] = rangoTalla(a)
  const [gb, vb] = rangoTalla(b)
  return ga - gb || va - vb || String(a).localeCompare(String(b))
}

export default function ProductoDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addItem } = useCart()
  const { productos, variantes: todasLasVariantes, cargando } = useCatalogo()

  const producto = productos.find((p) => p.id === id)
  const variantes = useMemo(() => variantesDe(todasLasVariantes, id), [todasLasVariantes, id])

  const colores = useMemo(() => [...new Set(variantes.map((v) => v.color))], [variantes])
  const tallas = useMemo(
    () => [...new Set(variantes.map((v) => v.talla))].sort(compararTallas),
    [variantes]
  )

  const [colorSeleccionado, setColorSeleccionado] = useState(null)
  const [tallaSeleccionada, setTallaSeleccionada] = useState(null)
  const [cantidad, setCantidad] = useState(1)
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    if (!colorSeleccionado && colores.length > 0) {
      setColorSeleccionado(colores[0])
    }
  }, [colores, colorSeleccionado])

  if (cargando) {
    return (
      <div className="pagina-producto">
        <p>Cargando producto...</p>
      </div>
    )
  }

  if (!producto || !producto.activo) {
    return (
      <div className="pagina-producto">
        <p>Producto no encontrado.</p>
        <Link to="/catalogo">Volver al catálogo</Link>
      </div>
    )
  }

  function stockDe(talla, color) {
    const v = variantes.find((v) => v.talla === talla && v.color === color)
    return v ? v.stock : 0
  }

  const varianteActual = variantes.find(
    (v) => v.talla === tallaSeleccionada && v.color === colorSeleccionado
  )
  const stockDisponible = varianteActual ? varianteActual.stock : 0

  function handleAgregar() {
    if (!tallaSeleccionada || !colorSeleccionado) {
      setMensaje('Selecciona talla y color.')
      return
    }
    if (stockDisponible < cantidad) {
      setMensaje('No hay suficiente stock disponible.')
      return
    }
    addItem({
      sku: varianteActual.sku,
      productoId: producto.id,
      nombre: producto.nombre,
      talla: tallaSeleccionada,
      color: colorSeleccionado,
      precio: producto.precio,
      cantidad,
    })
    setMensaje('Producto agregado al carrito.')
  }

  return (
    <div className="pagina-producto">
      <Link to="/catalogo" className="volver-link">
        ← Volver al catálogo
      </Link>

      <div className="producto-detalle">
        <GaleriaProducto producto={producto} className="producto-detalle-imagen" />

        <div className="producto-detalle-info">
          <p className="producto-card-categoria">{producto.categoria}</p>
          <h1>{producto.nombre}</h1>
          <p className="producto-detalle-precio">{formatoPrecio(producto.precio)}</p>
          <p className="producto-detalle-descripcion">{producto.descripcion}</p>

          <div className="selector-bloque">
            <p className="selector-label">Color</p>
            <div className="selector-opciones">
              {colores.map((color) => (
                <button
                  key={color}
                  className={`chip ${colorSeleccionado === color ? 'chip-activo' : ''}`}
                  onClick={() => {
                    setColorSeleccionado(color)
                    setTallaSeleccionada(null)
                    setMensaje('')
                  }}
                >
                  {color}
                </button>
              ))}
            </div>
          </div>

          <div className="selector-bloque">
            <p className="selector-label">Talla</p>
            <div className="selector-opciones">
              {tallas.map((talla) => {
                const disponible = stockDe(talla, colorSeleccionado) > 0
                return (
                  <button
                    key={talla}
                    disabled={!disponible}
                    className={`chip ${tallaSeleccionada === talla ? 'chip-activo' : ''} ${
                      !disponible ? 'chip-deshabilitado' : ''
                    }`}
                    onClick={() => {
                      setTallaSeleccionada(talla)
                      setMensaje('')
                    }}
                  >
                    {talla}
                  </button>
                )
              })}
            </div>
          </div>

          {tallaSeleccionada && colorSeleccionado && (
            <p className="stock-info">
              {stockDisponible > 0
                ? `${stockDisponible} disponibles`
                : 'Agotado en esta combinación'}
            </p>
          )}

          <div className="selector-bloque">
            <p className="selector-label">Cantidad</p>
            <div className="selector-cantidad">
              <button onClick={() => setCantidad((c) => Math.max(1, c - 1))}>−</button>
              <span>{cantidad}</span>
              <button onClick={() => setCantidad((c) => c + 1)}>+</button>
            </div>
          </div>

          <button className="boton boton-primario" onClick={handleAgregar}>
            Agregar al carrito
          </button>

          {mensaje && <p className="mensaje-info">{mensaje}</p>}

          <button className="boton boton-secundario" onClick={() => navigate('/carrito')}>
            Ir al carrito
          </button>
        </div>
      </div>
    </div>
  )
}
