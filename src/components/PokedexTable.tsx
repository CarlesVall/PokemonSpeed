import { useMemo, useState } from 'react'
import type { PokemonEntry } from '../data/types'

type SpeedMode = 'any' | 'less' | 'between' | 'greater'

type Props = { catalog: PokemonEntry[] }

const asNumber = (value: string) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const normalized = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

// SVG type symbols: https://github.com/duiker101/pokemon-type-svg-icons
const TYPE_ICON_SLUG: Record<string, string> = {
  Acero: 'steel', Agua: 'water', Bicho: 'bug', 'Drag\u00f3n': 'dragon', 'El\u00e9ctrico': 'electric', Fantasma: 'ghost', Fuego: 'fire', Hada: 'fairy', Hielo: 'ice', Lucha: 'fighting', Normal: 'normal', Planta: 'grass', 'Ps\u00edquico': 'psychic', Roca: 'rock', Siniestro: 'dark', Tierra: 'ground', Veneno: 'poison', Volador: 'flying',
}
const typeClassName = (type: string) => type.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const typeIconUrl = (type: string) => 'https://raw.githubusercontent.com/duiker101/pokemon-type-svg-icons/master/icons/' + TYPE_ICON_SLUG[type] + '.svg'

function TypeBadge({ type }: { type: string }) {
  return <b className={'type type--' + typeClassName(type)}><img src={typeIconUrl(type)} alt="" /><span>{type}</span></b>
}

type TypeFilterProps = { label: string; value: string; options: string[]; disabledType?: string; onChange: (value: string) => void }
function TypeFilter({ label, value, options, disabledType, onChange }: TypeFilterProps) {
  const [open, setOpen] = useState(false)
  const choose = (type: string) => { onChange(type); setOpen(false) }
  return <div className="type-select-control type-select-control--visual">
    <span>{label}</span>
    <button type="button" className={'type-filter-trigger' + (value ? ' type-filter-trigger--selected' : '')} onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-haspopup="listbox">
      {value ? <TypeBadge type={value} /> : <span className="type-filter-placeholder">&mdash; Sin filtro &mdash;</span>}<i aria-hidden="true">v</i>
    </button>
    {open && <div className="type-filter-menu" role="listbox" aria-label={label}>
      <button type="button" className={'type-filter-option' + (!value ? ' type-filter-option--selected' : '')} onClick={() => choose('')} aria-selected={!value}>Sin filtro</button>
      {options.map((type) => <button type="button" key={type} className={'type-filter-option' + (type === value ? ' type-filter-option--selected' : '')} onClick={() => choose(type)} disabled={type === disabledType} aria-selected={type === value}><TypeBadge type={type} /></button>)}
    </div>}
  </div>
}

