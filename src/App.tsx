import { useState } from 'react'
import pokemonData from './data/pokemon-mb.json'
import type { PokemonCatalog } from './data/types'
import { validateCatalog } from './domain/game'
import { GameScreen, type GameMode } from './components/GameScreen'
import { PokedexTable } from './components/PokedexTable'
import { SimulationView } from './components/SimulationView'
import { useGame } from './hooks/useGame'
import { useSpeedQuiz } from './hooks/useSpeedQuiz'

const catalogDocument = pokemonData as PokemonCatalog
validateCatalog(catalogDocument)
const catalog = catalogDocument.pokemon

export default function App() {
  const comparisonGame = useGame(catalog)
  const speedQuiz = useSpeedQuiz(catalog)
  const [activeView, setActiveView] = useState<'game' | 'table' | 'simulation'>('game')
  const [gameMode, setGameMode] = useState<GameMode>('compare')
  const activeScore = gameMode === 'compare' ? comparisonGame : speedQuiz

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="champions-brand" href="https://champions.pokemon.com/es-es/" target="_blank" rel="noreferrer" aria-label={'Abrir el sitio oficial de Pok\u00e9mon Champions'}>
          <img src="https://champions.pokemon.com/_images/global/logo/pc-logo.png" alt={'Pok\u00e9mon Champions'} />
          <span>REGLAMENTO {catalogDocument.regulation}</span>
        </a>
        <p className="trainer-title">ENTRENADOR DE VELOCIDAD</p>
        <nav className="view-tabs" aria-label="Secciones">
          <button type="button" className={activeView === 'game' ? 'view-tab view-tab--active' : 'view-tab'} onClick={() => setActiveView('game')}>JUGAR</button>
          <button type="button" className={activeView === 'table' ? 'view-tab view-tab--active' : 'view-tab'} onClick={() => setActiveView('table')}>TABLA</button>
          <button type="button" className={activeView === 'simulation' ? 'view-tab view-tab--active' : 'view-tab'} onClick={() => setActiveView('simulation')}>SIMULACI&#211;N</button>
        </nav>
      </header>

      {activeView === 'game' ? <GameScreen catalog={catalog} mode={gameMode} onModeChange={setGameMode} comparisonGame={comparisonGame} speedQuiz={speedQuiz} streak={activeScore.streak} bestStreak={activeScore.bestStreak} /> : activeView === 'table' ? <PokedexTable catalog={catalog} /> : <SimulationView catalog={catalog} />}

      <footer>
        Herramienta de entrenamiento no oficial para Pok&#233;mon Champions. Datos de Reglamento M-B e ilustraciones enlazadas desde <a href="https://www.wikidex.net/wiki/Reglamento_M-B" target="_blank" rel="noreferrer">WikiDex</a>. Pok&#233;mon pertenece a sus respectivos titulares.
      </footer>
    </main>
  )
}
