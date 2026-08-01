import { describe, expect, it } from 'vitest'
import { createRound, evaluateAnswer, validateCatalog } from './game'
import type { PokemonCatalog, PokemonEntry } from '../data/types'

const pokemon = (id: string, baseSpeed: number): PokemonEntry => ({
  id,
  dexNumber: 1,
  displayName: id,
  form: null,
  baseStats: { speed: baseSpeed },
  types: ['Normal'],
  isMega: false,
  assets: {
    wikidexPageUrl: 'https://www.wikidex.net/wiki/Test',
    imageUrl: 'https://images.wikidexcdn.net/test.png',
    imageAlt: id,
  },
})

const catalog = (pokemon: PokemonEntry[]): PokemonCatalog => ({
  schemaVersion: 1,
  regulation: 'M-B',
  snapshotDate: '2026-08-01',
  sources: {
    eligibility: { name: 'WikiDex', url: 'https://www.wikidex.net/wiki/Reglamento_M-B' },
    speeds: { name: 'Pok?Base', url: 'https://pokebase.app/pokemon-champions/speed-tiers' },
    artwork: { name: 'WikiDex', url: 'https://www.wikidex.net/' },
  },
  pokemon,
})

describe('evaluateAnswer', () => {
  const slow = pokemon('slow', 50)
  const fast = pokemon('fast', 100)

  it('eval?a m?s r?pido y m?s lento', () => {
    expect(evaluateAnswer({ reference: slow, challenger: fast }, 'higher')).toEqual({ result: 'correct', isCorrect: true })
    expect(evaluateAnswer({ reference: fast, challenger: slow }, 'higher')).toEqual({ result: 'incorrect', isCorrect: false })
    expect(evaluateAnswer({ reference: fast, challenger: slow }, 'lower')).toEqual({ result: 'correct', isCorrect: true })
  })

  it('solo acepta IGUALES cuando hay empate', () => {
    const same = pokemon('same', 50)
    expect(evaluateAnswer({ reference: slow, challenger: same }, 'equal')).toEqual({ result: 'tie', isCorrect: true })
    expect(evaluateAnswer({ reference: slow, challenger: same }, 'higher')).toEqual({ result: 'incorrect', isCorrect: false })
    expect(evaluateAnswer({ reference: slow, challenger: same }, 'lower')).toEqual({ result: 'incorrect', isCorrect: false })
  })

  it('rechaza IGUALES si las velocidades no coinciden', () => {
    expect(evaluateAnswer({ reference: slow, challenger: fast }, 'equal')).toEqual({ result: 'incorrect', isCorrect: false })
  })
})

describe('createRound', () => {
  const entries = [pokemon('a', 40), pokemon('b', 60), pokemon('c', 80)]

  it('no enfrenta una entrada consigo misma ni repite el ?ltimo retador', () => {
    const round = createRound(entries, () => 0, entries[0], 'b')
    expect(round.reference.id).toBe('a')
    expect(round.challenger.id).toBe('c')
  })
})

describe('validateCatalog', () => {
  it('rechaza IDs duplicados', () => {
    expect(() => validateCatalog(catalog([pokemon('same', 50), pokemon('same', 60)]))).toThrow('ID duplicado')
  })
})


describe('type validation', () => {
  it('rejects values outside the 18 official types', () => {
    const invalid = pokemon('floette-error', 92)
    invalid.types = ['Hada', '}}']
    expect(() => validateCatalog(catalog([invalid]))).toThrow('Tipo desconocido')
  })
})
