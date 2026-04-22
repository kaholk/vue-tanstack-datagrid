import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import Icons from 'unplugin-icons/vite'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    Icons({
      
    }),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@testproject/datagrid/styles.css': fileURLToPath(new URL('../packages/datagrid/src/styles.css', import.meta.url)),
      '@testproject/datagrid': fileURLToPath(new URL('../packages/datagrid/src/index.ts', import.meta.url)),
      '@tanstack/vue-table': fileURLToPath(
        new URL('./node_modules/@tanstack/vue-table/build/lib/index.mjs', import.meta.url),
      ),
      '@tanstack/vue-virtual': fileURLToPath(
        new URL('./node_modules/@tanstack/vue-virtual/dist/esm/index.js', import.meta.url),
      ),
    },
  },
})
