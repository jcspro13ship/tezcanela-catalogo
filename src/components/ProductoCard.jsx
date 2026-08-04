import { Link } from 'react-router-dom'
import ImagenProducto from './ImagenProducto'

function formatoPrecio(valor) {
  return valor.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
}

export default function ProductoCard({ producto }) {
  return (
    <Link to={`/producto/${producto.id}`} className="producto-card">
      <ImagenProducto producto={producto} className="producto-card-imagen" />
      <div className="producto-card-info">
        <p className="producto-card-categoria">{producto.categoria}</p>
        <h3>{producto.nombre}</h3>
        <p className="producto-card-precio">{formatoPrecio(producto.precio)}</p>
      </div>
    </Link>
  )
}

export { formatoPrecio }
