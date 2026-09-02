import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // CARTO basemap key (public tile key, inlined into the bundle as import.meta.env.VITE_CARTO_BASEMAP_KEY).
  // Vite reads it from the process env (Vercel) or a local .env. Missing key is a loud warning, not a
  // build failure: a watermarked map is visible, while a failed production build on this project fails
  // no visible check (see CHANGELOG 1.7.21 / .env.example).
  const env = { ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env };
  if (!(env.VITE_CARTO_BASEMAP_KEY || '').trim()) {
    const where = process.env.VERCEL_ENV ? `Vercel ${process.env.VERCEL_ENV}` : 'local';
    console.warn(
      `\n[dashboard build] VITE_CARTO_BASEMAP_KEY is not set (${where}): CARTO tiles will render with an ` +
      `"API KEY REQUIRED" watermark. Set it in Vercel (Production + Preview) or a local .env — see .env.example.\n`
    );
  }

  return {
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
  };
});
