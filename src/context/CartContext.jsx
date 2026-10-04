import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const CartContext = createContext(null)

// El carrito se guarda en el celular por 24 horas, para que recargar o actualizar
// la app no le borre a la clienta lo que ya agregó.
const CLAVE_CARRITO = 'tc_carrito'
const VIGENCIA_MS = 24 * 60 * 60 * 1000

function leerCarrito() {
  try {
    const g = JSON.parse(localStorage.getItem(CLAVE_CARRITO) || 'null')
    if (g && Array.isArray(g.items) && Date.now() - g.t < VIGENCIA_MS) return g.items
  } catch {
    /* sin almacenamiento o dato dañado: se empieza con el carrito vacío */
  }
  return []
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(leerCarrito)

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_CARRITO, JSON.stringify({ t: Date.now(), items }))
    } catch {
      /* sin almacenamiento: el carrito vive solo mientras la app esté abierta */
    }
  }, [items])

  function addItem(nuevo) {
    setItems((prev) => {
      const idx = prev.findIndex(
        (it) => it.sku === nuevo.sku
      )
      if (idx >= 0) {
        const copia = [...prev]
        copia[idx] = { ...copia[idx], cantidad: copia[idx].cantidad + nuevo.cantidad }
        return copia
      }
      return [...prev, nuevo]
    })
  }

  function removeItem(sku) {
    setItems((prev) => prev.filter((it) => it.sku !== sku))
  }

  function updateCantidad(sku, cantidad) {
    setItems((prev) =>
      prev
        .map((it) => (it.sku === sku ? { ...it, cantidad } : it))
        .filter((it) => it.cantidad > 0)
    )
  }

  function clearCart() {
    setItems([])
  }

  const total = useMemo(
    () => items.reduce((acc, it) => acc + it.precio * it.cantidad, 0),
    [items]
  )

  const cantidadTotal = useMemo(
    () => items.reduce((acc, it) => acc + it.cantidad, 0),
    [items]
  )

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateCantidad, clearCart, total, cantidadTotal }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart debe usarse dentro de CartProvider')
  return ctx
}
