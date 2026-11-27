import { useRef, useState } from 'react'
import { EMPRESA, VIDEO_PORTADA, VIDEO_PORTADA_IMAGEN } from '../config'

// Bloque de bienvenida arriba del catálogo: video (si hay) y texto de presentación.
export default function Portada() {
  const video = useRef(null)
  const [conSonido, setConSonido] = useState(false)

  function alternarSonido() {
    const v = video.current
    if (!v) return
    v.muted = !v.muted
    if (!v.muted) v.play().catch(() => {})
    setConSonido(!v.muted)
  }

  return (
    <section className="portada">
      {VIDEO_PORTADA && (
        <div className="portada-video">
          <video
            ref={video}
            src={VIDEO_PORTADA}
            poster={VIDEO_PORTADA_IMAGEN || undefined}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          />
          <button type="button" className="portada-sonido" onClick={alternarSonido}>
            {conSonido ? 'Silenciar' : 'Activar sonido'}
          </button>
        </div>
      )}
      <div className="portada-texto">
        {EMPRESA.presentacion.map((parrafo, i) => (
          <p key={i} className={i === 0 ? 'portada-destacado' : ''}>
            {parrafo}
          </p>
        ))}
      </div>
    </section>
  )
}
