import { useState } from 'react'
import {
  compartirNativo,
  copiarTexto,
  enlaceWhatsApp,
  precargarFoto,
  puedeCompartirNativo,
  textoCompartir,
} from '../utils/compartir'

// Botón "Compartir": en el celular abre el menú de compartir (con la foto);
// en el computador muestra WhatsApp y copiar el mensaje.
export default function BotonCompartir({ producto, className = 'boton boton-secundario', icono = false }) {
  const [menu, setMenu] = useState(false)
  const [aviso, setAviso] = useState('')

  const esCelular = () => window.matchMedia && window.matchMedia('(pointer: coarse)').matches

  async function alTocar() {
    setAviso('')
    if (puedeCompartirNativo() && esCelular()) {
      const r = await compartirNativo(producto)
      if (r === 'ok' || r === 'cancelado') return
    }
    setMenu((m) => !m)
  }

  async function copiar() {
    const ok = await copiarTexto(textoCompartir(producto))
    setAviso(ok ? 'Mensaje copiado. Pégalo en el chat del cliente.' : 'No se pudo copiar. Usa la opción de WhatsApp.')
  }

  return (
    <span className={`compartir ${icono ? 'compartir-icono-envoltorio' : ''}`}>
      <button
        type="button"
        className={icono ? 'compartir-icono' : className}
        aria-label={icono ? `Compartir ${producto.nombre}` : undefined}
        title={icono ? 'Compartir' : undefined}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          alTocar()
        }}
        onPointerEnter={() => precargarFoto(producto)}
        onTouchStart={() => precargarFoto(producto)}
        onFocus={() => precargarFoto(producto)}
      >
        {icono ? (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.6" y1="13.5" x2="15.4" y2="17.5" />
            <line x1="15.4" y1="6.5" x2="8.6" y2="10.5" />
          </svg>
        ) : (
          'Compartir'
        )}
      </button>
      {menu && icono && (
        <span
          className="compartir-fondo"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setMenu(false)
          }}
        />
      )}
      {menu && (
        <span className={`compartir-menu ${icono ? 'compartir-menu-modal' : ''}`} onClick={(e) => e.stopPropagation()}>
          {icono && <strong className="compartir-titulo">{producto.nombre}</strong>}
          <a href={enlaceWhatsApp(producto)} target="_blank" rel="noopener noreferrer" onClick={() => setMenu(false)}>
            Enviar por WhatsApp
          </a>
          <button type="button" onClick={copiar}>
            Copiar mensaje con enlace
          </button>
          {puedeCompartirNativo() && (
            <button
              type="button"
              onClick={async () => {
                const r = await compartirNativo(producto)
                if (r === 'ok') setMenu(false)
              }}
            >
              Más opciones…
            </button>
          )}
          {aviso && <small>{aviso}</small>}
          {icono && (
            <button type="button" onClick={() => setMenu(false)}>
              Cerrar
            </button>
          )}
        </span>
      )}
    </span>
  )
}
