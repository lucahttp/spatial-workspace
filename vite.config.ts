import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copilotManagedRuntime } from '@microsoft/cmr-apps-vite-plugin'

export default defineConfig({
  base: './',
  plugins: [react(), copilotManagedRuntime()],
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
