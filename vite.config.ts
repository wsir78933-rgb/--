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
        options: 'src/options/index.html'
      }
    }
  }
});