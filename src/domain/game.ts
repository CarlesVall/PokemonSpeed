import { POKEMON_TYPES, type Answer, type PokemonCatalog, type PokemonEntry, type Result } from '../data/types'

export type Round = {
  reference: PokemonEntry
  challenger: PokemonEntry
}

export type AnswerEvaluation = {
  result: Result
  isCorrect: boolean
}

export const evaluateAnswer = (round: Round, answer: Answer): AnswerEvaluation => {
  const difference = round.challenger.baseStats.speed - round.reference.baseStats.speed
  if (difference === 0) return { result: answer === 'equal' ? 'tie' : 'incorrect', isCorrect: answer === 'equal' }

  const isCorrect = answer === 'higher' ? difference > 0 : answer === 'lower' && difference < 0
  return { result: isCorrect ? 'correct' : 'incorrect', isCorrect }
}

const pick = <T>(items: T[], random: () => number) => items[Math.floor(random() * items.length)]

export const createRound = (
  catalog: PokemonEntry[],
  random: () => number = Math.random,
  reference?: PokemonEntry,
  previousChallengerId?: string,
): Round => {
  if (catalog.length < 2) throw new Error('El cat?logo necesita al menos dos Pok?mon.')

  const selectedReference = reference ?? pick(catalog, random)
  const candidates = catalog.filter(
    (entry) => entry.id !== selectedReference.id && entry.id !== previousChallengerId,
  )
  const challengerPool = candidates.length > 0
    ? candidates
    : catalog.filter((entry) => entry.id !== selectedReference.id)

  return { reference: selectedReference, challenger: pick(challengerPool, random) }
}

export const validateCatalog = (catalog: PokemonCatalog) => {
  if (catalog.schemaVersion !== 1) throw new Error('Versi?n de esquema no v?lida.')
  if (catalog.regulation !== 'M-B') throw new Error('Reglamento no v?lido.')
  if (!catalog.snapshotDate) throw new Error('Falta la fecha de la instant?nea.')
  if (!catalog.sources.eligibility.url || !catalog.sources.speeds.url || !catalog.sources.artwork.url) {
    throw new Error('Faltan las fuentes del cat?logo.')
  }

  const ids = new Set<string>()
  const allowedTypes = new Set<string>(POKEMON_TYPES)
  for (const entry of catalog.pokemon) {
    if (ids.has(entry.id)) throw new Error(`ID duplicado: ${entry.id}`)
    ids.add(entry.id)
    if (!Number.isInteger(entry.dexNumber) || entry.dexNumber < 1) throw new Error(`N?mero Dex no v?lido: ${entry.id}`)
    if (!Number.isInteger(entry.baseStats.speed) || entry.baseStats.speed < 5 || entry.baseStats.speed > 200) throw new Error(`Velocidad no v?lida: ${entry.id}`)
    if (entry.types.length < 1 || entry.types.length > 2 || entry.types.some((type) => !type.trim())) throw new Error(`Tipos no v?lidos: ${entry.id}`)
    if (entry.types.some((type) => !allowedTypes.has(type))) throw new Error(`Tipo desconocido: ${entry.id}`)
    if (!entry.assets.wikidexPageUrl.startsWith('https://www.wikidex.net/')) throw new Error(`URL de WikiDex no v?lida: ${entry.id}`)
    if (!entry.assets.imageUrl.startsWith('https://images.wikidexcdn.net/')) throw new Error(`URL de imagen no v?lida: ${entry.id}`)
  }
}
