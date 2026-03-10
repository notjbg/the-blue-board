import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: false,
  build: {
    outDir: 'public/js',
    emptyOutDir: false,
    lib: {
      entry: 'src/dashboard/main.js',
      formats: ['iife'],
      name: 'BB',
      fileName: () => 'dashboard.js',
    },
    rollupOptions: {
      external: ['leaflet'],
      output: {
        globals: { leaflet: 'L' },
      },
    },
    minify: 'esbuild',
    sourcemap: false,
  },
});
