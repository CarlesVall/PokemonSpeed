import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { POKEMON_TYPES, type PokemonEntry } from '../src/data/types.ts'
import { createRegulationCatalog } from './catalog-shared.ts'
import { getRegulationConfig } from './regulation-config.ts'

type RawEntry = { rawName: string; imageFile: string; isMega: boolean; occurrence: number }
type Page = { title: string; missing?: boolean; revisions?: Array<{ slots: { main: { content: string } } }> }
type ImagePage = { title: string; imageinfo?: Array<{ url: string }> }
type Catalog = { pokemon: PokemonEntry[] }

const api = (params: Record<string, string>) =>
  `https://www.wikidex.net/api.php?${new URLSearchParams({ action: 'query', format: 'json', formatversion: '2', prop: 'revisions', rvprop: 'content', rvslots: 'main', ...params })}`
const clean = (value: string) => value.replace(/[\u200B\uFEFF]/g, '').trim()
const slug = (value: string) => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
const pause = (milliseconds: number) => new Promise((done) => setTimeout(done, milliseconds))
const catalogPath = (code: string) => resolve(`src/data/pokemon-${code.replace('-', '').toLowerCase()}.json`)

const specialForms: Record<string, Array<{ displayName: string; section: string }>> = {
  meowstic: [{ displayName: 'Meowstic (Macho)', section: 'Meowstic macho' }, { displayName: 'Meowstic (Hembra)', section: 'Meowstic hembra' }],
  gourgeist: [
    { displayName: 'Gourgeist (Variante Mediana)', section: 'Gourgeist forma mediana' },
    { displayName: 'Gourgeist (Variante Pequeña)', section: 'Gourgeist forma pequeña' },
    { displayName: 'Gourgeist (Variante Grande)', section: 'Gourgeist forma grande' },
    { displayName: 'Gourgeist (Variante Enorme)', section: 'Gourgeist forma enorme' },
  ],
  basculegion: [{ displayName: 'Basculegion (Macho)', section: 'Basculegion macho' }, { displayName: 'Basculegion (Hembra)', section: 'Basculegion hembra' }],
}

// Excepciones contrastadas para formas que WikiDex no expone con la estadística esperada.
const speedOverrides: Record<string, number> = {
  gourgeist: 84, 'gourgeist-2': 99, 'gourgeist-3': 69, 'gourgeist-4': 54,
  'mega-raichu-x': 110, 'mega-alakazam': 150, 'mega-starmie': 120,
  'mega-pinsir': 105, 'mega-scizor': 75, 'mega-heracross': 75,
  'mega-sableye': 20, 'mega-medicham': 100, 'mega-manectric': 135,
  'mega-sharpedo': 105, 'mega-camerupt': 20, 'mega-banette': 75,
  'mega-lopunny': 135, 'mega-abomasnow': 30, 'mega-gallade': 110,
  'mega-meowstic': 124, 'mega-crabominable': 33, 'mega-glimmora': 101,
}

const typeOverrides: Record<string, string[]> = {
  'floette-eterna': ['Hada'], 'mega-floette': ['Hada'],
  'mega-charizard-x': ['Fuego', 'Dragón'], 'rotom-calor': ['Eléctrico', 'Fuego'],
  'rotom-lavado': ['Eléctrico', 'Agua'], 'rotom-frio': ['Eléctrico', 'Hielo'],
  'rotom-ventilador': ['Eléctrico', 'Volador'], 'rotom-corte': ['Eléctrico', 'Planta'],
}

const argument = (name: string) => {
  const index = process.argv.indexOf(name)
  return index < 0 ? undefined : process.argv[index + 1]
}

async function queryPages(titles: string[]) {
  const response = await fetch(api({ titles: titles.join('|') }))
  if (!response.ok) throw new Error(`WikiDex respondió ${response.status}.`)
  const payload = await response.json() as { query?: { pages?: Page[] } }
  return payload.query?.pages ?? []
}

async function getAllPages(titles: string[]) {
  const result = new Map<string, string>()
  for (let index = 0; index < titles.length; index += 45) {
    for (const page of await queryPages(titles.slice(index, index + 45))) {
      const content = page.revisions?.[0]?.slots.main.content
      if (!page.missing && content) result.set(page.title, content)
    }
  }
  return result
}

function entries(source: string, isMega: boolean): RawEntry[] {
  const occurrences = new Map<string, number>()
  return [...source.matchAll(/\{\{Pokémon tipo\|Pokémon\s*=\s*([^|}]+)\|IMG\s*=\s*([^|}]+)/g)].map((found) => {
    const rawName = clean(found[1]); const key = slug(rawName)
    const occurrence = (occurrences.get(key) ?? 0) + 1
    occurrences.set(key, occurrence)
    return { rawName, imageFile: clean(found[2]), isMega, occurrence }
  })
}

