import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { formatoPrecio } from '../components/ProductoCard'
import { WHATSAPP_NUMBER } from '../config'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function construirMensajeWhatsApp(items, total, cliente) {
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
    '',
    'Mis datos:',
    `Nombre: ${cliente.nombre}`,
    `Teléfono: ${cliente.telefono}`,
    `Correo: ${cliente.email}`,
  ].join('\n')
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(cuerpo)}`
}

export default function Carrito() {
  const { items, removeItem, updateCantidad, total } = useCart()
  const [cliente, setCliente] = useState({ nombre: '', telefono: '', email: '' })
  const [error, setError] = useState('')

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

  function actualizarCliente(campo, valor) {
    setCliente((c) => ({ ...c, [campo]: valor }))
    setError('')
  }

  function handleEnviar() {
    const nombre = cliente.nombre.trim()
    const telefono = cliente.telefono.trim()
    const email = cliente.email.trim()

    if (!nombre || !telefono || !email) {
      setError('Completa nombre, teléfono y correo para poder enviar el pedido.')
      return
    }
    if (telefono.replace(/\D/g, '').length < 7) {
      setError('Revisa el número de teléfono.')
      return
    }
    if (!EMAIL_REGEX.test(email)) {
      setError('Revisa el correo electrónico.')
      return
    }

    const url = construirMensajeWhatsApp(items, total, { nombre, telefono, email })
    window.open(url, '_blank', 'noopener,noreferrer')
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

      <div className="checkout-form">
        <label>
          Nombre completo
          <input
            type="text"
            value={cliente.nombre}
            onChange={(e) => actualizarCliente('nombre', e.target.value)}
            placeholder="Tu nombre"
          />
        </label>
        <label>
          Teléfono
          <input
            type="tel"
            value={cliente.telefono}
            onChange={(e) => actualizarCliente('telefono', e.target.value)}
            placeholder="300 000 0000"
          />
        </label>
        <label>
          Correo electrónico
          <input
            type="email"
            value={cliente.email}
            onChange={(e) => actualizarCliente('email', e.target.value)}
            placeholder="tucorreo@ejemplo.com"
          />
        </label>
      </div>

      {error && <p className="checkout-error">{error}</p>}

      <button className="boton boton-primario boton-whatsapp" onClick={handleEnviar}>
        Enviar pedido por WhatsApp
      </button>
    </div>
  )
}
