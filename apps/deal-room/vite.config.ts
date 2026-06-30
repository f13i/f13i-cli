import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The dev server is started by ./server.mjs (Vite middleware + /api backend),
// not `vite` directly — so port/open live there. This config only carries the
// React plugin and is also used by `vite build`.
export default defineConfig({
  plugins: [react()],
})
