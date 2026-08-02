import type { FormEvent } from 'react'
import type { PokemonEntry } from '../data/types'
import { PokemonCard } from './PokemonCard'
import type { QuizResult, SpeedHint } from '../hooks/useSpeedQuiz'

type Props = {
  pokemon: PokemonEntry
  guess: string
  lastSubmittedGuess: number | null
  phase: 'ready' | 'answered'
  result: QuizResult
  hint: SpeedHint
  onGuessChange: (value: string) => void
  onSubmit: () => boolean
  onNext: () => void
  onNewGame: () => void
}

export function SpeedQuiz({ pokemon, guess, lastSubmittedGuess, phase, result, hint, onGuessChange, onSubmit, onNext, onNewGame }: Props) {
  const revealed = phase === 'answered'
  const hasDirectionHint = result === 'incorrect' && hint !== null
  const direction = hint === 'higher'
    ? { arrow: '↑', title: 'TIENE MÁS VELOCIDAD', action: 'Prueba con una cifra más alta.' }
    : { arrow: '↓', title: 'TIENE MENOS VELOCIDAD', action: 'Prueba con una cifra más baja.' }
  const message = result === 'correct'
    ? '\u00a1Correcto! Te sabes esa Velocidad Base.'
    : 'Escribe la Velocidad Base exacta de este Pok\u00e9mon.'

  const submit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit()
  }

  return (
    <div className="speed-quiz">
      <h1>&#191;Cu&#225;nta velocidad tiene?</h1>
      <p className="question">Observa el Pok&#233;mon y escribe su <b>Velocidad Base</b> exacta.</p>
      <form className="speed-quiz-form" onSubmit={submit}>
        <div className="speed-quiz-card">
          <PokemonCard key={pokemon.id} pokemon={pokemon} role="challenger" revealed={revealed} result={result} speedGuess={revealed ? undefined : { value: guess, onChange: onGuessChange }} speedHint={hasDirectionHint ? hint : null} />
        </div>
        <div className="answer-area speed-quiz-answer">
          {!hasDirectionHint && <p className={'feedback feedback--' + (result ?? 'neutral')} aria-live="polite">{message}</p>}
          {hasDirectionHint && <div className={'speed-hint-banner speed-hint-banner--' + hint} role="status" aria-live="polite"><span className="speed-hint-banner__arrow" aria-hidden="true">{direction.arrow}</span><span className="speed-hint-banner__copy"><strong>{direction.title}</strong><small>{direction.action}</small></span><span className="speed-hint-banner__guess"><small>TU RESPUESTA</small><b>{lastSubmittedGuess ?? guess.trim()}</b></span></div>}
          {revealed ? (
            <button type="button" className="quiz-next-button" onClick={onNext}>SIGUIENTE POK&#201;MON &rarr;</button>
          ) : <button type="submit" className="quiz-submit-button">COMPROBAR</button>}
          <button type="button" className="new-game" onClick={onNewGame}>Nueva partida</button>
        </div>
      </form>
    </div>
  )
}
