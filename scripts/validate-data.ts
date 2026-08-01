import pokemonData from '../src/data/pokemon-mb.json'
import { validateCatalog } from '../src/domain/game.ts'
import type { PokemonCatalog } from '../src/data/types.ts'

const catalog = pokemonData as PokemonCatalog
validateCatalog(catalog)

const megaCount = catalog.pokemon.filter((entry) => entry.isMega).length
if (catalog.pokemon.length !== 310 || megaCount !== 75) {
  throw new Error(`Se esperaban 310 entradas y 75 megas; se obtuvieron ${catalog.pokemon.length} y ${megaCount}.`)
}

console.log(`Dataset v?lido: ${catalog.pokemon.length} entradas, ${megaCount} megaevoluciones.`)
