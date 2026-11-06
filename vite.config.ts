import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
  optimizeDeps: {
    include: ['three', '@react-three/fiber', '@react-three/xr'],
  },
  build: {
    target: 'esnext',
  },
})