export function PokedexTable({ catalog }: Props) {
  const [firstType, setFirstType] = useState('')
  const [secondType, setSecondType] = useState('')
  const [speedMode, setSpeedMode] = useState<SpeedMode>('any')
  const [firstSpeed, setFirstSpeed] = useState('')
  const [secondSpeed, setSecondSpeed] = useState('')
  const [search, setSearch] = useState('')
  const [descending, setDescending] = useState(true)

  const typeOptions = useMemo(
    () => [...new Set(catalog.flatMap((pokemon) => pokemon.types))].sort((first, second) => first.localeCompare(second, 'es')),
    [catalog],
  )
  const filtered = useMemo(() => {
    const requestedTypes = [firstType, secondType].filter(Boolean)
    const query = normalized(search.trim())
    const low = asNumber(firstSpeed)
    const high = asNumber(secondSpeed)
    return catalog
      .filter((pokemon) => !query || normalized(pokemon.displayName).includes(query))
      .filter((pokemon) => requestedTypes.every((type) => pokemon.types.includes(type)))
      .filter((pokemon) => {
        if (speedMode === 'less') return low === null || pokemon.baseStats.speed < low
        if (speedMode === 'greater') return low === null || pokemon.baseStats.speed > low
        if (speedMode === 'between') {
          if (low === null && high === null) return true
          if (low === null) return pokemon.baseStats.speed <= high!
          if (high === null) return pokemon.baseStats.speed >= low
          const [minimum, maximum] = low <= high ? [low, high] : [high, low]
          return pokemon.baseStats.speed >= minimum && pokemon.baseStats.speed <= maximum
        }
        return true
      })
      .sort((first, second) => descending
        ? second.baseStats.speed - first.baseStats.speed || first.displayName.localeCompare(second.displayName, 'es')
        : first.baseStats.speed - second.baseStats.speed || first.displayName.localeCompare(second.displayName, 'es'))
  }, [catalog, descending, firstSpeed, firstType, search, secondSpeed, secondType, speedMode])

  const changeSpeedMode = (mode: SpeedMode) => {
    setSpeedMode(mode)
    if (mode === 'between') {
      setFirstSpeed('0')
      setSecondSpeed('255')
    }
  }

  const clearFilters = () => {
    setFirstType('')
    setSecondType('')
    setSpeedMode('any')
    setFirstSpeed('')
    setSecondSpeed('')
    setSearch('')
  }

  return (
    <section className="dex-view" aria-labelledby="dex-title">
      <div className="dex-heading">
        <div><p className="eyebrow">POKÉMON CHAMPIONS · CONSULTA RÁPIDA</p><h1 id="dex-title">Tabla de Velocidades</h1><p>Combate Doble · Reglamento M-B</p></div>
        <strong>{filtered.length}<small> RESULTADOS</small></strong>
      </div>

      <div className="dex-filters">
        <fieldset className="name-filter">
          <legend>Buscar Pokémon</legend>
          <input value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder="Nombre o forma…" aria-label="Buscar en la tabla" />
        </fieldset>
        <fieldset className="type-filter">
          <legend>Tipos</legend>
          <TypeFilter label="Primer tipo" value={firstType} options={typeOptions} onChange={setFirstType} />
          <TypeFilter label="Segundo tipo" value={secondType} options={typeOptions} disabledType={firstType} onChange={setSecondType} />
        </fieldset>
        <fieldset className="speed-filter">
          <legend>Velocidad Base</legend>
          <select className={speedMode === 'any' ? 'speed-mode speed-mode--placeholder' : 'speed-mode'} value={speedMode} onChange={(event) => changeSpeedMode(event.target.value as SpeedMode)} aria-label="Modo de filtro de velocidad">
            <option value="any">&mdash; Sin filtro &mdash;</option>
            <option value="greater">Mayor que</option>
            <option value="between">Entre</option>
            <option value="less">Menor que</option>
          </select>
          {speedMode !== 'any' && <div className="speed-range">
            <label className="speed-input">
              <span>{speedMode === 'between' ? 'Desde' : 'Velocidad'}</span>
              <span className="speed-value"><b>VEL.</b><input value={firstSpeed} onChange={(event) => setFirstSpeed(event.target.value)} type="number" min="0" max="255" placeholder="0" aria-label={speedMode === 'between' ? 'Velocidad desde' : 'Valor de velocidad'} /><i>BST</i></span>
            </label>
            {speedMode === 'between' && <><span className="range-divider" aria-hidden="true">&mdash;</span><label className="speed-input"><span>Hasta</span><span className="speed-value"><b>VEL.</b><input value={secondSpeed} onChange={(event) => setSecondSpeed(event.target.value)} type="number" min="0" max="255" placeholder="255" aria-label="Velocidad hasta" /><i>BST</i></span></label></>}
          </div>}
        </fieldset>
        <button type="button" className="clear-filters" onClick={clearFilters}>Limpiar filtros</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Pokémon</th><th>Tipos</th><th><button type="button" onClick={() => setDescending((value) => !value)} aria-label={`Ordenar velocidad ${descending ? 'ascendente' : 'descendente'}`}>Velocidad <span aria-hidden="true">{descending ? '↓' : '↑'}</span></button></th></tr></thead>
          <tbody>
            {filtered.map((pokemon) => (
              <tr key={pokemon.id}>
                <td><a href={pokemon.assets.wikidexPageUrl} target="_blank" rel="noreferrer"><img src={pokemon.assets.imageUrl} alt="" /><span>{pokemon.displayName}{pokemon.isMega && <em>MEGA</em>}</span></a></td>
                <td><span className="type-badges">{pokemon.types.map((type) => <TypeBadge key={type} type={type} />)}</span></td>
                <td className="speed-cell">{pokemon.baseStats.speed}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="empty-table">No hay Pokémon que cumplan esos filtros.</p>}
      </div>
    </section>
  )
}

