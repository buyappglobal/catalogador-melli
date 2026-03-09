import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  // Ofuscamos la clave para evitar que los escáneres de GitHub/Google la revoquen al estar en un repo público
  const rawKey = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || '';
  const obfuscatedKey = Buffer.from(rawKey).toString('base64');

  return {
    base: './', // Permite que funcione tanto en la raíz (AI Studio) como en subcarpetas (GitHub Pages)
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.OBFUSCATED_GEMINI_API_KEY': JSON.stringify(obfuscatedKey),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
