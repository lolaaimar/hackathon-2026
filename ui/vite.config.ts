import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';
import tailwindcss from '@tailwindcss/vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  define: { global: 'globalThis' },
  resolve: {
    alias: {
      process: 'process/browser',
      buffer: 'buffer',
      util: 'util',
      crypto: path.resolve(__dirname, 'src/lib/crypto-shim.ts'),
      stream: 'stream-browserify',
      events: 'events',
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    wasm(),
    viteStaticCopy({
      targets: [
        {
          src: '../contract/src/managed/govfund',
          dest: 'managed',
        },
      ],
    }),
  ],
  server: {
    fs: { allow: ['..'] },
  },
  optimizeDeps: {
    include: ['level', 'browser-level', 'abstract-level', 'level-supports', 'level-transcoder'],
    esbuildOptions: { target: 'esnext' },
  },
  build: { target: 'esnext' },
  worker: { format: 'es' },
  assetsInclude: ['**/*.wasm'],
  publicDir: 'public',
});
