import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDirectory = dirname(fileURLToPath(import.meta.url))
const packageRoot = resolve(currentDirectory, '..')
const targetFile = resolve(packageRoot, 'dist/styles.css')
const sourceFiles = [
  resolve(packageRoot, 'src/styles/base.css'),
  resolve(packageRoot, 'src/styles/toolbar.css'),
  resolve(packageRoot, 'src/styles/selection.css'),
  resolve(packageRoot, 'src/styles/dialogs.css'),
  resolve(packageRoot, 'src/styles/inline-edit.css'),
]

mkdirSync(dirname(targetFile), { recursive: true })
writeFileSync(targetFile, `${sourceFiles.map((sourceFile) => readFileSync(sourceFile, 'utf8').trimEnd()).join('\n\n')}\n`, 'utf8')
