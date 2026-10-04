import { createContext, useCallback, useContext, useEffect, useState } from 'react'
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
  const recargar = useCallback(async () => {
    const data = await cargarCatalogo({ fresco: true })
    setEstado({ ...data, cargando: false })
  }, [])

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
