import React, { useState, useEffect } from 'react'
import styles from '../styles/DebugPanel.module.css'
import gameConfig from '../config/gameConfig'

const DebugPanel = ({
  onRegenerateMap,
  currentSeed,
  showLandBorders,
  onToggleLandBorders,
  pathfindingGrid,
  landManager,
  showPaths,
  onTogglePaths
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [showPathfinding, setShowPathfinding] = useState(gameConfig.debug.showPathfinding)
  const [showGrid, setShowGrid] = useState(gameConfig.debug.showGrid)
  const [mapSeed, setMapSeed] = useState('')
  const [debugStats, setDebugStats] = useState({
    landPlots: 0,
    ownedPlots: 0,
    pathNodes: 0
  })

  useEffect(() => {
    // Update debug stats
    if (landManager) {
      const plots = landManager.getAllPlots()
      setDebugStats(prev => ({
        ...prev,
        landPlots: plots.length,
        ownedPlots: plots.filter(p => p.owner).length
      }))
    }
  }, [landManager])

  const togglePathfinding = () => {
    const newValue = !showPathfinding
    setShowPathfinding(newValue)
    window.DEBUG_PATHFINDING = newValue
    gameConfig.debug.showPathfinding = newValue
  }

  const toggleGrid = () => {
    const newValue = !showGrid
    setShowGrid(newValue)
    gameConfig.debug.showGrid = newValue
  }

  const handleRegenerateMap = () => {
    const seed = mapSeed ? parseFloat(mapSeed) : null
    if (onRegenerateMap) {
      onRegenerateMap(seed)
    }
  }

  return (
    <div className={`${styles.debugPanel} ${isCollapsed ? styles.collapsed : ''}`}>
      <div className={styles.debugHeader}>
        <h4>Debug Options</h4>
        <button
          className={styles.collapseButton}
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? "Expand" : "Collapse"}
        >
          {isCollapsed ? '▶' : '▼'}
        </button>
      </div>

      {!isCollapsed && (<>
      <div className={styles.mapGeneration}>
        <h5>Map Generation</h5>
        <div className={styles.seedInfo}>
          Current Seed: {currentSeed || 'None'}
        </div>
        <div className={styles.seedControl}>
          <input
            type="text"
            placeholder="Enter seed (optional)"
            value={mapSeed}
            onChange={(e) => setMapSeed(e.target.value)}
            className={styles.seedInput}
          />
          <button onClick={handleRegenerateMap} className={styles.generateButton}>
            Generate New Map
          </button>
        </div>
      </div>

      <div className={styles.debugOptions}>
        <h5>Display Options</h5>
        
        <label className={styles.debugOption}>
          <input
            type="checkbox"
            checked={showLandBorders}
            onChange={onToggleLandBorders}
          />
          Show Land Borders
        </label>
        
        <label className={styles.debugOption}>
          <input
            type="checkbox"
            checked={showPaths}
            onChange={onTogglePaths}
          />
          Show Paths
        </label>
        
        <label className={styles.debugOption}>
          <input
            type="checkbox"
            checked={showPathfinding}
            onChange={togglePathfinding}
          />
          Show Pathfinding Costs
        </label>
        
        <label className={styles.debugOption}>
          <input
            type="checkbox"
            checked={showGrid}
            onChange={toggleGrid}
          />
          Show Tile Grid
        </label>
      </div>
      
      <div className={styles.debugStats}>
        <h5>System Stats</h5>
        <ul>
          <li>Land Plots: {debugStats.landPlots}</li>
          <li>Owned Plots: {debugStats.ownedPlots}</li>
          <li>Map Size: {gameConfig.map.width}x{gameConfig.map.height}</li>
          <li>Tile Size: {gameConfig.tileSize}px</li>
        </ul>
      </div>
      
      <div className={styles.debugInfo}>
        <h5>Active Features:</h5>
        <ul>
          <li>Procedural terrain generation</li>
          <li>A* pathfinding with terrain costs</li>
          <li>Land ownership system</li>
          <li>Pixel-perfect movement</li>
          <li>Multiple biomes with rivers</li>
          <li>Integrated building placement</li>
        </ul>
      </div>
      </>)}
    </div>
  )
}

export default DebugPanel