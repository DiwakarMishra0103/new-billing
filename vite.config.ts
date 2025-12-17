import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Only define the specific API key string replacement. 
      // DO NOT overwrite 'process.env' as an object, as it breaks React.
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  };
});