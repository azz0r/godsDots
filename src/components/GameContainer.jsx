import React from 'react'
import { useGameEngine } from '../hooks/useGameEngine'
import GameCanvas from './GameCanvas'
import TopBar from './TopBar'
import PowerBar from './PowerBar'
import InfoPanel from './InfoPanel'
import styles from '../styles/GameContainer.module.css'

const GameContainer = () => {
  const { canvasRef, gameState, gameStateRef, selectPower, usePower, zoomToWorldView, manualSaveGame } = useGameEngine()

  const handleSave = async () => {
    const success = await manualSaveGame()
    if (success) {
      // Could show a success message or visual feedback
      console.log('Game saved successfully!')
    }
  }

  return (
    <div className={styles.gameContainer}>
      <GameCanvas
        canvasRef={canvasRef}
        gameStateRef={gameStateRef}
        selectedPower={gameState.selectedPower}
        usePower={usePower}
      />
      
      <div className={styles.ui}>
        <TopBar
          beliefPoints={gameState.beliefPoints}
          population={gameState.population}
          onSave={handleSave}
          onZoomOut={zoomToWorldView}
        />
        
        <PowerBar
          selectedPower={gameState.selectedPower}
          onPowerSelect={selectPower}
          onZoomOut={zoomToWorldView}
        />
        
        <InfoPanel />
      </div>
    </div>
  )
}

export default GameContainer