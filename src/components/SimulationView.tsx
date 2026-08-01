import { useEffect, useMemo, useRef, useState } from 'react'
import type { PokemonEntry } from '../data/types'

type Side = 'player' | 'opponent'
type Team = Array<PokemonEntry | null>
type SpeedNature = 'neutral' | 'boost' | 'drop'
type Weather = 'sun' | 'rain' | 'sand' | 'snow'
type WeatherAbility = 'swiftSwim' | 'chlorophyll' | 'sandRush' | 'slushRush'
type WeatherAbilityOption = { ability: WeatherAbility; fixed?: boolean }
type SpeedTraining = { statPoints: number; nature: SpeedNature; weatherAbility: WeatherAbility | null }
type TrainingTeam = SpeedTraining[]
type BattleStages = [number, number]
type Picker = { kind: 'team' | 'battle'; side: Side; index: number } | null
type Props = { catalog: PokemonEntry[] }

const emptyTeam = (): Team => Array.from({ length: 6 }, () => null)
const emptyBattle = (): Array<string | null> => [null, null]
const defaultTraining = (): SpeedTraining => ({ statPoints: 0, nature: 'neutral', weatherAbility: null })
const emptyTrainingTeam = (): TrainingTeam => Array.from({ length: 6 }, defaultTraining)
const emptyBattleStages = (): BattleStages => [0, 0]
const normalized = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

const getPokemonById = (team: Team, id: string | null) => team.find((pokemon) => pokemon?.id === id) ?? undefined
const battleKey = (side: Side, pokemon: PokemonEntry) => side + ':' + pokemon.id
const natureMultiplier = (nature: SpeedNature) => nature === 'boost' ? 1.1 : nature === 'drop' ? 0.9 : 1
const calculateBaseSpeed = (pokemon: PokemonEntry, training: SpeedTraining) => Math.floor((pokemon.baseStats.speed + training.statPoints + 20) * natureMultiplier(training.nature))
const stageMultiplier = (stage: number) => stage >= 0 ? (2 + stage) / 2 : 2 / (2 - stage)
const calculateBattleSpeed = (baseSpeed: number, stage: number, tailwind: boolean, weatherBoost: boolean) => Math.floor(baseSpeed * stageMultiplier(stage)) * (tailwind ? 2 : 1) * (weatherBoost ? 2 : 1)

const WEATHER_ABILITY_DETAILS: Record<WeatherAbility, { label: string; weather: Weather }> = {
  swiftSwim: { label: 'Nado R\u00e1pido', weather: 'rain' },
  chlorophyll: { label: 'Clorofila', weather: 'sun' },
  sandRush: { label: '\u00cdmpetu Arena', weather: 'sand' },
  slushRush: { label: 'Quitanieves', weather: 'snow' },
}
const WEATHER_ABILITIES_BY_ID: Record<string, WeatherAbilityOption[]> = {
  basculegion: [{ ability: 'swiftSwim' }],
  'basculegion-2': [{ ability: 'swiftSwim' }],
  beartic: [{ ability: 'swiftSwim' }, { ability: 'slushRush' }],
  venusaur: [{ ability: 'chlorophyll' }],
  victreebel: [{ ability: 'chlorophyll' }],
  leafeon: [{ ability: 'chlorophyll' }],
  whimsicott: [{ ability: 'chlorophyll' }],
  scovillain: [{ ability: 'chlorophyll' }],
  excadrill: [{ ability: 'sandRush' }],
  lycanroc: [{ ability: 'sandRush' }],
  'mega-swampert': [{ ability: 'swiftSwim', fixed: true }],
}
const weatherAbilityOptionsFor = (pokemon: PokemonEntry) => WEATHER_ABILITIES_BY_ID[pokemon.id] ?? []
const selectedWeatherAbilityFor = (pokemon: PokemonEntry, training: SpeedTraining) => weatherAbilityOptionsFor(pokemon).find((option) => option.fixed)?.ability ?? training.weatherAbility
const isWeatherAbilityActive = (pokemon: PokemonEntry, training: SpeedTraining, weather: Weather | null) => {
  const ability = selectedWeatherAbilityFor(pokemon, training)
  return Boolean(ability && weather && WEATHER_ABILITY_DETAILS[ability].weather === weather)
}

