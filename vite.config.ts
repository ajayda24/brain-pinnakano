import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // relative base so dist/ can be dropped on any host, including a subpath
  base: './',
  server: { host: 'localhost', port: 5173 },
  build: { target: 'es2022', assetsInlineLimit: 0 },
});
