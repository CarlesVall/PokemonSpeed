import { useCallback, useState } from 'react'
import type { PokemonEntry } from '../data/types'

const BEST_SPEED_QUIZ_STREAK_KEY = 'pokemon-speed:guess-speed-best-streak'

type QuizPhase = 'ready' | 'answered'
export type QuizResult = 'correct' | 'incorrect' | null
export type SpeedHint = 'higher' | 'lower' | null

const savedBestStreak = () => {
  const value = Number(window.localStorage.getItem(BEST_SPEED_QUIZ_STREAK_KEY))
  return Number.isInteger(value) && value > 0 ? value : 0
}

const pickPokemon = (catalog: PokemonEntry[], previousId?: string) => {
  const candidates = catalog.filter((pokemon) => pokemon.id !== previousId)
  const pool = candidates.length > 0 ? candidates : catalog
  return pool[Math.floor(Math.random() * pool.length)]
}

export function useSpeedQuiz(catalog: PokemonEntry[]) {
  const [pokemon, setPokemon] = useState<PokemonEntry>(() => pickPokemon(catalog))
  const [guess, setGuess] = useState('')
  const [phase, setPhase] = useState<QuizPhase>('ready')
  const [result, setResult] = useState<QuizResult>(null)
  const [hint, setHint] = useState<SpeedHint>(null)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(savedBestStreak)

  const submitAnswer = useCallback(() => {
    if (phase !== 'ready') return false
    const value = Number(guess.trim())
    if (!Number.isInteger(value)) return false

    if (value !== pokemon.baseStats.speed) {
      setHint(value < pokemon.baseStats.speed ? 'higher' : 'lower')
      setResult('incorrect')
      setGuess('')
      setStreak(0)
      return true
    }

    setHint(null)
    setResult('correct')
    setPhase('answered')
    setStreak((current) => {
      const next = current + 1
      if (next > bestStreak) {
        setBestStreak(next)
        window.localStorage.setItem(BEST_SPEED_QUIZ_STREAK_KEY, String(next))
      }
      return next
    })
    return true
  }, [bestStreak, guess, phase, pokemon.baseStats.speed])

  const nextQuestion = useCallback(() => {
    setPokemon((current) => pickPokemon(catalog, current.id))
    setGuess('')
    setHint(null)
    setResult(null)
    setPhase('ready')
  }, [catalog])

  const startNewGame = useCallback(() => {
    setPokemon(pickPokemon(catalog))
    setGuess('')
    setHint(null)
    setResult(null)
    setPhase('ready')
    setStreak(0)
  }, [catalog])

  return { pokemon, guess, setGuess, phase, result, hint, streak, bestStreak, submitAnswer, nextQuestion, startNewGame }
}
