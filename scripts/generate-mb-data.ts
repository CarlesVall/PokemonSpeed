import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createCatalog } from './catalog-shared.ts'

type ListedEntry = {
  rawName: string
  imageFile: string
  isMega: boolean
  occurrence: number
}

type PokemonEntry = {
  id: string
  dexNumber: number
  displayName: string
  form: string | null
  baseStats: { speed: number }
  types: string[]
  isMega: boolean
  assets: { wikidexPageUrl: string; imageUrl: string; imageAlt: string }
}

const apiUrl = (parameters: Record<string, string>) =>
  `https://www.wikidex.net/api.php?${new URLSearchParams({
    action: 'parse',
    format: 'json',
    prop: 'wikitext',
    ...parameters,
  })}`

const clean = (value: string) => value.replace(/[\u200B\uFEFF]/g, '').trim()
const slug = (value: string) =>
  clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const specialForms: Record<string, Array<{ displayName: string; section: string }>> = {
  meowstic: [
    { displayName: 'Meowstic (Macho)', section: 'Meowstic macho' },
    { displayName: 'Meowstic (Hembra)', section: 'Meowstic hembra' },
  ],
  gourgeist: [
    { displayName: 'Gourgeist (Variante Mediana)', section: 'Gourgeist forma mediana' },
    { displayName: 'Gourgeist (Variante Pequeña)', section: 'Gourgeist forma pequeña' },
    { displayName: 'Gourgeist (Variante Grande)', section: 'Gourgeist forma grande' },
    { displayName: 'Gourgeist (Variante Enorme)', section: 'Gourgeist forma enorme' },
  ],
  basculegion: [
    { displayName: 'Basculegion (Macho)', section: 'Basculegion macho' },
    { displayName: 'Basculegion (Hembra)', section: 'Basculegion hembra' },
  ],
}

async function fetchWikitext(page: string): Promise<string> {
  const response = await fetch(apiUrl({ page }))
  if (!response.ok) throw new Error(`WikiDex respondió ${response.status} para ${page}`)
  const payload = (await response.json()) as { parse?: { wikitext?: { '*': string } } }
  const text = payload.parse?.wikitext?.['*']
  if (!text) throw new Error(`No se encontró wikitext para ${page}`)
  return text
}

function extractEntries(section: string, isMega: boolean): ListedEntry[] {
  const entries: ListedEntry[] = []
  const occurrences = new Map<string, number>()
  const matcher = /\{\{Pokémon tipo\|Pokémon\s*=\s*([^|}]+)\|IMG\s*=\s*([^|}]+)/g
  for (const match of section.matchAll(matcher)) {
    const rawName = clean(match[1])
    const key = slug(rawName)
    const occurrence = (occurrences.get(key) ?? 0) + 1
    occurrences.set(key, occurrence)
    entries.push({ rawName, imageFile: clean(match[2]), isMega, occurrence })
  }
  return entries
}

function sectionBetween(source: string, start: string, end: string): string {
  const startIndex = source.indexOf(start)
  const endIndex = source.indexOf(end)
  if (startIndex < 0 || endIndex < 0 || endIndex <= startIndex) {
    throw new Error('No se pudieron localizar las secciones M-B en WikiDex.')
  }
  return source.slice(startIndex, endIndex)
}

function escapeExpression(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function headingSlice(source: string, heading: string): string | undefined {
  const expression = new RegExp(
    `={3,}\\s*${escapeExpression(heading)}\\s*={3,}([\\s\\S]*?)(?=\\n={2,}|$)`,
    'i',
  )
  return source.match(expression)?.[1]
}

function statFrom(source: string, heading?: string): number | undefined {
  const targets = [headingSlice(source, heading ?? ''), source]
  for (const target of targets) {
    const match = target?.match(/^\|\s*Velocidad\s*=\s*(\d+)\s*$/im)
    if (match) return Number(match[1])
  }
  return undefined
}

function nationalDexFrom(source: string): number | undefined {
  const match = source.match(/^\|\s*númeronacional\s*=\s*(\d+)\s*$/im)
  return match ? Number(match[1]) : undefined
}

async function resolveStats(page: string, desiredHeading?: string): Promise<{ source: string; title: string; speed: number }> {
  const source = await fetchWikitext(page)
  const redirect = source.match(/^#REDIRECT\s*\[\[([^#\]]+)(?:#([^\]]+))?\]\]/im)
  if (redirect) {
    return resolveStats(clean(redirect[1]), clean(redirect[2] || desiredHeading || page))
  }
  const speed = statFrom(source, desiredHeading) ?? statFrom(source, page)
  if (speed === undefined) throw new Error(`No se encontró Velocidad Base para ${page}${desiredHeading ? ` (${desiredHeading})` : ''}`)
  return { source, title: page, speed }
}

function displayDetails(entry: ListedEntry) {
  const key = slug(entry.rawName)
  const special = specialForms[key]?.[entry.occurrence - 1]
  const displayName = special?.displayName ?? entry.rawName
  const inferredForm = special?.displayName.match(/\(([^)]+)\)/)?.[1] ?? null
  return { displayName, heading: special?.section, form: inferredForm }
}

async function mapWithConcurrency<T, R>(items: T[], worker: (item: T) => Promise<R>, limit = 1): Promise<R[]> {
  const results: R[] = []
  let cursor = 0
  const run = async () => {
    while (cursor < items.length) {
      const current = cursor++
      results[current] = await worker(items[current])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run))
  return results
}

async function main() {
  const regulation = await fetchWikitext('Reglamento M-B')
  const species = extractEntries(
    sectionBetween(regulation, '=== Pokémon permitidos ===', '=== Megaevoluciones permitidas ==='),
    false,
  )
  const megas = extractEntries(sectionBetween(regulation, '=== Megaevoluciones permitidas ===', '== Torneos =='), true)
  const listed = [...species, ...megas]

  const data = await mapWithConcurrency(listed, async (entry): Promise<PokemonEntry> => {
    const details = displayDetails(entry)
    const { source, title, speed } = await resolveStats(entry.rawName, details.heading)
    const dexNumber = nationalDexFrom(source)
    if (dexNumber === undefined) throw new Error(`No se encontró número nacional para ${entry.rawName}`)
    const form = entry.isMega ? 'Mega' : details.form
    const id = `${slug(entry.rawName)}${entry.occurrence > 1 ? `-${entry.occurrence}` : ''}`
    return {
      id,
      dexNumber,
      displayName: details.displayName,
      form,
      baseStats: { speed },
      types: [],
      isMega: entry.isMega,
      assets: { wikidexPageUrl: `https://www.wikidex.net/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`, imageUrl: `https://www.wikidex.net/wiki/Especial:Redirigir_archivo/${encodeURIComponent(entry.imageFile.replace(/ /g, '_'))}`, imageAlt: `Ilustración de ${details.displayName} en WikiDex` },
    }
  })

  const unique = new Set(data.map((entry) => entry.id))
  if (unique.size !== data.length) throw new Error('El importador produjo IDs duplicados.')

  await mkdir(resolve('src/data'), { recursive: true })
  await writeFile(resolve('src/data/pokemon-mb.json'), `${JSON.stringify(createCatalog(data), null, 2)}\n`)
  console.log(`Dataset M-B generado: ${species.length} especies/formas + ${megas.length} megas = ${data.length} entradas.`)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})


