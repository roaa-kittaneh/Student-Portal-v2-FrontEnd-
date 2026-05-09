import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const API_PORT = Number(process.env.API_PORT) || 4001;
const API_TARGET = process.env.API_TARGET || `http://localhost:${API_PORT}`;

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        // Surface clear JSON when upstream is unreachable instead of an opaque 500.
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            // eslint-disable-next-line no-console
            console.error('[vite-proxy]', err.message);
            if (res && 'writeHead' in res && !res.headersSent) {
              res.writeHead(502, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({
                  message:
                    `API server (server.mjs) is not reachable at ${API_TARGET}. Is \`npm run server\` running?`,
                })
              );
            }
          });
        },
      },
    },
  },
});