function between(source: string, start: string, end: string) {
  const from = source.indexOf(start); const to = source.indexOf(end)
  if (from < 0 || to < 0 || to <= from) throw new Error('No se localizaron las listas de Pokémon permitidos y megaevoluciones.')
  return source.slice(from, to)
}

function speed(source: string, sectionName?: string) {
  const pieces = source.split('===')
  const candidates = sectionName
    ? pieces.flatMap((part, index) => part.trimStart().startsWith(sectionName) ? [pieces[index + 1] ?? ''] : []).reverse()
    : []
  for (const target of [...candidates, source]) {
    const found = target.match(/^\|\s*Velocidad\s*=\s*(\d+)\s*$/m)
    if (found) return Number(found[1])
  }
  return undefined
}

function types(source: string, id: string) {
  const override = typeOverrides[id]
  if (override) return override
  const first = source.match(/^\|\s*tipo1\s*=\s*([^\r\n]+)/im)?.[1]?.trim()
  const second = source.match(/^\|\s*tipo2\s*=\s*([^\r\n]+)/im)?.[1]?.trim()
  const resolved = first ? [first, ...(second ? [second] : [])] : []
  if (!resolved.length || resolved.some((type) => !POKEMON_TYPES.includes(type as typeof POKEMON_TYPES[number]))) {
    throw new Error(`Tipos no válidos para ${id}: ${resolved.join(', ') || 'ninguno'}.`)
  }
  return resolved
}

function dex(source: string) {
  const found = source.match(/^\|\s*númeronacional\s*=\s*(\d+)\s*$/m)
  return found ? Number(found[1]) : undefined
}

function redirect(source: string) {
  const found = source.match(/^#(?:REDIRECT|REDIRECCIÓN)\s*\[\[([^#\]]+)(?:#([^\]]+))?\]\]/im)
  return found ? { page: clean(found[1]), section: clean(found[2] ?? '') } : undefined
}

async function imageUrls(filenames: string[]) {
  const result = new Map<string, string>()
  for (let index = 0; index < filenames.length; index += 30) {
    const titles = filenames.slice(index, index + 30).map((filename) => `Archivo:${filename}`).join('|')
    let payload: { query?: { pages?: ImagePage[] } } | undefined
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await fetch(`https://www.wikidex.net/api.php?${new URLSearchParams({ action: 'query', format: 'json', formatversion: '2', prop: 'imageinfo', iiprop: 'url', titles })}`)
      if (response.ok) {
        payload = await response.json() as { query?: { pages?: ImagePage[] } }
        break
      }
      if (response.status !== 429 || attempt === 4) throw new Error(`WikiDex respondió ${response.status} al resolver imágenes.`)
      await pause(1600 * (attempt + 1))
    }
    if (!payload) throw new Error('WikiDex no devolvió información de imágenes.')
    for (const page of payload.query?.pages ?? []) {
      const url = page.imageinfo?.[0]?.url
      if (url) result.set(page.title.replace(/^Archivo:/, ''), url)
    }
    await pause(250)
  }
  return result
}

async function completenessIssue(config: ReturnType<typeof getRegulationConfig>, catalog: PokemonEntry[]) {
  if (!config.baselineCode || !config.minimumNewSpecies) return undefined
  const baselinePath = catalogPath(config.baselineCode)
  const baseline = JSON.parse(await readFile(baselinePath, 'utf8')) as Catalog
  const baselineIds = new Set(baseline.pokemon.map((entry) => entry.id))
  const additions = catalog.filter((entry) => !entry.isMega && !baselineIds.has(entry.id)).map((entry) => entry.id)
  if (additions.length >= config.minimumNewSpecies) return undefined
  return `${config.code} aporta ${additions.length} especies nuevas frente a ${config.baselineCode}; se esperan al menos ${config.minimumNewSpecies}. Posible lista incompleta en WikiDex.`
}
function report(previous: PokemonEntry[], next: PokemonEntry[]) {
  const before = new Map(previous.map((entry) => [entry.id, entry]))
  const after = new Map(next.map((entry) => [entry.id, entry]))
  const added = next.filter((entry) => !before.has(entry.id)).map((entry) => entry.id)
  const removed = previous.filter((entry) => !after.has(entry.id)).map((entry) => entry.id)
  const changed = next.filter((entry) => {
    const old = before.get(entry.id)
    return old && (old.baseStats.speed !== entry.baseStats.speed || old.types.join('/') !== entry.types.join('/') || old.isMega !== entry.isMega)
  }).map((entry) => entry.id)
  const describe = (items: string[]) => items.length ? `${items.length} (${items.slice(0, 12).join(', ')}${items.length > 12 ? ', …' : ''})` : '0'
  console.log(`Cambios: altas ${describe(added)} · bajas ${describe(removed)} · modificados ${describe(changed)}.`)
}

