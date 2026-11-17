import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Pin the dev port so the magic-link redirect (window.location.origin) always
  // matches the Supabase "Redirect URLs" allowlist (http://localhost:5173/**).
  server: { port: 5173 },
})
