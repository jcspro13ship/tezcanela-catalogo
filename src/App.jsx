import { useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import Layout from './components/Layout'
import Catalogo from './pages/Catalogo'
import ProductoDetalle from './pages/ProductoDetalle'
import Carrito from './pages/Carrito'
import Admin from './pages/Admin'
import { CartProvider } from './context/CartContext'
import { CatalogoProvider } from './context/CatalogoContext'
import { hayVersionNueva } from './utils/actualizar'

// Si hay una versión nueva del sitio, la app se recarga sola al abrirla o al volver
// a ella. No lo hace en el carrito (para no borrar datos que la clienta esté
// escribiendo) ni más de una vez por minuto.
function useActualizacionAutomatica() {
  useEffect(() => {
    async function revisar() {
      if (document.visibilityState !== 'visible') return
      if (window.location.pathname.endsWith('/carrito')) return
      try {
        if (!(await hayVersionNueva())) return
        const ultima = Number(sessionStorage.getItem('tc_recarga') || 0)
        if (Date.now() - ultima < 60000) return
        sessionStorage.setItem('tc_recarga', String(Date.now()))
        window.location.reload()
      } catch {
        /* sin conexión o sin almacenamiento: se intenta de nuevo la próxima vez */
      }
    }
    const alMostrar = (e) => e.persisted && revisar()
    document.addEventListener('visibilitychange', revisar)
    window.addEventListener('pageshow', alMostrar)
    revisar()
    return () => {
      document.removeEventListener('visibilitychange', revisar)
      window.removeEventListener('pageshow', alMostrar)
    }
  }, [])
}

// Enlaces compartidos: .../catalogo/?ver=ID abren directamente la ficha de ese producto.
function useEnlaceDeProducto() {
  const navigate = useNavigate()
  useEffect(() => {
    const ver = new URLSearchParams(window.location.search).get('ver')
    if (ver) navigate(`/producto/${encodeURIComponent(ver)}`, { replace: true })
    // solo al abrir la app
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

export default function App() {
  useActualizacionAutomatica()
  useEnlaceDeProducto()
  return (
    <CatalogoProvider>
      <CartProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/catalogo" replace />} />
            <Route path="catalogo" element={<Catalogo />} />
            <Route path="producto/:id" element={<ProductoDetalle />} />
            <Route path="carrito" element={<Carrito />} />
            <Route path="admin" element={<Admin />} />
            <Route path="*" element={<Navigate to="/catalogo" replace />} />
          </Route>
        </Routes>
      </CartProvider>
    </CatalogoProvider>
  )
}
