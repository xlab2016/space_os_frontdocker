import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@frontdocker/livesdk': path.resolve(__dirname, '../packages/livesdk/src'),
      '@frontdocker/livesdk-client': path.resolve(__dirname, '../packages/livesdk-client/src'),
    },
  },
  server: {
    port: 3000,
    cors: true,
  },
  build: {
    sourcemap: true,
  },
});
