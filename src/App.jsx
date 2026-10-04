import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Inicio from './pages/Inicio'
import Nosotros from './pages/Nosotros'
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

export default function App() {
  useActualizacionAutomatica()
  return (
    <CatalogoProvider>
      <CartProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Inicio />} />
            <Route path="nosotros" element={<Nosotros />} />
            <Route path="catalogo" element={<Catalogo />} />
            <Route path="producto/:id" element={<ProductoDetalle />} />
            <Route path="carrito" element={<Carrito />} />
            <Route path="admin" element={<Admin />} />
          </Route>
        </Routes>
      </CartProvider>
    </CatalogoProvider>
  )
}
