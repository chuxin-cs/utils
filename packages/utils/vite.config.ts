import { defineConfig } from 'vite';

export default defineConfig({
  // 打包配置
  build: {
    lib: {
      entry: './lib/main.ts',
      name: 'Utils',
      fileName: (format) => `utils.${format}.js`,
    },
  },
  rollupOptions: {
    // 确保外部化不需要打包的依赖
    external: [],
    output: {
      globals: {
        // 如有外部依赖需在此配置全局变量名
      },
    },
  },
});
