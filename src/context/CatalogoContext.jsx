import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { cargarCatalogo } from '../data/fetchCatalogo'

const CatalogoContext = createContext(null)

export function CatalogoProvider({ children }) {
  const [estado, setEstado] = useState({
    productos: [],
    variantes: [],
    cargando: true,
    fuente: null,
  })

  useEffect(() => {
    let vigente = true
    cargarCatalogo().then((data) => {
      if (vigente) setEstado({ ...data, cargando: false })
    })
    return () => {
      vigente = false
    }
  }, [])

  // Vuelve a leer el catálogo (lo usa el panel de administración tras guardar cambios).
  const ultimaCarga = useRef(Date.now())
  const recargar = useCallback(async () => {
    const data = await cargarCatalogo({ fresco: true })
    ultimaCarga.current = Date.now()
    setEstado({ ...data, cargando: false })
  }, [])

  // Al volver a la app (o a la pestaña) después de un rato, se actualizan stock,
  // precios y productos sin que la persona tenga que hacer nada.
  useEffect(() => {
    function alVolver() {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - ultimaCarga.current < 30000) return
      recargar().catch(() => {})
    }
    document.addEventListener('visibilitychange', alVolver)
    return () => document.removeEventListener('visibilitychange', alVolver)
  }, [recargar])

  return <CatalogoContext.Provider value={{ ...estado, recargar }}>{children}</CatalogoContext.Provider>
}

export function useCatalogo() {
  const ctx = useContext(CatalogoContext)
  if (!ctx) throw new Error('useCatalogo debe usarse dentro de CatalogoProvider')
  return ctx
}

export function variantesDe(variantes, productoId) {
  return variantes.filter((v) => v.producto_id === productoId)
}
