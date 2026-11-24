import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',
  build: {
    rollupOptions: {
      input: {
        home:     'index.html',
        category: 'category.html',
        viewer:   'viewer.html',
        about:    'about.html',
      },
    },
    // Keep three.js in its own chunk
    chunkSizeWarningLimit: 600,
  },
});

