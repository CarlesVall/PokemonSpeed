import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { PokemonEntry } from '../src/data/types.ts'

type Catalog = { pokemon: PokemonEntry[] }

const sourceUrl = 'https://pokebase.app/pokemon-champions/speed-tiers'

async function main() {
  const catalog = JSON.parse(await readFile(resolve('src/data/pokemon-mb.json'), 'utf8')) as Catalog
  const response = await fetch(sourceUrl)
  if (!response.ok) throw new Error(`Pok?Base respondi? ${response.status}.`)

  const speeds = new Map<string, number>()
  const html = await response.text()
  for (const match of html.matchAll(/<span class="truncate">([^<]+)<\/span><span class="ml-auto text-xs tabular-nums text-zinc-500">(\d+)<\/span>/g)) {
    speeds.set(match[1].replaceAll('&amp;', '&'), Number(match[2]))
  }

  const missing: string[] = []
  const differences: string[] = []
  const megas = catalog.pokemon.filter((pokemon) => pokemon.isMega)
  for (const entry of megas) {
    const sourceName = entry.displayName.replaceAll('-', ' ')
    const expected = speeds.get(sourceName)
    if (expected === undefined) missing.push(sourceName)
    else if (entry.baseStats.speed !== expected) differences.push(`${sourceName}: ${entry.baseStats.speed} (dataset) / ${expected} (Pok?Base)`)
  }

  if (missing.length || differences.length) {
    throw new Error(`Auditor?a mega fallida. Sin referencia: ${missing.join(', ') || 'ninguna'}. Diferencias: ${differences.join('; ') || 'ninguna'}.`)
  }
  console.log(`Auditor?a mega correcta: ${megas.length} formas coinciden con Pok?Base.`)
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1 })
