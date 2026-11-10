import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'edurt-express-api-middleware',
      async configureServer(server) {
        const { app } = await import('./server/index.ts');
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

