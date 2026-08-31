import { copyFile, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const distDirectory = resolve('dist')
const indexPath = resolve(distDirectory, 'index.html')

await copyFile(indexPath, resolve(distDirectory, '404.html'))

const indexHtml = await readFile(indexPath, 'utf8')
await writeFile(resolve(distDirectory, '.nojekyll'), '')
await writeFile(indexPath, indexHtml)
