import { Link, NavLink, Outlet } from 'react-router-dom'
import { useCart } from '../context/CartContext'

export default function Layout() {
  const { cantidadTotal } = useCart()

  return (
    <div className="layout">
      <header className="header">
        <Link to="/" className="header-logo">
          <img src={`${import.meta.env.BASE_URL}logo-tezcanela.png`} alt="Tez Canela" />
        </Link>
        <nav className="header-nav">
          <NavLink to="/" end>
            Inicio
          </NavLink>
          <NavLink to="/catalogo">Catálogo</NavLink>
          <NavLink to="/nosotros">Nosotros</NavLink>
          <NavLink to="/carrito" className="header-carrito">
            Carrito{cantidadTotal > 0 ? ` (${cantidadTotal})` : ''}
          </NavLink>
        </nav>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="footer">
        <p>Tez Canela — Cree · Emprende · Inspira</p>
      </footer>
    </div>
  )
}
