import { conAncho } from '../utils/imagenUrl'

// Placeholder mientras un producto no tiene fotos cargadas.
// Muestra la primera foto del producto (portada), en baja resolución
// porque esto se usa en el grid del catálogo (hasta cientos de tarjetas).
export default function ImagenProducto({ producto, className = '', ancho = 500 }) {
  const portada = producto.imagenes && producto.imagenes[0]
  if (portada) {
    return (
      <img
        src={conAncho(portada, ancho)}
        alt={producto.nombre}
        className={className}
        loading="lazy"
      />
    )
  }
  return (
    <div className={`placeholder-imagen ${className}`}>
      <span>{producto.nombre}</span>
    </div>
  )
}
