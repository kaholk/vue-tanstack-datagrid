import { cpSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDirectory = dirname(fileURLToPath(import.meta.url))
const packageRoot = resolve(currentDirectory, '..')
const sourceFile = resolve(packageRoot, 'src/styles.css')
const targetFile = resolve(packageRoot, 'dist/styles.css')

mkdirSync(dirname(targetFile), { recursive: true })
cpSync(sourceFile, targetFile)
