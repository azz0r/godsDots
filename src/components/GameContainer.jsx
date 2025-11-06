import React, { useState, useCallback, useEffect } from 'react'
import { useGameEngine } from '../hooks/useGameEngine'
import { useLandManagement } from '../hooks/useLandManagement'
import { useEntities } from '../contexts/EntityContext'
import GameCanvas from './GameCanvas'
import TopBar from './TopBar'
import PowerBar from './PowerBar'
import InfoPanel from './InfoPanel'
import DebugPanel from './DebugPanel'
import LandManagementPanel from './LandManagementPanel'
import EntityBrowser from './EntityBrowser'
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
    handleVillagerCommand,
    systems
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
  const [showEntityBrowser, setShowEntityBrowser] = useState(false)

  // Entity management
  const { updateEntities, registerNavigateCallback } = useEntities()

  // Register camera navigation callback
  useEffect(() => {
    registerNavigateCallback((x, y) => {
      // Access camera through gameStateRef
      const camera = gameStateRef?.current?.camera
      if (camera) {
        camera.targetX = x
        camera.targetY = y
        console.log(`[Camera] Panning to entity at (${x}, ${y})`)
      }
    })
  }, [gameStateRef, registerNavigateCallback])

  // Update entity browser with latest game state
  useEffect(() => {
    const interval = setInterval(() => {
      if (systems?.players && systems?.resources && systems?.building) {
        updateEntities(systems.players, systems.resources, systems.building)
      } else {
        console.log('[EntityBrowser] Systems not ready:', {
          hasPlayers: !!systems?.players,
          hasResources: !!systems?.resources,
          hasBuilding: !!systems?.building,
          systems
        })
      }
    }, 1000) // Update every second

    return () => clearInterval(interval)
  }, [systems, updateEntities])

  const handleSave = async () => {
    const success = await manualSaveGame()
    if (success) {
      // Could show a success message or visual feedback
      console.log('Game saved successfully!')
    }
  }
  
  // Gesture handling for miracle casting
  const handleGestureStart = useCallback((x, y) => {
    // Update game state to show gesture is being drawn
    // This is handled in the game engine through miracleSystem
  }, [])
  
  const handleGestureUpdate = useCallback((x, y) => {
    // Update gesture preview
    // This is handled in the game engine through miracleSystem
  }, [])
  
  const handleGestureComplete = useCallback((gestureResult, x, y) => {
    // Get the human player
    const humanPlayer = systems.players.players.find(p => p.id === gameState.humanPlayerId)
    if (!humanPlayer) return
    
    // Complete the miracle casting
    const result = systems.miracle.completeCasting(humanPlayer, gestureResult)
    if (!result.success) {
      console.log('Miracle casting failed:', result.reason)
      // Could show error message to player
    } else {
      console.log('Miracle cast successfully:', result.message)
    }
  }, [systems, gameState.humanPlayerId])
  
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

  const handleDebugAction = useCallback((action, entity) => {
    console.log('Debug action:', action, entity)

    // Find the actual entity from the game systems
    const player = systems?.players?.players.find(p => p.id === entity.playerId)
    if (!player) return

    if (entity.type === 'villager') {
      const villager = player.villagers.find(v => v.id === entity.id)
      if (!villager) return

      switch (action) {
        case 'heal':
          villager.health = 100
          console.log(`Healed ${villager.id} to 100%`)
          break
        case 'feed':
          if (villager.needs) {
            villager.needs.hunger = 100
          }
          villager.hunger = 100
          console.log(`Fed ${villager.id}`)
          break
        case 'resetState':
          villager.state = 'wandering'
          villager.path = []
          villager.pathIndex = 0
          villager.target = null
          villager.movement.isIdle = false
          console.log(`Reset ${villager.id} to wandering`)
          break
        case 'kill':
          const index = player.villagers.indexOf(villager)
          if (index > -1) {
            player.villagers.splice(index, 1)
            player.population = player.villagers.length
            console.log(`Killed ${villager.id}`)
          }
          break
      }
    } else if (entity.type === 'building') {
      const building = player.buildings.find(b => b.id === entity.id)
      if (!building) return

      switch (action) {
        case 'heal':
          building.health = 100
          console.log(`Repaired ${building.id}`)
          break
        case 'complete':
          building.isUnderConstruction = false
          building.constructionTime = 0
          console.log(`Completed ${building.id}`)
          break
        case 'destroy':
          const index = player.buildings.indexOf(building)
          if (index > -1) {
            player.buildings.splice(index, 1)
            console.log(`Destroyed ${building.id}`)
          }
          break
      }
    }
  }, [systems])

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
        gestureRecognizer={systems.gestureRecognizer}
        miracleSystem={systems.miracle}
        onGestureStart={handleGestureStart}
        onGestureUpdate={handleGestureUpdate}
        onGestureComplete={handleGestureComplete}
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

        {/* Entity Browser */}
        <EntityBrowser
          visible={showEntityBrowser}
          onClose={() => setShowEntityBrowser(false)}
          onDebugAction={handleDebugAction}
        />

        {/* Entity Browser Toggle Button */}
        <button
          className={styles.entityBrowserToggle}
          onClick={() => setShowEntityBrowser(!showEntityBrowser)}
          title="Toggle Entity Browser"
        >
          📋
        </button>
      </div>
    </div>
  )
}

export default GameContainer