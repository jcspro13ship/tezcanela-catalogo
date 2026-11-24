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
export default function BotonCompartir({ producto, className = 'boton boton-secundario' }) {
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
    <span className="compartir">
      <button
        type="button"
        className={className}
        onClick={alTocar}
        onPointerEnter={() => precargarFoto(producto)}
        onTouchStart={() => precargarFoto(producto)}
        onFocus={() => precargarFoto(producto)}
      >
        Compartir
      </button>
      {menu && (
        <span className="compartir-menu">
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
        </span>
      )}
    </span>
  )
}
