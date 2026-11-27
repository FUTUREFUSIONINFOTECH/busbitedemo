
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(() => ({
  // GitHub Pages project repository URL:
  // https://futurefusioninfotech.github.io/busbitedemo/
 base: '/busbitedemo/',

  plugins: [
    react(),
    tailwindcss(),

    {
      name: 'copy-unbundled-src-assets',
      apply: 'build',

      closeBundle() {
        const distDir = path.resolve(rootDir, 'dist');
        const srcAssets = path.resolve(rootDir, 'src/assets');
        const distAssets = path.resolve(distDir, 'src/assets');

        if (fs.existsSync(srcAssets) && fs.existsSync(distDir)) {
          fs.mkdirSync(distAssets, { recursive: true });

          fs.cpSync(srcAssets, distAssets, {
            recursive: true,
            force: true,
          });

          console.log(
            'Successfully copied src/assets to dist/src/assets'
          );
        }
      },
    },
  ],

  resolve: {
    alias: {
      '@': rootDir,
    },
  },

  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,

    hmr: process.env.DISABLE_HMR !== 'true',

    watch:
      process.env.DISABLE_HMR === 'true'
        ? null
        : {},
  },

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsDir: 'assets',
  },
}));
