import { resolve } from 'path';
import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    plugins: [react()],
    build: {
      rollupOptions: {
        // One page per screen.
        input: {
          main: resolve(__dirname, 'src/renderer/main.html'),
          touch: resolve(__dirname, 'src/renderer/touch.html'),
        },
      },
    },
  },
});
