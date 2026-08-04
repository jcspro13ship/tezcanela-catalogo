import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { formatoPrecio } from '../components/ProductoCard'
import { WHATSAPP_NUMBER } from '../config'

function construirMensajeWhatsApp(items, total) {
  const lineas = items.map(
    (it) =>
      `• ${it.nombre} — Talla ${it.talla}, Color ${it.color} — Cant: ${it.cantidad} — ${formatoPrecio(
        it.precio * it.cantidad
      )}`
  )
  const cuerpo = [
    'Hola, quiero hacer este pedido:',
    '',
    ...lineas,
    '',
    `Total: ${formatoPrecio(total)}`,
  ].join('\n')
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(cuerpo)}`
}

export default function Carrito() {
  const { items, removeItem, updateCantidad, total } = useCart()

  if (items.length === 0) {
    return (
      <div className="pagina-carrito">
        <h1>Carrito</h1>
        <p>Tu carrito está vacío.</p>
        <Link to="/catalogo" className="boton boton-primario">
          Ver catálogo
        </Link>
      </div>
    )
  }

  return (
    <div className="pagina-carrito">
      <h1>Carrito</h1>

      <div className="carrito-lista">
        {items.map((it) => (
          <div key={it.sku} className="carrito-item">
            <div className="carrito-item-info">
              <p className="carrito-item-nombre">{it.nombre}</p>
              <p className="carrito-item-detalle">
                Talla {it.talla} · Color {it.color}
              </p>
              <p className="carrito-item-precio">{formatoPrecio(it.precio)}</p>
            </div>
            <div className="carrito-item-cantidad">
              <button onClick={() => updateCantidad(it.sku, it.cantidad - 1)}>−</button>
              <span>{it.cantidad}</span>
              <button onClick={() => updateCantidad(it.sku, it.cantidad + 1)}>+</button>
            </div>
            <button className="carrito-item-quitar" onClick={() => removeItem(it.sku)}>
              Quitar
            </button>
          </div>
        ))}
      </div>

      <div className="carrito-total">
        <span>Total</span>
        <span>{formatoPrecio(total)}</span>
      </div>

      <a
        href={construirMensajeWhatsApp(items, total)}
        target="_blank"
        rel="noopener noreferrer"
        className="boton boton-primario boton-whatsapp"
      >
        Enviar pedido por WhatsApp
      </a>
    </div>
  )
}
