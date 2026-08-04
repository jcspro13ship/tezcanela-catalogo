import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base '/' porque el sitio final vive en el dominio propio del cliente (CNAME),
// no en un subpath de github.io
export default defineConfig({
  plugins: [react()],
  base: '/',
})
