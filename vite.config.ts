import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { copyFileSync } from 'fs';

// Plugin to copy manifest.json and other static files
const copyManifest = () => {
  return {
    name: 'copy-manifest',
    writeBundle() {
      copyFileSync('manifest.json', 'dist/manifest.json');
      console.log('✅ Copied manifest.json to dist/');
    }
  };
};

export default defineConfig({
  plugins: [react(), copyManifest()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: 'src/popup/index.html',
        options: 'src/options/index.html',
        'service-worker': 'src/background/service-worker-simple.ts'
      },
      output: {
        entryFileNames: (chunkInfo) => {
          // Background script should be at root level for proper imports
          if (chunkInfo.name === 'service-worker') {
            return '[name].js';
          }
          return 'assets/[name]-[hash].js';
        }
      }
    }
  }
});