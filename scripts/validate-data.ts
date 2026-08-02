import pokemonData from '../src/data/pokemon-mb.json'
import { validateCatalog } from '../src/domain/game.ts'
import type { PokemonCatalog } from '../src/data/types.ts'

const catalog = pokemonData as PokemonCatalog
validateCatalog(catalog)

const megaCount = catalog.pokemon.filter((entry) => entry.isMega).length
if (catalog.pokemon.length !== 310 || megaCount !== 75) {
  throw new Error(`Se esperaban 310 entradas y 75 megas; se obtuvieron ${catalog.pokemon.length} y ${megaCount}.`)
}

const gourgeistSpeeds: Record<string, number> = {
  gourgeist: 84,
  'gourgeist-2': 99,
  'gourgeist-3': 69,
  'gourgeist-4': 54,
}

for (const [id, expectedSpeed] of Object.entries(gourgeistSpeeds)) {
  const pokemon = catalog.pokemon.find((entry) => entry.id === id)
  if (pokemon?.baseStats.speed !== expectedSpeed) {
    throw new Error(`Velocidad de ${id} incorrecta: se esperaba ${expectedSpeed} y se obtuvo ${pokemon?.baseStats.speed ?? 'ninguna'}.`)
  }
}
console.log(`Dataset v?lido: ${catalog.pokemon.length} entradas, ${megaCount} megaevoluciones.`)
