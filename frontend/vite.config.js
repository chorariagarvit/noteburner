import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 5173,
    proxy: {
      '^/api/': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
  // `vite preview` serves the production build (used by the CSP check): same API proxy as dev
  preview: {
    port: 4173,
    proxy: {
      '^/api/': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
