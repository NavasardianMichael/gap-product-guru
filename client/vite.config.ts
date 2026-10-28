import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 7005,
    open: true,
    // The client always calls relative /api/... URLs. In dev Vite forwards them to Express;
    // in production Express serves this client itself — same origin both ways, so no CORS.
    proxy: {
      '/api': 'http://localhost:9005',
    },
  },
});
