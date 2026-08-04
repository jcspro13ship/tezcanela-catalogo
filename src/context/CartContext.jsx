import { createContext, useContext, useMemo, useState } from 'react'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [items, setItems] = useState([])

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
