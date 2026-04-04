import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          if (id.includes('recharts')) {
            return 'charts';
          }

          if (id.includes('semiotic')) {
            return 'semiotic';
          }

          if (id.includes('pretext')) {
            return 'pretext';
          }

          if (id.includes('lucide-react')) {
            return 'icons';
          }

          if (id.includes('react-router')) {
            return 'router';
          }

          if (id.includes('@google/genai')) {
            return 'gemini';
          }

          if (
            id.includes('/react/')
            || id.includes('/react-dom/')
            || id.includes('/scheduler/')
            || id.includes('/use-sync-external-store/')
          ) {
            return 'react-vendor';
          }

          return undefined;
        },
      },
    },
  },
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