type TeamPanelProps = {
  side: Side
  title: string
  team: Team
  battleIds: Array<string | null>
  picker: Picker
  search: string
  choices: PokemonEntry[]
  onSelectTeamSlot: (side: Side, index: number) => void
  onClearSlot: (side: Side, index: number) => void
  onSearchChange: (value: string) => void
  onChooseTeamPokemon: (pokemon: PokemonEntry) => void
  formChoicesFor: (pokemon: PokemonEntry) => PokemonEntry[]
  onChangeTeamForm: (side: Side, index: number, pokemon: PokemonEntry) => void
  tailwind: boolean
  onTailwindChange: () => void
  training: TrainingTeam
  getBaseSpeed: (pokemon: PokemonEntry, training: SpeedTraining) => number
  onTrainingChange: (side: Side, index: number, training: SpeedTraining) => void
}

function TeamPanel({ side, title, team, battleIds, picker, search, choices, onSelectTeamSlot, onClearSlot, onSearchChange, onChooseTeamPokemon, formChoicesFor, onChangeTeamForm, tailwind, onTailwindChange, training, getBaseSpeed, onTrainingChange }: TeamPanelProps) {
  const isTeamPicker = picker?.side === side && picker.kind === 'team'
  const pickerIndex = picker?.side === side ? picker.index : -1
  const [customizationOpen, setCustomizationOpen] = useState<boolean[]>(() => Array(6).fill(false))
  const toggleCustomization = (index: number) => setCustomizationOpen((current) => { const next = [...current]; next[index] = !next[index]; return next })

  return <section className={'sim-team sim-team--' + side} aria-label={title}>
    <header className="sim-team-heading"><span>{side === 'player' ? 'TU LADO' : 'RIVAL'}</span><h2>{title}</h2><small>{team.filter(Boolean).length} / 6</small></header>
    <button type="button" className={'sim-condition-toggle sim-condition-toggle--tailwind' + (tailwind ? ' sim-condition-toggle--active' : '')} onClick={onTailwindChange} aria-pressed={tailwind}>VIENTO AF&#205;N</button>
    <div className="sim-team-slots">
      {team.map((pokemon, index) => {
        const formChoices = pokemon ? formChoicesFor(pokemon) : []
        const speedTraining = training[index]
        const abilityOptions = pokemon ? weatherAbilityOptionsFor(pokemon) : []
        const fixedWeatherAbility = abilityOptions.find((option) => option.fixed)?.ability
        return <div className="sim-slot-wrap" key={index}>
        <button type="button" className={(isTeamPicker && pickerIndex === index ? 'sim-team-slot sim-team-slot--active' : 'sim-team-slot') + (pokemon && customizationOpen[index] ? ' sim-team-slot--customizing' : '')} onClick={() => pokemon ? toggleCustomization(index) : onSelectTeamSlot(side, index)} aria-expanded={pokemon ? Boolean(customizationOpen[index]) : undefined} aria-controls={pokemon ? 'sim-customization-' + side + '-' + index : undefined} aria-label={pokemon ? 'Personalizar ' + pokemon.displayName : 'A?adir Pok?mon'}>
          {pokemon ? <><img src={pokemon.assets.imageUrl} alt="" /><span>{pokemon.displayName}</span><small>VEL {getBaseSpeed(pokemon, speedTraining)}</small>{battleIds.includes(pokemon.id) && <em>EN CAMPO</em>}</> : <><b>0{index + 1}</b><span>A&#209;ADIR</span></>}
        </button>
        {pokemon && formChoices.length > 1 && <div className="sim-form-switch" aria-label={'Formas de ' + pokemon.displayName}>
          {formChoices.map((form) => <button type="button" key={form.id} className={form.id === pokemon.id ? 'sim-form-button sim-form-button--active' : 'sim-form-button'} onClick={() => onChangeTeamForm(side, index, form)} disabled={form.id === pokemon.id || team.some((entry, entryIndex) => entryIndex !== index && entry?.id === form.id)} aria-label={'Cambiar a ' + form.displayName}>{form.isMega ? form.displayName.replace('Mega-', 'MEGA ') : 'NORMAL'}</button>)}
        </div>}
        {pokemon && customizationOpen[index] && <div className="sim-customization" id={'sim-customization-' + side + '-' + index}>
          <div className="sim-training">
            <div className="sim-points-control"><label htmlFor={'speed-points-' + side + '-' + index}>PE VEL.</label><input id={'speed-points-' + side + '-' + index} type="number" min="0" max="32" step="1" inputMode="numeric" value={speedTraining.statPoints} onFocus={(event) => event.currentTarget.select()} onInput={(event) => { const field = event.currentTarget; const value = field.value.replace(/^0+(?=\d)/, ''); if (field.value !== value) field.value = value; onTrainingChange(side, index, { ...speedTraining, statPoints: value === '' ? 0 : Number(value) }) }} aria-label="Puntos de Estadistica de Velocidad" /></div>
            <label className="sim-nature-control"><span>NAT.</span><select value={speedTraining.nature} onChange={(event) => onTrainingChange(side, index, { ...speedTraining, nature: event.target.value as SpeedNature })}><option value="neutral">Neutra</option><option value="boost">+ Vel.</option><option value="drop">&#8722; Vel.</option></select></label>
          </div>
          {abilityOptions.length > 0 && <div className="sim-ability-control">{fixedWeatherAbility ? <span className="sim-fixed-ability"><b>HAB.</b>{WEATHER_ABILITY_DETAILS[fixedWeatherAbility].label}</span> : <label><span>HAB.</span><select value={speedTraining.weatherAbility ?? ''} onChange={(event) => onTrainingChange(side, index, { ...speedTraining, weatherAbility: event.target.value as WeatherAbility || null })}><option value="">Otra habilidad</option>{abilityOptions.map((option) => <option key={option.ability} value={option.ability}>{WEATHER_ABILITY_DETAILS[option.ability].label}</option>)}</select></label>}</div>}
        </div>}
        {pokemon && <button type="button" className="sim-clear-slot" onClick={() => { setCustomizationOpen((current) => { const next = [...current]; next[index] = false; return next }); onClearSlot(side, index) }} aria-label={'Quitar ' + pokemon.displayName}>x</button>}
      </div>
      })}
    </div>
    {isTeamPicker && <div className="sim-picker">
      <input autoFocus type="search" value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Busca un Pok&#233;mon..." aria-label={'Buscar para ' + title} />
      <div className="sim-picker-results">
        {!search.trim() ? <span className="sim-empty-picker">Escribe para buscar un Pok&#233;mon.</span> : choices.length === 0 ? <span className="sim-empty-picker">No hay Pok&#233;mon que coincidan.</span> : choices.map((pokemon) => {
          const selectedInTeam = team.some((entry) => entry?.id === pokemon.id)
          const selectedHere = pickerIndex >= 0 && team[pickerIndex]?.id === pokemon.id
          return <button type="button" key={pokemon.id} onClick={() => onChooseTeamPokemon(pokemon)} disabled={selectedInTeam && !selectedHere}><img src={pokemon.assets.imageUrl} alt="" /><span>{pokemon.displayName}</span>{pokemon.isMega && <em>MEGA</em>}</button>
        })}
      </div>
    </div>}
  </section>
}

