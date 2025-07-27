import React, { useState, useEffect, useCallback, useMemo } from 'react'
import GameContainer from './components/GameContainer'
import { LandManager } from './classes/LandManager'
import { PathfindingGrid } from './utils/pathfinding/PathfindingGrid'
import { MapGenerator } from './utils/mapGeneration/MapGenerator'
import gameConfig from './config/gameConfig'
import './styles/App.css'

function App() {
  const [gameState, setGameState] = useState('menu') // menu, playing, paused
  const [mapSeed, setMapSeed] = useState(Date.now())
  const [debugMode, setDebugMode] = useState(false)
  
  // Calculate world dimensions
  const worldWidth = gameConfig.map.width * gameConfig.tileSize
  const worldHeight = gameConfig.map.height * gameConfig.tileSize
  
  // Initialize core systems
  const landManager = useMemo(() => new LandManager(worldWidth, worldHeight), [])
  // PathfindingGrid will be initialized in GameContainer after terrain system is ready
  const [pathfindingGrid, setPathfindingGrid] = useState(null)
  const mapGenerator = useMemo(() => new MapGenerator(mapSeed), [mapSeed])

  // Initialize game on start
  const initializeGame = useCallback(() => {
    // This initialization is now handled by GameInitializer in useGameEngine
    // Just set the game state to playing
    setGameState('playing')
  }, [])

  // Handle new game
  const startNewGame = useCallback(() => {
    setMapSeed(Date.now())
    initializeGame()
  }, [initializeGame])

  // Toggle debug mode
  const toggleDebugMode = useCallback(() => {
    setDebugMode(prev => !prev)
  }, [])

  const gameContext = {
    landManager,
    pathfindingGrid,
    setPathfindingGrid,
    mapGenerator,
    debugMode,
    gameState,
    toggleDebugMode,
    startNewGame
  }

  return (
    <div className="App">
      {gameState === 'menu' ? (
        <div className="main-menu">
          <h1>God Dots</h1>
          <button onClick={startNewGame}>New Game</button>
          <button onClick={() => setDebugMode(!debugMode)}>
            Debug Mode: {debugMode ? 'ON' : 'OFF'}
          </button>
        </div>
      ) : (
        <GameContainer gameContext={gameContext} />
      )}
    </div>
  )
}

export default App