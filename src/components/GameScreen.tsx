import type { PokemonEntry } from '../data/types'
import { useGame } from '../hooks/useGame'
import { useSpeedQuiz } from '../hooks/useSpeedQuiz'
import { ComparisonGame } from './ComparisonGame'
import { Scoreboard } from './Scoreboard'
import { SpeedQuiz } from './SpeedQuiz'

export type GameMode = 'compare' | 'guess'
type Props = { catalog: PokemonEntry[]; mode: GameMode; onModeChange: (mode: GameMode) => void; comparisonGame: ReturnType<typeof useGame>; speedQuiz: ReturnType<typeof useSpeedQuiz>; streak: number; bestStreak: number }

export function GameScreen({ catalog, mode, onModeChange, comparisonGame, speedQuiz, streak, bestStreak }: Props) {
  return <section className="game">
    <div className="game-meta">
      <p className="eyebrow">POKÉMON CHAMPIONS · ENTRENAMIENTO COMPETITIVO</p>
      <Scoreboard streak={streak} bestStreak={bestStreak} />
    </div>
    <div className="game-mode-switch" aria-label="Modo de juego">
      <button type="button" className={mode === 'compare' ? 'game-mode-button game-mode-button--active' : 'game-mode-button'} onClick={() => onModeChange('compare')}>COMPARAR</button>
      <button type="button" className={mode === 'guess' ? 'game-mode-button game-mode-button--active' : 'game-mode-button'} onClick={() => onModeChange('guess')}>ADIVINAR VELOCIDAD</button>
    </div>
    {mode === 'compare' ? <ComparisonGame catalog={catalog} game={comparisonGame} /> : <SpeedQuiz pokemon={speedQuiz.pokemon} guess={speedQuiz.guess} lastSubmittedGuess={speedQuiz.lastSubmittedGuess} phase={speedQuiz.phase} result={speedQuiz.result} hint={speedQuiz.hint} onGuessChange={speedQuiz.setGuess} onSubmit={speedQuiz.submitAnswer} onNext={speedQuiz.nextQuestion} onNewGame={speedQuiz.startNewGame} />}
  </section>
}