type BattlePokemonProps = {
  pokemon: PokemonEntry | undefined
  side: Side
  order: number | undefined
  active: boolean
  speed: number | undefined
  speedStage: number
  onSpeedStageChange: (stage: number) => void
  weatherAbility: WeatherAbility | null
  weatherAbilityActive: boolean
  choices: Array<{ pokemon: PokemonEntry; speed: number }>
  battleIds: Array<string | null>
  selectedBattleId: string | null
  onSelect: () => void
  onChoose: (pokemon: PokemonEntry) => void
}

function BattlePokemon({ pokemon, side, order, active, speed, speedStage, onSpeedStageChange, weatherAbility, weatherAbilityActive, choices, battleIds, selectedBattleId, onSelect, onChoose }: BattlePokemonProps) {
  return <div className="gym-pokemon-wrap">
    <button type="button" className={'gym-pokemon gym-pokemon--' + side + (active ? ' gym-pokemon--selecting' : '')} onClick={onSelect}>
      {pokemon ? <><b className="gym-order" aria-label={'Orden de movimiento ' + order}>{order}</b><img src={pokemon.assets.imageUrl} alt={pokemon.assets.imageAlt} /><span>{pokemon.displayName}</span><small>VEL {speed}</small>{weatherAbility && <em className={weatherAbilityActive ? 'gym-weather-ability gym-weather-ability--active' : 'gym-weather-ability'}>{WEATHER_ABILITY_DETAILS[weatherAbility].label}</em>}</> : <><i>+</i><span>Elegir del equipo</span></>}
    </button>
    {pokemon && <label className="gym-stage-control"><span>BUFO VEL.</span><select value={speedStage} onChange={(event) => onSpeedStageChange(Number(event.target.value))} aria-label={'Etapa de Velocidad de ' + pokemon.displayName}>{Array.from({ length: 13 }, (_, index) => 6 - index).map((stage) => <option key={stage} value={stage}>{stage > 0 ? '+' : ''}{stage}</option>)}</select></label>}
    {active && <div className={'gym-picker gym-picker--' + side}>
      <p>ELIGE DEL EQUIPO</p>
      <div className="gym-picker-results">
        {choices.length === 0 ? <span className="sim-empty-picker">A&#241;ade primero alg&#250;n Pok&#233;mon al equipo.</span> : choices.map((choice) => {
          const usedInBattle = battleIds.includes(choice.pokemon.id)
          const selectedHere = selectedBattleId === choice.pokemon.id
          return <button type="button" key={choice.pokemon.id} onClick={() => onChoose(choice.pokemon)} disabled={usedInBattle && !selectedHere}><img src={choice.pokemon.assets.imageUrl} alt="" /><span>{choice.pokemon.displayName}</span><small>VEL {choice.speed}</small></button>
        })}
      </div>
    </div>}
  </div>
}

