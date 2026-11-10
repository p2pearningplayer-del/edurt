import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { app } from './server/index.ts';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'edurt-express-api-middleware',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && req.url.startsWith('/api')) {
            app(req as any, res as any, next);
          } else {
            next();
          }
        });
      },
    },
  ],
  server: {
    port: 3000,
    host: true,
    allowedHosts: true,
  },
  preview: {
    port: 3000,
    host: true,
    allowedHosts: true,
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        entryFileNames: 'assets/app.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
});

