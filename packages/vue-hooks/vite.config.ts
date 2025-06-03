import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    minify: true,
    lib: {
      entry: path.resolve(__dirname, './lib/index.ts'),
      name: 'VueHooks',
      fileName: format => {
        return `hooks.${format}.js`
      },
    }
  }
});
