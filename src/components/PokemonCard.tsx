import { useState } from 'react'
import type { PokemonEntry, Result } from '../data/types'

type Props = {
  pokemon: PokemonEntry
  role: 'reference' | 'challenger'
  revealed: boolean
  result: Result | null
  speedGuess?: {
    value: string
    onChange: (value: string) => void
  }
  speedHint?: 'higher' | 'lower' | null
}

export function PokemonCard({ pokemon, role, revealed, result, speedGuess, speedHint }: Props) {
  const [imageFailed, setImageFailed] = useState(false)
  const isChallenger = role === 'challenger'
  const stateClass = isChallenger && revealed && result ? `card--${result}` : ''

  return (
    <article className={`pokemon-card ${stateClass}`} aria-label={`${pokemon.displayName}, ${isChallenger && !revealed ? 'velocidad oculta' : `velocidad base ${pokemon.baseStats.speed}`}`}>
      <a className="pokemon-art" href={pokemon.assets.wikidexPageUrl} target="_blank" rel="noreferrer" aria-label={`Abrir ${pokemon.displayName} en WikiDex`}>
        {imageFailed ? (
          <span className="image-fallback" aria-hidden="true">&#9673;</span>
        ) : (
          <img src={pokemon.assets.imageUrl} alt={pokemon.assets.imageAlt} onError={() => setImageFailed(true)} />
        )}
      </a>
      <h2 title={pokemon.displayName}>{pokemon.displayName}</h2>
      {pokemon.isMega && <span className="mega-chip">MEGA</span>}
      <div className={speedGuess ? 'speed-readout speed-readout--guess' : 'speed-readout'}>
        <span>{speedGuess ? 'TU RESPUESTA' : 'VELOCIDAD BASE'}</span>
        {speedGuess ? (
          <label className="card-guess-control">
            <b>VEL.</b>
            <input id="speed-guess" value={speedGuess.value} onChange={(event) => speedGuess.onChange(event.target.value)} type="number" inputMode="numeric" min="5" max="200" step="1" required autoFocus placeholder="?" aria-label="Tu respuesta de Velocidad Base" />
            <i>BST</i>
            {speedHint && <span className={'card-guess-direction card-guess-direction--' + speedHint} aria-hidden="true">{speedHint === 'higher' ? '↑' : '↓'}</span>}
          </label>
        ) : <strong>{isChallenger && !revealed ? '?' : pokemon.baseStats.speed}</strong>}
      </div>
    </article>
  )
}
