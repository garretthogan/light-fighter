import { defineConfig } from 'vite'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/light-fighter/' : '/',
  server: {
    host: true,
    port: 5173
  }
}))
