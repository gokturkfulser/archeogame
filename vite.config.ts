import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// One static page per act plus a small index page. Add new acts to `input`.
export default defineConfig({
  base: '/',
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        index: fileURLToPath(new URL('./index.html', import.meta.url)),
        efes: fileURLToPath(new URL('./efes/index.html', import.meta.url)),
        hattusa: fileURLToPath(new URL('./hattusa/index.html', import.meta.url)),
        baslangic: fileURLToPath(new URL('./baslangic/index.html', import.meta.url)),
      },
    },
  },
});
