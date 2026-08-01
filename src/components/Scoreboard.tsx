type Props = { streak: number; bestStreak: number }

export function Scoreboard({ streak, bestStreak }: Props) {
  return (
    <div className="scoreboard" aria-label={`Racha ${streak}. Mejor racha ${bestStreak}.`}>
      <span><small>RACHA</small><strong>{streak}</strong></span>
      <span><small>MEJOR</small><strong>{bestStreak}</strong></span>
    </div>
  )
}
