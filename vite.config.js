import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base '/' (served from domain root) — absolute asset paths so deep client-side
// routes like /writing/<slug> load assets correctly on direct page load.
export default defineConfig({
  plugins: [react()],
  base: '/',
})
