import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    minify: true,
    lib: {
      entry: path.resolve(__dirname, './lib/index.ts'),
      name: 'VueHooks',
      formats: ['es', 'cjs', 'iife'],
      fileName: format => {
        return `index.${format}.js`
      },
    }
  }
});
