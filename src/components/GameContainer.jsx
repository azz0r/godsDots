import React, { useState, useCallback } from 'react'
import { useGameEngine } from '../hooks/useGameEngine'
import { useLandManagement } from '../hooks/useLandManagement'
import GameCanvas from './GameCanvas'
import TopBar from './TopBar'
import PowerBar from './PowerBar'
import InfoPanel from './InfoPanel'
import DebugPanel from './DebugPanel'
import LandManagementPanel from './LandManagementPanel'
import styles from '../styles/GameContainer.module.css'

const GameContainer = ({ gameContext }) => {
  const { 
    canvasRef, 
    gameState, 
    gameStateRef, 
    selectPower, 
    usePower, 
    zoomToWorldView,
    zoomToTemple, 
    manualSaveGame, 
    regenerateMap, 
    mapSeed,
    hoveredTile,
    selectedTile,
    handleVillagerSelect,
    handleVillagerCommand
  } = useGameEngine(gameContext)
  
  const {
    availablePlots,
    ownedPlots,
    selectedPlot,
    purchasePlot,
    selectPlot,
    getPlotInfo,
    canAffordPlot
  } = useLandManagement(gameContext.landManager, gameState.beliefPoints)
  
  const [showLandBorders, setShowLandBorders] = useState(true)
  const [showLandPanel, setShowLandPanel] = useState(false)
  const [showPaths, setShowPaths] = useState(false)

  const handleSave = async () => {
    const success = await manualSaveGame()
    if (success) {
      // Could show a success message or visual feedback
      console.log('Game saved successfully!')
    }
  }
  
  const handleTileClick = useCallback((x, y) => {
    if (gameState.selectedPower === 'landManagement') {
      const plot = gameContext.landManager.getPlotAt(x, y)
      if (plot) {
        selectPlot(plot.id)
        setShowLandPanel(true)
      }
    } else {
      usePower(x, y)
    }
  }, [gameState.selectedPower, gameContext.landManager, selectPlot, usePower])

  return (
    <div className={styles.gameContainer}>
      <GameCanvas
        canvasRef={canvasRef}
        gameStateRef={gameStateRef}
        selectedPower={gameState.selectedPower}
        usePower={handleTileClick}
        onVillagerSelect={handleVillagerSelect}
        onVillagerCommand={handleVillagerCommand}
        showLandBorders={showLandBorders}
        showPaths={showPaths}
        landManager={gameContext.landManager}
        hoveredEntity={gameState.hoveredEntity}
      />
      
      <div className={styles.ui}>
        <TopBar
          beliefPoints={gameState.beliefPoints}
          population={gameState.population}
          timeInfo={gameState.timeInfo}
          onSave={handleSave}
          onZoomOut={zoomToWorldView}
          onTempleView={zoomToTemple}
        />
        
        <PowerBar
          selectedPower={gameState.selectedPower}
          onPowerSelect={selectPower}
          onZoomOut={zoomToWorldView}
          additionalPowers={[
            { id: 'landManagement', name: 'Land Management', icon: '🏘️' }
          ]}
        />
        
        <InfoPanel 
          selectedVillager={gameState.selectedVillagerIds?.length === 1 ? 
            gameState.hoveredEntity?.type === 'villager' ? gameState.hoveredEntity.entity : null 
            : null}
          hoveredEntity={gameState.hoveredEntity}
        />
        
        {showLandPanel && (
          <LandManagementPanel
            selectedPlot={selectedPlot}
            plotInfo={getPlotInfo(selectedPlot)}
            ownedPlots={ownedPlots}
            availablePlots={availablePlots}
            onPurchase={purchasePlot}
            onSelectPlot={selectPlot}
            canAfford={canAffordPlot}
            onClose={() => setShowLandPanel(false)}
          />
        )}
        
        {/* Debug panel for development */}
        {(process.env.NODE_ENV === 'development' || gameContext.debugMode) && (
          <DebugPanel 
            onRegenerateMap={regenerateMap}
            currentSeed={mapSeed}
            showLandBorders={showLandBorders}
            onToggleLandBorders={() => setShowLandBorders(!showLandBorders)}
            showPaths={showPaths}
            onTogglePaths={() => setShowPaths(!showPaths)}
            pathfindingGrid={gameContext.pathfindingGrid}
            landManager={gameContext.landManager}
          />
        )}
      </div>
    </div>
  )
}

export default GameContainer