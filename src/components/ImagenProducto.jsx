// Placeholder mientras no hay fotos reales de producto cargadas.
// Cuando el inventario tenga columna "imagen" con URL, se usa esa directamente.
export default function ImagenProducto({ producto, className = '' }) {
  if (producto.imagen) {
    return <img src={producto.imagen} alt={producto.nombre} className={className} />
  }
  return (
    <div className={`placeholder-imagen ${className}`}>
      <span>{producto.nombre}</span>
    </div>
  )
}
