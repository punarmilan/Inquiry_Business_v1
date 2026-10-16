import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'isolate-middleware-cache',
      config(config) {
        // Component/SSR checks must not replace the running dev server's deps.
        if (config.server?.middlewareMode) {
          return { cacheDir: path.resolve(__dirname, 'node_modules/.vite-checks', String(process.pid)) };
        }
      },
    },
  ],
  optimizeDeps: {
    include: ['@radix-ui/react-tabs', '@radix-ui/react-switch', '@tanstack/react-table'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
