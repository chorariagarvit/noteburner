import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';
import { swVersionPlugin } from './tooling/swVersion.js';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    swVersionPlugin(version), // stamps a unique build id into dist/sw.js
  ],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  server: {
    fs: { allow: ['..'] }, // the changelog page imports ../CHANGELOG.md
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
