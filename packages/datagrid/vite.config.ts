import { defineConfig } from 'vite'
import vueJsx from '@vitejs/plugin-vue-jsx'
import Icons from 'unplugin-icons/vite'

export default defineConfig({
  plugins: [vueJsx(), Icons()],
  build: {
    copyPublicDir: false,
    lib: {
      entry: './src/index.ts',
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'es' ? 'index.js' : 'index.cjs'),
    },
    rollupOptions: {
      external: ['vue', '@tanstack/vue-table', '@tanstack/vue-virtual'],
    },
  },
})