export function SimulationView({ catalog }: Props) {
  const [playerTeam, setPlayerTeam] = useState<Team>(emptyTeam)
  const [opponentTeam, setOpponentTeam] = useState<Team>(emptyTeam)
  const [playerTraining, setPlayerTraining] = useState<TrainingTeam>(emptyTrainingTeam)
  const [opponentTraining, setOpponentTraining] = useState<TrainingTeam>(emptyTrainingTeam)
  const [playerSpeedStages, setPlayerSpeedStages] = useState<BattleStages>(emptyBattleStages)
  const [opponentSpeedStages, setOpponentSpeedStages] = useState<BattleStages>(emptyBattleStages)
  const [playerBattle, setPlayerBattle] = useState<Array<string | null>>(emptyBattle)
  const [opponentBattle, setOpponentBattle] = useState<Array<string | null>>(emptyBattle)
  const [playerTailwind, setPlayerTailwind] = useState(false)
  const [opponentTailwind, setOpponentTailwind] = useState(false)
  const [trickRoom, setTrickRoom] = useState(false)
  const [weather, setWeather] = useState<Weather | null>(null)
  const [picker, setPicker] = useState<Picker>(null)
  const [search, setSearch] = useState('')
  const gymRef = useRef<HTMLElement>(null)
  const query = normalized(search.trim())
  const choices = useMemo(() => catalog.filter((pokemon) => !query || normalized(pokemon.displayName).includes(query)).sort((first, second) => first.displayName.localeCompare(second.displayName, 'es')).slice(0, 8), [catalog, query])
  const playerCombatants = playerBattle.map((id) => getPokemonById(playerTeam, id))
  const opponentCombatants = opponentBattle.map((id) => getPokemonById(opponentTeam, id))
  const movementOrder = useMemo(() => {
    const entries = [
      ...playerCombatants.map((pokemon, index) => pokemon ? { side: 'player' as const, pokemon, speed: calculateBattleSpeed(calculateBaseSpeed(pokemon, playerTraining[playerTeam.findIndex((entry) => entry?.id === pokemon.id)]), playerSpeedStages[index], playerTailwind, isWeatherAbilityActive(pokemon, playerTraining[playerTeam.findIndex((entry) => entry?.id === pokemon.id)], weather)) } : null).filter((entry): entry is { side: 'player'; pokemon: PokemonEntry; speed: number } => Boolean(entry)),
      ...opponentCombatants.map((pokemon, index) => pokemon ? { side: 'opponent' as const, pokemon, speed: calculateBattleSpeed(calculateBaseSpeed(pokemon, opponentTraining[opponentTeam.findIndex((entry) => entry?.id === pokemon.id)]), opponentSpeedStages[index], opponentTailwind, isWeatherAbilityActive(pokemon, opponentTraining[opponentTeam.findIndex((entry) => entry?.id === pokemon.id)], weather)) } : null).filter((entry): entry is { side: 'opponent'; pokemon: PokemonEntry; speed: number } => Boolean(entry)),
    ].sort((first, second) => (trickRoom ? first.speed - second.speed : second.speed - first.speed) || first.side.localeCompare(second.side) || first.pokemon.displayName.localeCompare(second.pokemon.displayName, 'es'))
    return new Map(entries.map((entry, index) => [battleKey(entry.side, entry.pokemon), index + 1]))
  }, [opponentCombatants, opponentSpeedStages, opponentTailwind, opponentTeam, opponentTraining, playerCombatants, playerSpeedStages, playerTailwind, playerTeam, playerTraining, trickRoom, weather])

  const teamFor = (side: Side) => side === 'player' ? playerTeam : opponentTeam
  const trainingFor = (side: Side) => side === 'player' ? playerTraining : opponentTraining
  const setTrainingFor = (side: Side) => side === 'player' ? setPlayerTraining : setOpponentTraining
  const setBattleFor = (side: Side) => side === 'player' ? setPlayerBattle : setOpponentBattle
  const battleFor = (side: Side) => side === 'player' ? playerBattle : opponentBattle
  const speedStagesFor = (side: Side) => side === 'player' ? playerSpeedStages : opponentSpeedStages
  const setSpeedStagesFor = (side: Side) => side === 'player' ? setPlayerSpeedStages : setOpponentSpeedStages
  const battleChoicesFor = (side: Side) => teamFor(side).flatMap((pokemon, index) => pokemon ? [{ pokemon, speed: calculateBaseSpeed(pokemon, trainingFor(side)[index]) }] : [])
  const effectiveSpeedFor = (side: Side, pokemon: PokemonEntry | undefined) => {
    if (!pokemon) return undefined
    const teamIndex = teamFor(side).findIndex((entry) => entry?.id === pokemon.id)
    const battleIndex = battleFor(side).findIndex((id) => id === pokemon.id)
    return calculateBattleSpeed(calculateBaseSpeed(pokemon, trainingFor(side)[teamIndex]), speedStagesFor(side)[battleIndex] ?? 0, side === 'player' ? playerTailwind : opponentTailwind, isWeatherAbilityActive(pokemon, trainingFor(side)[teamIndex], weather))
  }
const formChoicesFor = (pokemon: PokemonEntry) => {
    const family = catalog.filter((entry) => entry.dexNumber === pokemon.dexNumber)
    const megaForms = family.filter((entry) => entry.isMega)
    if (megaForms.length === 0) return [pokemon]
    const baseForm = family.find((entry) => !entry.isMega)
    return [baseForm, ...megaForms].filter((entry): entry is PokemonEntry => Boolean(entry)).filter((entry, index, entries) => entries.findIndex((candidate) => candidate.id === entry.id) === index)
  }

  const selectTeamSlot = (side: Side, index: number) => { setPicker({ kind: 'team', side, index }); setSearch('') }
  const selectBattleSlot = (side: Side, index: number) => {
    setPicker((current) => current?.kind === 'battle' && current.side === side && current.index === index ? null : { kind: 'battle', side, index })
    setSearch('')
  }
  const updateTeam = (side: Side, index: number, pokemon: PokemonEntry | null, preserveTraining = false) => {
    const previous = teamFor(side)[index]
    if (pokemon && teamFor(side).some((entry, entryIndex) => entryIndex !== index && entry?.id === pokemon.id)) return
    const setTeam = side === 'player' ? setPlayerTeam : setOpponentTeam
    setTeam((current) => current.map((entry, entryIndex) => entryIndex === index ? pokemon : entry))
    if (!preserveTraining) setTrainingFor(side)((current) => current.map((entry, entryIndex) => entryIndex === index ? defaultTraining() : entry))
    if (previous && previous.id !== pokemon?.id) {
      const leavingBattleSlots = battleFor(side).map((id, battleIndex) => id === previous.id ? battleIndex : -1).filter((battleIndex) => battleIndex >= 0)
      setBattleFor(side)((current) => current.map((id) => id === previous.id ? pokemon?.id ?? null : id))
      if (!preserveTraining) setSpeedStagesFor(side)((current) => current.map((stage, battleIndex) => leavingBattleSlots.includes(battleIndex) ? 0 : stage) as BattleStages)
    }
  }
  const updateTraining = (side: Side, index: number, training: SpeedTraining) => {
    const statPoints = Number.isFinite(training.statPoints) ? Math.min(32, Math.max(0, Math.round(training.statPoints))) : 0
    setTrainingFor(side)((current) => current.map((entry, entryIndex) => entryIndex === index ? { statPoints, nature: training.nature, weatherAbility: training.weatherAbility } : entry))
  }
  const chooseTeamPokemon = (pokemon: PokemonEntry) => {
    if (!picker || picker.kind !== 'team') return
    updateTeam(picker.side, picker.index, pokemon)
    setPicker(null)
    setSearch('')
  }
  const updateSpeedStage = (side: Side, index: number, stage: number) => {
    const nextStage = Math.min(6, Math.max(-6, Math.round(stage)))
    setSpeedStagesFor(side)((current) => current.map((entry, entryIndex) => entryIndex === index ? nextStage : entry) as BattleStages)
  }
  const chooseBattlePokemon = (pokemon: PokemonEntry) => {
    if (!picker || picker.kind !== 'battle') return
    const battleChanged = battleFor(picker.side)[picker.index] !== pokemon.id
    setBattleFor(picker.side)((current) => current.map((id, index) => index === picker.index ? pokemon.id : id))
    if (battleChanged) updateSpeedStage(picker.side, picker.index, 0)
    setPicker(null)
  }

  useEffect(() => {
    if (picker?.kind !== 'battle') return
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (gymRef.current && !gymRef.current.contains(event.target as Node)) setPicker(null)
    }
    document.addEventListener('pointerdown', closeOnOutsidePress)
    return () => document.removeEventListener('pointerdown', closeOnOutsidePress)
  }, [picker])
  return <section className="simulation-view">
    <div className="simulation-layout">
      <TeamPanel side="player" title="MI EQUIPO" team={playerTeam} battleIds={playerBattle} picker={picker} search={search} choices={choices} onSelectTeamSlot={selectTeamSlot} onClearSlot={(side, index) => updateTeam(side, index, null)} onSearchChange={setSearch} onChooseTeamPokemon={chooseTeamPokemon} formChoicesFor={formChoicesFor} onChangeTeamForm={(changeSide, index, pokemon) => updateTeam(changeSide, index, pokemon, true)} training={playerTraining} getBaseSpeed={calculateBaseSpeed} onTrainingChange={updateTraining} tailwind={playerTailwind} onTailwindChange={() => setPlayerTailwind((current) => !current)} />
      <section className="gym" aria-label="Gimnasio de combate doble" ref={gymRef}>
        <div className="gym-header"><span>COMBATE DOBLE</span><b>VS</b><span>GIMNASIO</span></div>
        <div className="gym-field-controls"><div className="sim-weather-controls" aria-label="Clima">{([{ value: 'sun', label: 'SOL', theme: 'sun' }, { value: 'rain', label: 'LLUVIA', theme: 'rain' }, { value: 'sand', label: 'ARENA', theme: 'sand' }, { value: 'snow', label: 'NIEVE', theme: 'snow' }] as const).map((option) => <button type="button" key={option.theme} className={'sim-weather-button sim-weather-button--' + option.theme + (weather === option.value ? ' sim-weather-button--active' : '')} onClick={() => setWeather(weather === option.value ? null : option.value)} aria-pressed={weather === option.value}>{option.label}</button>)}</div><button type="button" className={'sim-condition-toggle sim-condition-toggle--trick-room' + (trickRoom ? ' sim-condition-toggle--active' : '')} onClick={() => setTrickRoom((current) => !current)} aria-pressed={trickRoom}>ESPACIO RARO</button></div>
        <div className="gym-floor">
          <div className="gym-combatants gym-combatants--opponent"><BattlePokemon pokemon={opponentCombatants[0]} side="opponent" order={opponentCombatants[0] ? movementOrder.get(battleKey('opponent', opponentCombatants[0])) : undefined} speed={effectiveSpeedFor('opponent', opponentCombatants[0])} speedStage={opponentSpeedStages[0]} onSpeedStageChange={(stage) => updateSpeedStage('opponent', 0, stage)} weatherAbility={opponentCombatants[0] ? selectedWeatherAbilityFor(opponentCombatants[0], opponentTraining[opponentTeam.findIndex((entry) => entry?.id === opponentCombatants[0]?.id)]) : null} weatherAbilityActive={opponentCombatants[0] ? isWeatherAbilityActive(opponentCombatants[0], opponentTraining[opponentTeam.findIndex((entry) => entry?.id === opponentCombatants[0]?.id)], weather) : false} active={picker?.kind === 'battle' && picker.side === 'opponent' && picker.index === 0} choices={battleChoicesFor('opponent')} battleIds={opponentBattle} selectedBattleId={opponentBattle[0]} onSelect={() => selectBattleSlot('opponent', 0)} onChoose={chooseBattlePokemon} /><BattlePokemon pokemon={opponentCombatants[1]} side="opponent" order={opponentCombatants[1] ? movementOrder.get(battleKey('opponent', opponentCombatants[1])) : undefined} speed={effectiveSpeedFor('opponent', opponentCombatants[1])} speedStage={opponentSpeedStages[1]} onSpeedStageChange={(stage) => updateSpeedStage('opponent', 1, stage)} weatherAbility={opponentCombatants[1] ? selectedWeatherAbilityFor(opponentCombatants[1], opponentTraining[opponentTeam.findIndex((entry) => entry?.id === opponentCombatants[1]?.id)]) : null} weatherAbilityActive={opponentCombatants[1] ? isWeatherAbilityActive(opponentCombatants[1], opponentTraining[opponentTeam.findIndex((entry) => entry?.id === opponentCombatants[1]?.id)], weather) : false} active={picker?.kind === 'battle' && picker.side === 'opponent' && picker.index === 1} choices={battleChoicesFor('opponent')} battleIds={opponentBattle} selectedBattleId={opponentBattle[1]} onSelect={() => selectBattleSlot('opponent', 1)} onChoose={chooseBattlePokemon} /></div>
          <div className="gym-combatants gym-combatants--player"><BattlePokemon pokemon={playerCombatants[0]} side="player" order={playerCombatants[0] ? movementOrder.get(battleKey('player', playerCombatants[0])) : undefined} speed={effectiveSpeedFor('player', playerCombatants[0])} speedStage={playerSpeedStages[0]} onSpeedStageChange={(stage) => updateSpeedStage('player', 0, stage)} weatherAbility={playerCombatants[0] ? selectedWeatherAbilityFor(playerCombatants[0], playerTraining[playerTeam.findIndex((entry) => entry?.id === playerCombatants[0]?.id)]) : null} weatherAbilityActive={playerCombatants[0] ? isWeatherAbilityActive(playerCombatants[0], playerTraining[playerTeam.findIndex((entry) => entry?.id === playerCombatants[0]?.id)], weather) : false} active={picker?.kind === 'battle' && picker.side === 'player' && picker.index === 0} choices={battleChoicesFor('player')} battleIds={playerBattle} selectedBattleId={playerBattle[0]} onSelect={() => selectBattleSlot('player', 0)} onChoose={chooseBattlePokemon} /><BattlePokemon pokemon={playerCombatants[1]} side="player" order={playerCombatants[1] ? movementOrder.get(battleKey('player', playerCombatants[1])) : undefined} speed={effectiveSpeedFor('player', playerCombatants[1])} speedStage={playerSpeedStages[1]} onSpeedStageChange={(stage) => updateSpeedStage('player', 1, stage)} weatherAbility={playerCombatants[1] ? selectedWeatherAbilityFor(playerCombatants[1], playerTraining[playerTeam.findIndex((entry) => entry?.id === playerCombatants[1]?.id)]) : null} weatherAbilityActive={playerCombatants[1] ? isWeatherAbilityActive(playerCombatants[1], playerTraining[playerTeam.findIndex((entry) => entry?.id === playerCombatants[1]?.id)], weather) : false} active={picker?.kind === 'battle' && picker.side === 'player' && picker.index === 1} choices={battleChoicesFor('player')} battleIds={playerBattle} selectedBattleId={playerBattle[1]} onSelect={() => selectBattleSlot('player', 1)} onChoose={chooseBattlePokemon} /></div>
        </div>
      </section>
      <TeamPanel side="opponent" title="EQUIPO RIVAL" team={opponentTeam} battleIds={opponentBattle} picker={picker} search={search} choices={choices} onSelectTeamSlot={selectTeamSlot} onClearSlot={(side, index) => updateTeam(side, index, null)} onSearchChange={setSearch} onChooseTeamPokemon={chooseTeamPokemon} formChoicesFor={formChoicesFor} onChangeTeamForm={(changeSide, index, pokemon) => updateTeam(changeSide, index, pokemon, true)} training={opponentTraining} getBaseSpeed={calculateBaseSpeed} onTrainingChange={updateTraining} tailwind={opponentTailwind} onTailwindChange={() => setOpponentTailwind((current) => !current)} />
    </div>
  </section>
}



