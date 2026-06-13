import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the built bundle works when served from any path — including a
  // folder copied onto an offline machine.
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020',
  },
  server: {
    // Allow importing the shared verdict classifier from the parent project dir.
    fs: { allow: ['..', '../..'] },
  },
});
