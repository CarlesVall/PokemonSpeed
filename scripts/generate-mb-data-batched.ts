import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createCatalog } from './catalog-shared.ts'

type RawEntry = { rawName: string; imageFile: string; isMega: boolean; occurrence: number }
type PokemonEntry = {
  id: string; dexNumber: number; displayName: string; form: string | null
  baseStats: { speed: number }; types: string[]; isMega: boolean
  assets: { wikidexPageUrl: string; imageUrl: string; imageAlt: string }
}
type Page = { title: string; missing?: boolean; revisions?: Array<{ slots: { main: { content: string } } }> }

const api = (params: Record<string, string>) => `https://www.wikidex.net/api.php?${new URLSearchParams({ action: 'query', format: 'json', formatversion: '2', prop: 'revisions', rvprop: 'content', rvslots: 'main', ...params })}`
const clean = (value: string) => value.replace(/[\u200B\uFEFF]/g, '').trim()
const slug = (value: string) => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

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

async function queryPages(titles: string[]) {
  const response = await fetch(api({ titles: titles.join('|') }))
  if (!response.ok) throw new Error(`WikiDex respondió ${response.status}`)
  const payload = (await response.json()) as { query?: { pages?: Page[] } }
  return payload.query?.pages ?? []
}

async function getAllPages(titles: string[]) {
  const result = new Map<string, string>()
  for (let index = 0; index < titles.length; index += 45) {
    const pages = await queryPages(titles.slice(index, index + 45))
    for (const page of pages) {
      const content = page.revisions?.[0]?.slots.main.content
      if (!page.missing && content) result.set(page.title, content)
    }
  }
  return result
}

function entries(section: string, isMega: boolean): RawEntry[] {
  const occurrences = new Map<string, number>()
  const result: RawEntry[] = []
  for (const found of section.matchAll(/\{\{Pokémon tipo\|Pokémon\s*=\s*([^|}]+)\|IMG\s*=\s*([^|}]+)/g)) {
    const rawName = clean(found[1]); const key = slug(rawName); const occurrence = (occurrences.get(key) ?? 0) + 1
    occurrences.set(key, occurrence); result.push({ rawName, imageFile: clean(found[2]), isMega, occurrence })
  }
  return result
}

function between(source: string, start: string, end: string) {
  const from = source.indexOf(start); const to = source.indexOf(end)
  if (from < 0 || to < 0) throw new Error('No se localizaron las listas de M-B.')
  return source.slice(from, to)
}
function escapeRegExp(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }
function section(source: string, name: string) { const matches = [...source.matchAll(new RegExp(`={3,}\s*${escapeRegExp(name)}\s*={3,}([\s\S]*?)(?=\n={2,}|$)`, 'gi'))]; return matches.at(-1)?.[1] }function speed(source: string, sectionName?: string) {
  const pieces = source.split('===')
  const candidates = sectionName
    ? pieces.flatMap((part, index) => part.trimStart().startsWith(sectionName) ? [pieces[index + 1] ?? ''] : []).reverse()
    : []
  for (const target of [...candidates, source]) {
    const found = target.match(/^\|\s*Velocidad\s*=\s*(\d+)\s*$/m)
    if (found) return Number(found[1])
  }
  return undefined
}function dex(source: string) { const found = source.match(/^\|\s*númeronacional\s*=\s*(\d+)\s*$/m); return found ? Number(found[1]) : undefined }
function redirect(source: string) { const found = source.match(/^#(?:REDIRECT|REDIRECCIÓN)\s*\[\[([^#\]]+)(?:#([^\]]+))?\]\]/im); return found ? { page: clean(found[1]), section: clean(found[2] ?? '') } : undefined }

async function main() {
  const [regulation] = await queryPages(['Reglamento M-B'])
  const source = regulation.revisions?.[0]?.slots.main.content
  if (!source) throw new Error('No se pudo cargar Reglamento M-B.')
  const species = entries(between(source, '=== Pokémon permitidos ===', '=== Megaevoluciones permitidas ==='), false)
  const megas = entries(between(source, '=== Megaevoluciones permitidas ===', '== Torneos =='), true)
  const listed = [...species, ...megas]
  const directPages = await getAllPages([...new Set(listed.map((entry) => entry.rawName))])
  const redirectTargets = [...new Set([...directPages.values()].flatMap((text) => { const target = redirect(text); return target ? [target.page] : [] }))]
  const targetPages = await getAllPages(redirectTargets)
  const catalog: PokemonEntry[] = listed.map((entry) => {
    const direct = directPages.get(entry.rawName)
    if (!direct) throw new Error(`Página no encontrada: ${entry.rawName}`)
    const target = redirect(direct)
    const pageTitle = target?.page ?? entry.rawName
    const content = target ? targetPages.get(pageTitle) : direct
    if (!content) throw new Error(`Destino no encontrado: ${pageTitle}`)
    const key = slug(entry.rawName)
    const special = specialForms[key]?.[entry.occurrence - 1]
    const displayName = special?.displayName ?? entry.rawName
    const stat = speed(content, special?.section ?? target?.section)
    const nationalDex = dex(content)
    if (stat === undefined || nationalDex === undefined) throw new Error(`Datos incompletos: ${displayName}`)
    const form = entry.isMega ? 'Mega' : special?.displayName.match(/\(([^)]+)\)/)?.[1] ?? null
    return {
      id: `${slug(entry.rawName)}${entry.occurrence > 1 ? `-${entry.occurrence}` : ''}`,
      dexNumber: nationalDex, displayName, form, baseStats: { speed: stat }, types: [], isMega: entry.isMega,
      assets: { wikidexPageUrl: `https://www.wikidex.net/wiki/${encodeURIComponent(pageTitle.replace(/ /g, '_'))}`, imageUrl: `https://www.wikidex.net/wiki/Especial:Redirigir_archivo/${encodeURIComponent(entry.imageFile.replace(/ /g, '_'))}`, imageAlt: `Ilustración de ${displayName} en WikiDex` },
    }
  })
  if (new Set(catalog.map((entry) => entry.id)).size !== catalog.length) throw new Error('Hay IDs duplicados.')
  await mkdir(resolve('src/data'), { recursive: true })
  await writeFile(resolve('src/data/pokemon-mb.json'), `${JSON.stringify(createCatalog(catalog), null, 2)}\n`)
  console.log(`Dataset M-B: ${species.length} especies/formas + ${megas.length} megas = ${catalog.length} entradas.`)
}
main().catch((error: unknown) => { console.error(error); process.exitCode = 1 })