async function main() {
  const code = argument('--code')
  if (!code) throw new Error('Uso: npm run update:regulation -- --code M-C [--write]')
  const config = getRegulationConfig(code)
  const outputPath = catalogPath(config.code)
  const [regulation] = await queryPages([config.wikidexPage])
  const source = regulation.revisions?.[0]?.slots.main.content
  if (!source) throw new Error(`No se pudo cargar ${config.wikidexPage}.`)

  const species = entries(between(source, '=== Pokémon permitidos ===', '=== Megaevoluciones permitidas ==='), false)
  const megas = entries(between(source, '=== Megaevoluciones permitidas ===', '== Torneos =='), true)
  const listed = [...species, ...megas]
  const directPages = await getAllPages([...new Set(listed.map((entry) => entry.rawName))])
  const redirectTargets = [...new Set([...directPages.values()].flatMap((text) => {
    const target = redirect(text)
    return target ? [target.page] : []
  }))]
  const targetPages = await getAllPages(redirectTargets)
  const images = await imageUrls([...new Set(listed.map((entry) => entry.imageFile))])

  const catalog = listed.map((entry): PokemonEntry => {
    const direct = directPages.get(entry.rawName)
    if (!direct) throw new Error(`Página no encontrada: ${entry.rawName}.`)
    const target = redirect(direct); const pageTitle = target?.page ?? entry.rawName
    const content = target ? targetPages.get(pageTitle) : direct
    if (!content) throw new Error(`Destino no encontrado: ${pageTitle}.`)
    const id = `${slug(entry.rawName)}${entry.occurrence > 1 ? `-${entry.occurrence}` : ''}`
    const special = specialForms[slug(entry.rawName)]?.[entry.occurrence - 1]
    const displayName = special?.displayName ?? entry.rawName
    const baseSpeed = speedOverrides[id] ?? speed(content, special?.section ?? target?.section)
    const dexNumber = dex(content); const imageUrl = images.get(entry.imageFile)
    if (baseSpeed === undefined || dexNumber === undefined || !imageUrl) throw new Error(`Datos incompletos: ${displayName}.`)
    return {
      id, dexNumber, displayName,
      form: entry.isMega ? 'Mega' : special?.displayName.match(/\(([^)]+)\)/)?.[1] ?? null,
      baseStats: { speed: baseSpeed }, types: types(content, id), isMega: entry.isMega,
      assets: {
        wikidexPageUrl: `https://www.wikidex.net/wiki/${encodeURIComponent(pageTitle.replace(/ /g, '_'))}`,
        imageUrl, imageAlt: `Ilustración de ${displayName} en WikiDex`,
      },
    }
  })
  if (new Set(catalog.map((entry) => entry.id)).size !== catalog.length) throw new Error('Hay IDs duplicados.')

  let previous: PokemonEntry[] = []
  try { previous = (JSON.parse(await readFile(outputPath, 'utf8')) as Catalog).pokemon } catch (error: unknown) {
    if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error
  }
  console.log(`${config.code}: ${species.length} especies/formas + ${megas.length} megas = ${catalog.length} entradas.`)
  report(previous, catalog)
  const incomplete = await completenessIssue(config, catalog)
  if (incomplete) console.warn(`Salvaguarda: ${incomplete}`)
  console.log(`Fuentes: lista ${config.wikidexUrl} · contraste oficial ${config.officialUrl}`)
  if (!process.argv.includes('--write')) {
    console.log('Modo informe: no se ha escrito ningún archivo. Añade --write tras revisar el resultado.')
    return
  }
  if (incomplete) throw new Error(`No se escribió el catálogo: ${incomplete}`)
  const document = createRegulationCatalog(config.code, {
    eligibility: { name: `WikiDex · ${config.wikidexPage}`, url: config.wikidexUrl },
    speeds: { name: 'WikiDex · fichas de Pokémon', url: 'https://www.wikidex.net/' },
    artwork: { name: 'WikiDex CDN', url: 'https://www.wikidex.net/' },
    officialRegulation: { name: `Pokémon Champions · Regulation Set ${config.code}`, url: config.officialUrl },
  }, catalog)
  await writeFile(outputPath, `${JSON.stringify(document, null, 2)}\n`)
  console.log(`Catálogo escrito en ${outputPath}.`)
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1 })
