import { defineConfig } from 'vite'

export default defineConfig({
  root: 'public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api/proxy': {
        target: 'https://api.allorigins.win',
        rewrite: path => path.replace(/^\/api\/proxy/, '/raw'),
        changeOrigin: true,
      },
    },
  },
})
