import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { PokemonEntry } from '../src/data/types.ts'

const correctedSpeeds: Record<string, number> = {
  'floette-eterna': 92,
  'mega-raichu-x': 110,
  'mega-alakazam': 150,
  'mega-starmie': 120,
  'mega-pinsir': 105,
  'mega-scizor': 75,
  'mega-heracross': 75,
  'mega-sableye': 20,
  'mega-medicham': 100,
  'mega-manectric': 135,
  'mega-sharpedo': 105,
  'mega-camerupt': 20,
  'mega-banette': 75,
  'mega-lopunny': 135,
  'mega-abomasnow': 30,
  'mega-gallade': 110,
  'mega-meowstic': 124,
  'mega-crabominable': 33,
  'mega-glimmora': 101,
}

const dataPath = resolve('src/data/pokemon-mb.json')

async function main() {
  const catalog = JSON.parse(await readFile(dataPath, 'utf8')) as { pokemon: PokemonEntry[] }
  const updated = catalog.pokemon.map((entry) => ({ ...entry, baseStats: { ...entry.baseStats, speed: correctedSpeeds[entry.id] ?? entry.baseStats.speed } }))
  for (const [id, speed] of Object.entries(correctedSpeeds)) {
    if (!updated.some((entry) => entry.id === id && entry.baseStats.speed === speed)) throw new Error(`No se pudo corregir ${id}.`)
  }
  await writeFile(dataPath, `${JSON.stringify({ ...catalog, pokemon: updated }, null, 2)}\n`)
  console.log(`Aplicadas ${Object.keys(correctedSpeeds).length} correcciones de velocidad verificadas.`)
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1 })
