import { useCallback, useEffect, useRef, useState } from 'react'
import type { Answer, PokemonEntry, Result } from '../data/types'
import { createRound, evaluateAnswer, type Round } from '../domain/game'

const BEST_STREAK_KEY = 'pokemon-speed:best-streak'

type Phase = 'ready' | 'answered' | 'transitioning'

const savedBestStreak = () => {
  const value = Number(window.localStorage.getItem(BEST_STREAK_KEY))
  return Number.isInteger(value) && value > 0 ? value : 0
}

export function useGame(catalog: PokemonEntry[]) {
  const [round, setRound] = useState<Round>(() => createRound(catalog))
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(savedBestStreak)
  const [phase, setPhase] = useState<Phase>('ready')
  const [result, setResult] = useState<Result | null>(null)
  const [referenceLocked, setReferenceLocked] = useState(false)
  const timeoutRef = useRef<number | null>(null)

  useEffect(() => () => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current)
  }, [])

  const startNewGame = useCallback(() => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current)
    setRound(createRound(catalog))
    setStreak(0)
    setResult(null)
    setReferenceLocked(false)
    setPhase('ready')
  }, [catalog])

  const toggleReferenceLock = useCallback(() => {
    setReferenceLocked((locked) => !locked)
  }, [])

  const selectReference = useCallback((reference: PokemonEntry) => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current)
    setRound(createRound(catalog, Math.random, reference))
    setResult(null)
    setPhase('ready')
    setReferenceLocked(true)
  }, [catalog])

  const answer = useCallback((choice: Answer) => {
    if (phase !== 'ready') return
    const evaluation = evaluateAnswer(round, choice)
    setResult(evaluation.result)
    setPhase('answered')
    setStreak((current) => {
      const next = evaluation.isCorrect ? current + 1 : 0
      if (next > bestStreak) {
        setBestStreak(next)
        window.localStorage.setItem(BEST_STREAK_KEY, String(next))
      }
      return next
    })
    timeoutRef.current = window.setTimeout(() => {
      setPhase('transitioning')
      setRound((current) => referenceLocked
        ? createRound(catalog, Math.random, current.reference, current.challenger.id)
        : createRound(catalog, Math.random, current.challenger, current.reference.id))
      setResult(null)
      setPhase('ready')
    }, 1150)
  }, [bestStreak, catalog, phase, referenceLocked, round])

  return { round, streak, bestStreak, phase, result, referenceLocked, answer, startNewGame, toggleReferenceLock, selectReference }
}
