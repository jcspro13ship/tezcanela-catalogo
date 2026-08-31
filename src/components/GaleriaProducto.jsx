import { useEffect, useState } from 'react'
import { conAncho } from '../utils/imagenUrl'

export default function GaleriaProducto({ producto, className = '' }) {
  const imagenes = producto.imagenes || []
  const [seleccionada, setSeleccionada] = useState(0)

  useEffect(() => {
    setSeleccionada(0)
  }, [producto.id])

  if (imagenes.length === 0) {
    return (
      <div className={`placeholder-imagen ${className}`}>
        <span>{producto.nombre}</span>
      </div>
    )
  }

  return (
    <div className="galeria-producto">
      <img
        src={conAncho(imagenes[seleccionada], 1000)}
        alt={producto.nombre}
        className={className}
      />
      {imagenes.length > 1 && (
        <div className="galeria-miniaturas">
          {imagenes.map((url, i) => (
            <button
              key={url + i}
              className={`galeria-miniatura ${i === seleccionada ? 'galeria-miniatura-activa' : ''}`}
              onClick={() => setSeleccionada(i)}
              aria-label={`Foto ${i + 1} de ${producto.nombre}`}
            >
              <img src={conAncho(url, 150)} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
