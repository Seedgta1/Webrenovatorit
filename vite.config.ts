import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Carica le variabili d'ambiente (incluso API_KEY da Vercel)
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Inietta la API KEY nel codice client-side in modo sicuro durante la build
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  };
});