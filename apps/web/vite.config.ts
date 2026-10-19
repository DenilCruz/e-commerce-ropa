import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

function decartWorkerPlugin(): Plugin {
  return {
    name: 'decart-worker-middleware',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && req.url.includes('frame-metadata-worker.js')) {
          const candidatePaths = [
            path.resolve(__dirname, '../../node_modules/@decartai/sdk/dist/realtime/browser/frame-metadata-worker.js'),
            path.resolve(__dirname, 'node_modules/@decartai/sdk/dist/realtime/browser/frame-metadata-worker.js'),
            path.resolve(__dirname, 'public/frame-metadata-worker.js'),
          ];
          for (const workerPath of candidatePaths) {
            if (fs.existsSync(workerPath)) {
              res.setHeader('Content-Type', 'application/javascript');
              res.statusCode = 200;
              res.end(fs.readFileSync(workerPath));
              return;
            }
          }
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), decartWorkerPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
});
