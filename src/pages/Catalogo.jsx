import { useMemo, useState } from 'react'
import { useCatalogo } from '../context/CatalogoContext'
import ProductoCard from '../components/ProductoCard'

export default function Catalogo() {
  const { productos, cargando } = useCatalogo()
  const [categoria, setCategoria] = useState('Todas')
  const [busqueda, setBusqueda] = useState('')

  const categorias = useMemo(() => {
    const unicas = new Set(productos.map((p) => p.categoria))
    return ['Todas', ...unicas]
  }, [productos])

  const productosFiltrados = useMemo(() => {
    return productos.filter((p) => {
      if (!p.activo) return false
      if (categoria !== 'Todas' && p.categoria !== categoria) return false
      if (busqueda && !p.nombre.toLowerCase().includes(busqueda.toLowerCase())) return false
      return true
    })
  }, [productos, categoria, busqueda])

  return (
    <div className="pagina-catalogo">
      <h1>Catálogo</h1>

      <div className="catalogo-filtros">
        <input
          type="text"
          placeholder="Buscar producto..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="catalogo-buscador"
        />
        <div className="catalogo-categorias">
          {categorias.map((c) => (
            <button
              key={c}
              className={`chip ${categoria === c ? 'chip-activo' : ''}`}
              onClick={() => setCategoria(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {cargando ? (
        <p className="catalogo-vacio">Cargando catálogo...</p>
      ) : productosFiltrados.length === 0 ? (
        <p className="catalogo-vacio">No encontramos productos con ese filtro.</p>
      ) : (
        <div className="catalogo-grid">
          {productosFiltrados.map((p) => (
            <ProductoCard key={p.id} producto={p} />
          ))}
        </div>
      )}
    </div>
  )
}
