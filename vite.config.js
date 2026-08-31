import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Mientras no haya dominio propio conectado, GitHub Pages sirve este sitio en
// github.io/tezcanela-catalogo/ (subcarpeta), por eso el base coincide con el
// nombre del repo. El día que se conecte el dominio propio del cliente, este
// valor debe volver a '/' (GitHub Pages sirve el dominio propio desde la raíz).
export default defineConfig({
  plugins: [react()],
  base: '/tezcanela-catalogo/',
})
