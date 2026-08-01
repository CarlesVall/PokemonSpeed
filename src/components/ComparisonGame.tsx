import { useEffect, useMemo, useState } from 'react'
import type { PokemonEntry } from '../data/types'
import { PokemonCard } from './PokemonCard'
import { useGame } from '../hooks/useGame'

type Props = { catalog: PokemonEntry[]; game: ReturnType<typeof useGame> }

const normalized = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export function ComparisonGame({ catalog, game }: Props) {
  const { round, phase, result, referenceLocked, answer, startNewGame, toggleReferenceLock, selectReference } = game
  const [selectorOpen, setSelectorOpen] = useState(false)
  const [search, setSearch] = useState('')
  const revealed = phase !== 'ready'
  const matchingPokemon = useMemo(() => {
    const query = normalized(search.trim())
    return catalog.filter((pokemon) => !query || normalized(pokemon.displayName).includes(query)).sort((first, second) => first.displayName.localeCompare(second.displayName, 'es'))
  }, [catalog, search])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowUp') { event.preventDefault(); answer('higher') }
      if (event.key === 'ArrowDown') { event.preventDefault(); answer('lower') }
      if (event.key.toLowerCase() === 'e') { event.preventDefault(); answer('equal') }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [answer])

  const chooseReference = (pokemon: PokemonEntry) => {
    selectReference(pokemon)
    setSelectorOpen(false)
    setSearch('')
  }

  const message = result === 'correct' ? '¡Correcto! Gran lectura de la velocidad.' : result === 'incorrect' ? 'No esta vez. Memorízalo y sigue con la siguiente.' : result === 'tie' ? 'Empate: tienen la misma Velocidad Base.' : '¿El retador tiene más, igual o menos Velocidad Base?'

  return <>
    <h1>¿Quién es más rápido?</h1>
    <br />
    <div className="battlefield">
      <div className="reference-wrap">
        <PokemonCard key={round.reference.id} pokemon={round.reference} role="reference" revealed result={null} />
        <div className="reference-actions">
          <button className="change-button" type="button" onClick={() => setSelectorOpen((open) => !open)} aria-expanded={selectorOpen} aria-controls="reference-selector">ELEGIR</button>
          <button className={'lock-button ' + (referenceLocked ? 'lock-button--active' : '')} type="button" onClick={toggleReferenceLock} aria-pressed={referenceLocked}><span aria-hidden="true">{referenceLocked ? '🔒' : '🔓'}</span> {referenceLocked ? 'FIJADO' : 'FIJAR'}</button>
        </div>
      </div>
      <div className="versus" aria-hidden="true">VS</div>
      <PokemonCard key={round.challenger.id} pokemon={round.challenger} role="challenger" revealed={revealed} result={result} />
    </div>
    {selectorOpen && <section className="selector-panel" id="reference-selector" aria-label="Elegir Pokémon de referencia">
      <div className="selector-heading"><div><h2>Elige tu Pokémon</h2></div><button type="button" className="selector-close" onClick={() => setSelectorOpen(false)} aria-label="Cerrar selector">×</button></div>
      <input autoFocus className="pokemon-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Busca por nombre o forma…" aria-label="Buscar Pokémon de referencia" />
      <p className="selector-count">{matchingPokemon.length} resultados · al elegirlo quedará fijado</p>
      <div className="pokemon-options" role="listbox" aria-label="Resultados de búsqueda">
        {matchingPokemon.slice(0, 12).map((pokemon) => <button key={pokemon.id} type="button" role="option" aria-selected={pokemon.id === round.reference.id} className={'pokemon-option ' + (pokemon.id === round.reference.id ? 'pokemon-option--selected' : '')} onClick={() => chooseReference(pokemon)}><span>{pokemon.displayName}{pokemon.isMega && <em> MEGA</em>}</span><img className="option-sprite" src={pokemon.assets.imageUrl} alt="" /></button>)}
      </div>
      {matchingPokemon.length > 12 && <p className="selector-hint">Refina la búsqueda para ver el resto de opciones.</p>}
    </section>}
    <div className="answer-area">
      <p className={'feedback feedback--' + (result ?? 'neutral')} aria-live="polite">{message}</p>
      <div className="answer-buttons">
        <button className="answer-button answer-button--lower" onClick={() => answer('lower')} disabled={phase !== 'ready'}><span aria-hidden="true">↓</span> MÁS LENTO</button>
        <button className="answer-button answer-button--equal" onClick={() => answer('equal')} disabled={phase !== 'ready'}>= IGUALES</button>
        <button className="answer-button answer-button--higher" onClick={() => answer('higher')} disabled={phase !== 'ready'}><span aria-hidden="true">↑</span> MÁS RÁPIDO</button>
      </div>
      <p className="keyboard-tip">Tambi&eacute;n puedes usar <kbd>&darr;</kbd>, <kbd>E</kbd> para iguales y <kbd>&uarr;</kbd>.</p>
      <button className="new-game" onClick={startNewGame}>Nueva partida</button>
    </div>
  </>
}
