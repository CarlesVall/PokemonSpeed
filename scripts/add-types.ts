import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { POKEMON_TYPES, type PokemonEntry } from '../src/data/types.ts'

type Dataset = { pokemon: PokemonEntry[] }
type Page = { title: string; revisions?: Array<{ slots: { main: { content: string } } }> }

const dataPath = resolve('src/data/pokemon-mb.json')
const typeOverrides: Record<string, string[]> = {
  'floette-eterna': ['Hada'],
  'mega-floette': ['Hada'],
  'mega-charizard-x': ['Fuego', 'Dragón'],
  'rotom-calor': ['Eléctrico', 'Fuego'],
  'rotom-lavado': ['Eléctrico', 'Agua'],
  'rotom-frio': ['Eléctrico', 'Hielo'],
  'rotom-ventilador': ['Eléctrico', 'Volador'],
  'rotom-corte': ['Eléctrico', 'Planta'],
}

const allowedTypes = new Set<string>(POKEMON_TYPES)

const titleFromUrl = (url: string) => decodeURIComponent(url.split('/').at(-1) ?? '').replaceAll('_', ' ')

async function loadBatch(titles: string[]) {
  const parameters = new URLSearchParams({
    action: 'query', format: 'json', formatversion: '2', prop: 'revisions', rvprop: 'content', rvslots: 'main',
    titles: titles.join('|'),
  })
  const response = await fetch(`https://www.wikidex.net/api.php?${parameters}`)
  if (!response.ok) throw new Error(`WikiDex respondió ${response.status} al obtener tipos.`)
  const payload = (await response.json()) as { query?: { pages?: Page[] } }
  return payload.query?.pages ?? []
}

function typesFrom(source: string) {
  const typeOne = source.match(/^\|\s*tipo1\s*=\s*([^\r\n]+)/im)?.[1]?.trim()
  const typeTwo = source.match(/^\|\s*tipo2\s*=\s*([^\r\n]+)/im)?.[1]?.trim()
  if (!typeOne) throw new Error('No se encontró tipo1 en una página de WikiDex.')
  const types = typeTwo ? [typeOne, typeTwo] : [typeOne]
  if (types.some((type) => !allowedTypes.has(type))) throw new Error(`Tipo inv?lido extra?do de WikiDex: ${types.join(', ')}`)
  return types
}

async function main() {
  const catalog = JSON.parse(await readFile(dataPath, 'utf8')) as Dataset
  const entries = catalog.pokemon
  const titles = [...new Set(entries.map((entry) => titleFromUrl(entry.assets.wikidexPageUrl)))]
  const sources = new Map<string, string>()

  for (let index = 0; index < titles.length; index += 40) {
    for (const page of await loadBatch(titles.slice(index, index + 40))) {
      const source = page.revisions?.[0]?.slots.main.content
      if (source) sources.set(page.title, source)
    }
  }

  const updated = entries.map((entry) => {
    const types = typeOverrides[entry.id] ?? typesFrom(sources.get(titleFromUrl(entry.assets.wikidexPageUrl)) ?? '')
    return { ...entry, types }
  })
  await writeFile(dataPath, `${JSON.stringify({ ...catalog, pokemon: updated }, null, 2)}\n`)
  console.log(`Tipos resueltos para ${updated.length} entradas.`)
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1 })
