import { Link } from 'react-router-dom'
import ImagenProducto from './ImagenProducto'
import BotonCompartir from './BotonCompartir'
import { formatoPrecio, porcentajeDescuento, precioFinal } from '../utils/precios'

export default function ProductoCard({ producto }) {
  const descuento = porcentajeDescuento(producto)
  return (
    <div className="producto-card">
      <Link to={`/producto/${producto.id}`} className="producto-card-enlace">
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
      <div className="producto-card-compartir">
        <BotonCompartir producto={producto} icono />
      </div>
    </div>
  )
}

export { formatoPrecio }
