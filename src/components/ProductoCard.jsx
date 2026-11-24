import { Link } from 'react-router-dom'
import ImagenProducto from './ImagenProducto'
import { formatoPrecio, porcentajeDescuento, precioFinal } from '../utils/precios'

export default function ProductoCard({ producto }) {
  const descuento = porcentajeDescuento(producto)
  return (
    <Link to={`/producto/${producto.id}`} className="producto-card">
      <div className="franja-contenedor">
        <ImagenProducto producto={producto} className="producto-card-imagen" />
        {descuento > 0 && <span className="franja-descuento">-{descuento}%</span>}
      </div>
      <div className="producto-card-info">
        <p className="producto-card-categoria">{producto.categoria}</p>
        <h3>{producto.nombre}</h3>
        <p className="producto-card-precio">
          {formatoPrecio(precioFinal(producto))}
          {descuento > 0 && <s className="precio-antes">{formatoPrecio(producto.precio)}</s>}
        </p>
      </div>
    </Link>
  )
}

export { formatoPrecio }
