import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' so the build works from any S3 bucket path or CloudFront origin
export default defineConfig({
  plugins: [react()],
  base: './',
})
