import { defineConfig } from 'vite'
import vueJsx from '@vitejs/plugin-vue-jsx'
import Icons from 'unplugin-icons/vite'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = dirname(fileURLToPath(import.meta.url))
const cssTargetFile = resolve(packageRoot, 'dist/styles.css')
const cssSourceFiles = [
  resolve(packageRoot, 'src/styles/base.css'),
  resolve(packageRoot, 'src/styles/toolbar.css'),
  resolve(packageRoot, 'src/styles/selection.css'),
  resolve(packageRoot, 'src/styles/dialogs.css'),
  resolve(packageRoot, 'src/styles/inline-edit.css'),
]

const copyStyles = () => {
  mkdirSync(dirname(cssTargetFile), { recursive: true })
  writeFileSync(
    cssTargetFile,
    `${cssSourceFiles.map((sourceFile) => readFileSync(sourceFile, 'utf8').trimEnd()).join('\n\n')}\n`,
    'utf8',
  )
}

export default defineConfig({
  base: './',
  plugins: [
    vueJsx(),
    Icons(),
    {
      name: 'copy-datagrid-styles',
      buildStart() {
        cssSourceFiles.forEach((sourceFile) => this.addWatchFile(sourceFile))
      },
      writeBundle() {
        copyStyles()
      },
    },
  ],
  build: {
    copyPublicDir: false,
    lib: {
      entry: './src/index.ts',
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'es' ? 'index.js' : 'index.cjs'),
    },
    rollupOptions: {
      external: ['vue', '@tanstack/vue-table', '@tanstack/vue-virtual', 'exceljs'],
    },
  },
})
