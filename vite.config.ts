import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  // Use relative /api path in production (Vercel), localhost in development
  const apiUrl = mode === 'production'
    ? '/api'
    : (env.VITE_API_URL || 'http://localhost:3001');

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      // Only use proxy in development
      proxy: mode !== 'production' ? {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        }
      } : undefined
    },
    plugins: [react()],
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(apiUrl)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
