import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { PokemonEntry } from '../src/data/types.ts'

type Dataset = { pokemon: PokemonEntry[] }
type ImagePage = { title: string; imageinfo?: Array<{ url: string }> }

const dataPath = resolve('src/data/pokemon-mb.json')

const filenameFrom = (url: string) => decodeURIComponent(url.split('/').at(-1) ?? '').replaceAll('_', ' ')

async function loadBatch(filenames: string[]) {
  const parameters = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    prop: 'imageinfo',
    iiprop: 'url',
    titles: filenames.map((filename) => `Archivo:${filename}`).join('|'),
  })
  const response = await fetch(`https://www.wikidex.net/api.php?${parameters}`)
  if (!response.ok) throw new Error(`WikiDex respondió ${response.status} al resolver imágenes.`)
  const payload = (await response.json()) as { query?: { pages?: ImagePage[] } }
  return payload.query?.pages ?? []
}

async function main() {
  const catalog = JSON.parse(await readFile(dataPath, 'utf8')) as Dataset
  const entries = catalog.pokemon
  const filenames = [...new Set(entries.map((entry) => filenameFrom(entry.assets.imageUrl)))]
  const urls = new Map<string, string>()

  for (let index = 0; index < filenames.length; index += 45) {
    const batch = filenames.slice(index, index + 45)
    const pages = await loadBatch(batch)
    for (const page of pages) {
      const filename = page.title.replace(/^Archivo:/, '')
      const url = page.imageinfo?.[0]?.url
      if (url) urls.set(filename, url)
    }
  }

  const unresolved = entries.filter((entry) => !urls.has(filenameFrom(entry.assets.imageUrl)))
  if (unresolved.length > 0) throw new Error(`No se encontraron ${unresolved.length} imágenes: ${unresolved.slice(0, 3).map((entry) => entry.id).join(', ')}`)

  const updated = entries.map((entry) => ({ ...entry, assets: { ...entry.assets, imageUrl: urls.get(filenameFrom(entry.assets.imageUrl))! } }))
  await writeFile(dataPath, `${JSON.stringify({ ...catalog, pokemon: updated }, null, 2)}\n`)
  console.log(`URLs de imagen resueltas: ${updated.length}.`)
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1 })
