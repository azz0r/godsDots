/**
 * Layer 5: Terrain Development Panel with Pathfinding, Villagers, and Camera Controls
 *
 * Debug UI for testing terrain generation, pathfinding, villager spawning, and camera controls.
 * Overlays on top of the Phaser game canvas.
 */

import { useState, useEffect } from 'react';
import { BIOME_TYPES } from '../config/terrainConfig';
import './TerrainDevPanel.css';

export default function TerrainDevPanel({ gameRef, isVisible, onToggle }) {
  const [expanded, setExpanded] = useState(false);
  const [pathExpanded, setPathExpanded] = useState(true);
  const [villagersExpanded, setVillagersExpanded] = useState(true);
  const [fps, setFps] = useState(0);

  // Default to center of map where land is more likely (map is 250x250)
  const [startX, setStartX] = useState('100');
  const [startY, setStartY] = useState('100');
  const [endX, setEndX] = useState('150');
  const [endY, setEndY] = useState('150');

  // Villager state
  const [villagerCount, setVillagerCount] = useState(0);
  const [maxVillagers, setMaxVillagers] = useState(1400);
  const [villagersPaused, setVillagersPaused] = useState(false);
  const [selectedVillagerId, setSelectedVillagerId] = useState('');
  const [currentVillagerIndex, setCurrentVillagerIndex] = useState(0);
  const [currentTempleIndex, setCurrentTempleIndex] = useState(0);

  // Game state
  const [gameSpeed, setGameSpeed] = useState(1);
  const [belief, setBelief] = useState(0);
  const [population, setPopulation] = useState(0);
  const [worshipping, setWorshipping] = useState(0);
  const [dayTime, setDayTime] = useState('');
  const [gameExpanded, setGameExpanded] = useState(true);
  const [selectedPower, setSelectedPower] = useState(null);
  const [powersExpanded, setPowersExpanded] = useState(true);
  const [buildingMode, setBuildingMode] = useState(null);
  const [buildingCount, setBuildingCount] = useState(0);

  /**
   * Track FPS and villager count from Phaser game loop
   */
  useEffect(() => {
    if (!gameRef.current) return;

    const interval = setInterval(() => {
      if (gameRef.current && gameRef.current.loop) {
        const currentFps = Math.round(gameRef.current.loop.actualFps || 0);
        setFps(currentFps);
      }
      // Sync game state from scene
      if (gameRef.current) {
        const scene = gameRef.current.scene.getScene('MainScene');
        if (scene) {
          if (scene.villagerSystem) {
            setVillagerCount(scene.villagerSystem.getCount());
            setWorshipping(scene.villagerSystem.getWorshippingCount());
          }
          if (scene.playerSystem) {
            const human = scene.playerSystem.getHumanPlayer();
            if (human) {
              setBelief(Math.floor(human.beliefPoints));
              setPopulation(human.population);
            }
          }
          if (scene.gameClock) {
            setDayTime(scene.gameClock.getTimeString());
          }
          if (scene.divinePowerSystem) {
            setSelectedPower(scene.divinePowerSystem.selectedPower);
          }
          if (scene.buildingSystem) {
            setBuildingMode(scene.buildingSystem.selectedType);
            setBuildingCount(scene.buildingSystem.getCount());
          }
        }
      }
    }, 250);

    return () => clearInterval(interval);
  }, [gameRef]);

  /**
   * Get max villagers limit from VillagerSystem on mount
   */
  useEffect(() => {
    if (!gameRef.current) return;

    const scene = gameRef.current.scene.getScene('MainScene');
    if (scene && scene.villagerSystem) {
      const max = scene.villagerSystem.getMaxVillagers();
      setMaxVillagers(max);
    }
  }, [gameRef]);

  /**
   * Regenerate terrain with current seed
   */
  const handleRegenerate = () => {
    console.log('[TerrainDevPanel] Regenerate button clicked');
    console.log('[TerrainDevPanel] gameRef.current:', gameRef.current);

    if (!gameRef.current) {
      console.error('[TerrainDevPanel] No game instance available!');
      return;
    }

    console.log('[TerrainDevPanel] Getting MainScene...');
    const scene = gameRef.current.scene.getScene('MainScene');
    console.log('[TerrainDevPanel] Scene found:', scene);

    if (scene && scene.regenerateTerrain) {
      console.log('[TerrainDevPanel] Calling scene.regenerateTerrain()...');
      scene.regenerateTerrain();
      console.log('[TerrainDevPanel] Regeneration complete!');
    } else {
      console.error('[TerrainDevPanel] Scene or regenerateTerrain method not found!', {
        scene,
        hasMethod: scene ? typeof scene.regenerateTerrain : 'no scene'
      });
    }
  };

  /**
   * Generate terrain with specific seed
   */
  const handleSeedChange = (e) => {
    console.log('[TerrainDevPanel] Seed input changed');

    if (!gameRef.current) {
      console.error('[TerrainDevPanel] No game instance for seed change!');
      return;
    }

    const seed = parseInt(e.target.value, 10);
    console.log('[TerrainDevPanel] Parsed seed:', seed);

    if (isNaN(seed)) {
      console.warn('[TerrainDevPanel] Invalid seed value');
      return;
    }

    const scene = gameRef.current.scene.getScene('MainScene');
    if (scene && scene.generateTerrain) {
      console.log('[TerrainDevPanel] Generating terrain with seed:', seed);
      scene.generateTerrain(seed);
    } else {
      console.error('[TerrainDevPanel] Cannot generate terrain - scene not found');
    }
  };

  /**
   * Layer 3: Find path between start and end coordinates
   */
  const handleFindPath = () => {
    console.log('[TerrainDevPanel] Find Path button clicked');

    if (!gameRef.current) {
      console.error('[TerrainDevPanel] No game instance for pathfinding!');
      return;
    }

    const sx = parseInt(startX, 10);
    const sy = parseInt(startY, 10);
    const ex = parseInt(endX, 10);
    const ey = parseInt(endY, 10);

    if (isNaN(sx) || isNaN(sy) || isNaN(ex) || isNaN(ey)) {
      console.error('[TerrainDevPanel] Invalid coordinates');
      return;
    }

    const scene = gameRef.current.scene.getScene('MainScene');
    if (scene && scene.findPath) {
      console.log(`[TerrainDevPanel] Finding path from (${sx},${sy}) to (${ex},${ey})`);
      scene.findPath(sx, sy, ex, ey);
    } else {
      console.error('[TerrainDevPanel] Cannot find path - scene not found');
    }
  };

  /**
   * Layer 3: Clear current path
   */
  const handleClearPath = () => {
    console.log('[TerrainDevPanel] Clear Path button clicked');

    if (!gameRef.current) {
      console.error('[TerrainDevPanel] No game instance for clearing path!');
      return;
    }

    const scene = gameRef.current.scene.getScene('MainScene');
    if (scene && scene.clearPath) {
      scene.clearPath();
    }
  };

  /**
   * Layer 3: Find random passable tiles and set as start/end
   */
  const handleFindRandomPassable = () => {
    console.log('[TerrainDevPanel] Find Random Passable clicked');

    if (!gameRef.current) {
      console.error('[TerrainDevPanel] No game instance!');
      return;
    }

    const scene = gameRef.current.scene.getScene('MainScene');
    if (!scene || !scene.biomeMap) {
      console.error('[TerrainDevPanel] Scene or biomeMap not available');
      return;
    }

    // Find passable tiles in center area where land is most likely
    const passableTiles = [];
    const centerX = Math.floor(scene.mapWidth / 2);
    const centerY = Math.floor(scene.mapHeight / 2);
    const searchRadius = 75; // Search 75 tiles around center

    for (let y = centerY - searchRadius; y < centerY + searchRadius; y++) {
      for (let x = centerX - searchRadius; x < centerX + searchRadius; x++) {
        if (x >= 0 && x < scene.mapWidth && y >= 0 && y < scene.mapHeight) {
          const biome = scene.getBiomeAt(x, y);
          if (biome && biome.passable) {
            passableTiles.push({ x, y, biome: biome.name });
          }
        }
      }
    }

    console.log(`[TerrainDevPanel] Found ${passableTiles.length} passable tiles`);

    if (passableTiles.length >= 2) {
      // Pick random start and end
      const startIdx = Math.floor(Math.random() * passableTiles.length);
      let endIdx = Math.floor(Math.random() * passableTiles.length);

      // Make sure start and end are different
      while (endIdx === startIdx && passableTiles.length > 1) {
        endIdx = Math.floor(Math.random() * passableTiles.length);
      }

      const start = passableTiles[startIdx];
      const end = passableTiles[endIdx];

      console.log(`[TerrainDevPanel] Setting start: ${start.biome}(${start.x},${start.y}), end: ${end.biome}(${end.x},${end.y})`);

      setStartX(start.x.toString());
      setStartY(start.y.toString());
      setEndX(end.x.toString());
      setEndY(end.y.toString());
    } else {
      console.warn('[TerrainDevPanel] Not enough passable tiles found');
    }
  };

  /**
   * Layer 4: Spawn a villager at a random passable location
   */
  const handleSpawnVillager = () => {
    console.log('[TerrainDevPanel] Spawn Villager clicked');

    if (!gameRef.current) {
      console.error('[TerrainDevPanel] No game instance!');
      return;
    }

    const scene = gameRef.current.scene.getScene('MainScene');
    if (!scene || !scene.villagerSystem || !scene.biomeMap) {
      console.error('[TerrainDevPanel] Villager system not available');
      return;
    }

    // Find a random passable tile in center area
    const centerX = Math.floor(scene.mapWidth / 2);
    const centerY = Math.floor(scene.mapHeight / 2);
    const searchRadius = 75;

    const passableTiles = [];
    for (let y = centerY - searchRadius; y < centerY + searchRadius; y++) {
      for (let x = centerX - searchRadius; x < centerX + searchRadius; x++) {
        if (x >= 0 && x < scene.mapWidth && y >= 0 && y < scene.mapHeight) {
          const biome = scene.getBiomeAt(x, y);
          if (biome && biome.passable) {
            passableTiles.push({ x, y });
          }
        }
      }
    }

    if (passableTiles.length > 0) {
      const spawnPos = passableTiles[Math.floor(Math.random() * passableTiles.length)];
      scene.villagerSystem.spawnVillager(spawnPos.x, spawnPos.y);
      setVillagerCount(scene.villagerSystem.getCount());
      console.log(`[TerrainDevPanel] Spawned villager at (${spawnPos.x},${spawnPos.y})`);
    } else {
      console.warn('[TerrainDevPanel] No passable tiles found for spawning');
    }
  };

  /**
   * Spawn multiple villagers at once (for testing)
   */
  const handleSpawnMultipleVillagers = (count) => {
    console.log(`[TerrainDevPanel] Spawning ${count} villagers`);

    if (!gameRef.current) {
      console.error('[TerrainDevPanel] No game instance!');
      return;
    }

    const scene = gameRef.current.scene.getScene('MainScene');
    if (!scene || !scene.villagerSystem || !scene.biomeMap) {
      console.error('[TerrainDevPanel] Villager system not available');
      return;
    }

    // Find passable tiles in center area
    const centerX = Math.floor(scene.mapWidth / 2);
    const centerY = Math.floor(scene.mapHeight / 2);
    const searchRadius = 75;

    const passableTiles = [];
    for (let y = centerY - searchRadius; y < centerY + searchRadius; y++) {
      for (let x = centerX - searchRadius; x < centerX + searchRadius; x++) {
        if (x >= 0 && x < scene.mapWidth && y >= 0 && y < scene.mapHeight) {
          const biome = scene.getBiomeAt(x, y);
          if (biome && biome.passable) {
            passableTiles.push({ x, y });
          }
        }
      }
    }

    if (passableTiles.length === 0) {
      console.warn('[TerrainDevPanel] No passable tiles found for spawning');
      return;
    }

    // Spawn villagers at random passable locations
    for (let i = 0; i < count; i++) {
      const spawnPos = passableTiles[Math.floor(Math.random() * passableTiles.length)];
      scene.villagerSystem.spawnVillager(spawnPos.x, spawnPos.y);
    }

    setVillagerCount(scene.villagerSystem.getCount());
    console.log(`[TerrainDevPanel] Spawned ${count} villagers`);
  };

  /**
   * Layer 4: Pause or resume all villagers
   */
  const handleTogglePauseVillagers = () => {
    console.log('[TerrainDevPanel] Toggle Pause Villagers clicked');

    if (!gameRef.current) {
      console.error('[TerrainDevPanel] No game instance!');
      return;
    }

    const scene = gameRef.current.scene.getScene('MainScene');
    if (!scene || !scene.villagerSystem) {
      console.error('[TerrainDevPanel] Villager system not available');
      return;
    }

    if (villagersPaused) {
      scene.villagerSystem.resumeAll();
      setVillagersPaused(false);
      console.log('[TerrainDevPanel] Villagers resumed');
    } else {
      scene.villagerSystem.pauseAll();
      setVillagersPaused(true);
      console.log('[TerrainDevPanel] Villagers paused');
    }
  };

  /**
   * Layer 4: Clear all villagers
   */
  const handleClearVillagers = () => {
    console.log('[TerrainDevPanel] Clear Villagers clicked');

    if (!gameRef.current) {
      console.error('[TerrainDevPanel] No game instance!');
      return;
    }

    const scene = gameRef.current.scene.getScene('MainScene');
    if (!scene || !scene.villagerSystem) {
      console.error('[TerrainDevPanel] Villager system not available');
      return;
    }

    scene.villagerSystem.clearAll();
    setVillagerCount(0);
    setVillagersPaused(false);
    setSelectedVillagerId('');
    console.log('[TerrainDevPanel] All villagers cleared');
  };

  /**
   * Layer 5: Zoom to selected villager
   */
  const handleZoomToVillager = (e) => {
    const villagerId = parseInt(e.target.value, 10);
    console.log('[TerrainDevPanel] Zoom to villager:', villagerId);

    if (!villagerId || isNaN(villagerId)) {
      setSelectedVillagerId('');
      return;
    }

    setSelectedVillagerId(villagerId.toString());

    if (!gameRef.current) {
      console.error('[TerrainDevPanel] No game instance!');
      return;
    }

    const scene = gameRef.current.scene.getScene('MainScene');
    if (!scene || !scene.villagerSystem || !scene.cameraControlSystem) {
      console.error('[TerrainDevPanel] Villager or camera system not available');
      return;
    }

    const villager = scene.villagerSystem.getVillager(villagerId);
    if (villager) {
      scene.cameraControlSystem.zoomToVillager(villager);
      console.log(`[TerrainDevPanel] Zooming to villager ${villagerId}`);
    } else {
      console.warn(`[TerrainDevPanel] Villager ${villagerId} not found`);
    }
  };

  /**
   * Cycle to next villager
   */
  const handleCycleVillager = () => {
    if (!gameRef.current) {
      console.error('[TerrainDevPanel] No game instance!');
      return;
    }

    const scene = gameRef.current.scene.getScene('MainScene');
    if (!scene || !scene.villagerSystem || !scene.cameraControlSystem) {
      console.error('[TerrainDevPanel] Systems not available');
      return;
    }

    const villagers = scene.villagerSystem.villagers;
    if (villagers.length === 0) {
      console.warn('[TerrainDevPanel] No villagers to cycle through');
      return;
    }

    const nextIndex = (currentVillagerIndex + 1) % villagers.length;
    setCurrentVillagerIndex(nextIndex);

    const villager = villagers[nextIndex];
    scene.cameraControlSystem.zoomToVillager(villager);
    console.log(`[TerrainDevPanel] Cycled to villager ${nextIndex + 1}/${villagers.length} (ID: ${villager.id})`);
  };

  /**
   * Cycle to next temple
   */
  const handleCycleTemple = () => {
    if (!gameRef.current) {
      console.error('[TerrainDevPanel] No game instance!');
      return;
    }

    const scene = gameRef.current.scene.getScene('MainScene');
    if (!scene || !scene.templeSystem || !scene.cameraControlSystem) {
      console.error('[TerrainDevPanel] Systems not available');
      return;
    }

    const temples = scene.templeSystem.temples;
    if (temples.length === 0) {
      console.warn('[TerrainDevPanel] No temples to cycle through');
      return;
    }

    const nextIndex = (currentTempleIndex + 1) % temples.length;
    setCurrentTempleIndex(nextIndex);

    const temple = temples[nextIndex];
    const TILE_SIZE = 4;
    const worldX = temple.position.x * TILE_SIZE;
    const worldY = temple.position.y * TILE_SIZE;

    scene.cameraControlSystem.zoomToLocation(worldX, worldY, 2);
    console.log(`[TerrainDevPanel] Cycled to temple ${nextIndex + 1}/${temples.length} (ID: ${temple.id}) at (${worldX}, ${worldY})`);
  };

  /**
   * Add belief points to human player
   */
  const handleAddBelief = (amount) => {
    if (!gameRef.current) return;
    const scene = gameRef.current.scene.getScene('MainScene');
    if (!scene || !scene.playerSystem) return;
    const human = scene.playerSystem.getHumanPlayer();
    if (human) {
      scene.playerSystem.addBeliefPoints(human.id, amount);
    }
  };

  /**
   * Set game speed
   */
  const handleSetGameSpeed = (speed) => {
    if (!gameRef.current) return;
    const scene = gameRef.current.scene.getScene('MainScene');
    if (scene) {
      scene.gameSpeed = speed;
      setGameSpeed(speed);
    }
  };

  /**
   * Skip to next day
   */
  const handleSkipDay = () => {
    if (!gameRef.current) return;
    const scene = gameRef.current.scene.getScene('MainScene');
    if (scene && scene.gameClock) {
      // Advance time by one full day
      scene.gameClock.update(60000);
    }
  };

  /**
   * Spawn villagers at temple for human player
   */
  const handleSpawnAtTemple = (count) => {
    if (!gameRef.current) return;
    const scene = gameRef.current.scene.getScene('MainScene');
    if (!scene || !scene.templeSystem || !scene.playerSystem) return;

    const human = scene.playerSystem.getHumanPlayer();
    if (!human) return;

    const temples = scene.templeSystem.getPlayerTemples(human.id);
    if (temples.length === 0) return;

    for (let i = 0; i < count; i++) {
      scene.templeSystem.spawnVillagerAtTemple(temples[0]);
    }
  };

  /**
   * Start building placement
   */
  const handleStartBuilding = (typeId) => {
    if (!gameRef.current) return;
    const scene = gameRef.current.scene.getScene('MainScene');
    if (!scene || !scene.buildingSystem) return;

    if (scene.buildingSystem.selectedType === typeId) {
      scene.buildingSystem.cancelPlacement();
      setBuildingMode(null);
    } else {
      const success = scene.buildingSystem.startPlacement(typeId);
      setBuildingMode(success ? typeId : null);
    }
  };

  /**
   * Select a divine power for targeting
   */
  const handleSelectPower = (powerId) => {
    if (!gameRef.current) return;
    const scene = gameRef.current.scene.getScene('MainScene');
    if (!scene || !scene.divinePowerSystem) return;

    if (scene.divinePowerSystem.selectedPower === powerId) {
      scene.divinePowerSystem.cancelPower();
      setSelectedPower(null);
    } else {
      const success = scene.divinePowerSystem.selectPower(powerId);
      setSelectedPower(success ? powerId : null);
    }
  };

  /**
   * Get divine power info for display
   */
  const getPowerInfos = () => {
    if (!gameRef.current) return [];
    const scene = gameRef.current.scene.getScene('MainScene');
    if (!scene || !scene.divinePowerSystem) return [];
    return scene.divinePowerSystem.getAllPowerInfo();
  };

  /**
   * Get list of all villagers for dropdown
   */
  const getVillagerList = () => {
    if (!gameRef.current) return [];

    const scene = gameRef.current.scene.getScene('MainScene');
    if (!scene || !scene.villagerSystem) return [];

    return scene.villagerSystem.villagers || [];
  };

  if (!isVisible) {
    // Minimized toggle button
    return (
      <button
        className="dev-panel-toggle"
        onClick={onToggle}
        title="Show Terrain Dev Panel"
      >
        🗺️
      </button>
    );
  }

  return (
    <div className="terrain-dev-panel">
      <div className="dev-panel-header">
        <h3>🗺️ Terrain Dev Panel</h3>
        <button onClick={onToggle} className="close-btn">×</button>
      </div>

      <div className="dev-panel-content">
        {/* Game State Controls */}
        <section className="control-section">
          <h4 onClick={() => setGameExpanded(!gameExpanded)} style={{ cursor: 'pointer' }}>
            Game State {gameExpanded ? '▼' : '▶'}
          </h4>

          {gameExpanded && (
            <div className="controls">
              <div className="stats">
                <div className="stat-item">
                  <span>Time:</span>
                  <span style={{ fontWeight: 'bold' }}>{dayTime || 'Loading...'}</span>
                </div>
                <div className="stat-item">
                  <span>Belief:</span>
                  <span style={{ fontWeight: 'bold', color: '#FFD700' }}>{belief}</span>
                </div>
                <div className="stat-item">
                  <span>Population:</span>
                  <span style={{ fontWeight: 'bold' }}>{population}</span>
                </div>
                <div className="stat-item">
                  <span>Worshipping:</span>
                  <span style={{ fontWeight: 'bold', color: '#4ade80' }}>{worshipping}</span>
                </div>
              </div>

              <div className="villager-buttons" style={{ marginTop: '8px' }}>
                <button onClick={() => handleAddBelief(100)} className="find-path-btn">+100 Belief</button>
                <button onClick={() => handleAddBelief(1000)} className="find-path-btn">+1000 Belief</button>
              </div>

              <div className="villager-buttons" style={{ marginTop: '4px' }}>
                <button onClick={() => handleSpawnAtTemple(10)} className="spawn-villager-btn">+10 Villagers</button>
                <button onClick={() => handleSpawnAtTemple(50)} className="spawn-villager-btn">+50 Villagers</button>
              </div>

              <div style={{ marginTop: '8px' }}>
                <label style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>
                  Game Speed: {gameSpeed}x
                </label>
                <div className="villager-buttons">
                  {[0.5, 1, 2, 5, 10].map(speed => (
                    <button
                      key={speed}
                      onClick={() => handleSetGameSpeed(speed)}
                      className={gameSpeed === speed ? "find-path-btn" : "clear-path-btn"}
                      style={{
                        fontWeight: gameSpeed === speed ? 'bold' : 'normal',
                        minWidth: '40px'
                      }}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </div>

              <div className="villager-buttons" style={{ marginTop: '4px' }}>
                <button onClick={handleSkipDay} className="random-passable-btn">Skip Day</button>
              </div>
            </div>
          )}
        </section>

        {/* Divine Powers */}
        <section className="control-section">
          <h4 onClick={() => setPowersExpanded(!powersExpanded)} style={{ cursor: 'pointer' }}>
            Divine Powers {powersExpanded ? '▼' : '▶'}
          </h4>

          {powersExpanded && (
            <div className="controls">
              {selectedPower && (
                <div style={{
                  padding: '6px 8px',
                  backgroundColor: '#1a3a1a',
                  border: '1px solid #4ade80',
                  borderRadius: '4px',
                  marginBottom: '8px',
                  color: '#4ade80',
                  fontSize: '12px'
                }}>
                  Targeting: Click on map to cast, right-click to cancel
                </div>
              )}
              <div className="villager-buttons">
                {getPowerInfos().map(power => (
                  <button
                    key={power.id}
                    onClick={() => handleSelectPower(power.id)}
                    className={selectedPower === power.id ? "find-path-btn" : "spawn-villager-btn"}
                    style={{
                      opacity: power.isOnCooldown ? 0.4 : 1,
                      fontWeight: selectedPower === power.id ? 'bold' : 'normal',
                    }}
                    disabled={power.isOnCooldown}
                    title={`Cost: ${power.cost} | CD: ${power.cooldown/1000}s | Range: ${power.radius} tiles`}
                  >
                    {power.name} ({power.cost})
                    {power.isOnCooldown && ` [${Math.ceil(power.cooldownRemaining/1000)}s]`}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Buildings */}
        <section className="control-section">
          <h4>Buildings ({buildingCount})</h4>
          <div className="controls">
            {buildingMode && (
              <div style={{
                padding: '6px 8px',
                backgroundColor: '#1a3a1a',
                border: '1px solid #4ade80',
                borderRadius: '4px',
                marginBottom: '8px',
                color: '#4ade80',
                fontSize: '12px'
              }}>
                Click to place, right-click/ESC to cancel
              </div>
            )}
            <div className="villager-buttons">
              {[
                { id: 'farm', label: 'Farm (30)', key: 'F' },
                { id: 'house', label: 'House (20)', key: 'H' },
                { id: 'wall', label: 'Wall (5)', key: 'W' },
              ].map(b => (
                <button
                  key={b.id}
                  onClick={() => handleStartBuilding(b.id)}
                  className={buildingMode === b.id ? "find-path-btn" : "spawn-villager-btn"}
                  style={{ fontWeight: buildingMode === b.id ? 'bold' : 'normal' }}
                  title={`Press ${b.key} or click`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Terrain Controls */}
        <section className="control-section">
          <h4 onClick={() => setExpanded(!expanded)} style={{ cursor: 'pointer' }}>
            ⚙️ Controls {expanded ? '▼' : '▶'}
          </h4>

          {expanded && (
            <div className="controls">
              <button onClick={handleRegenerate} className="regenerate-btn">
                🔄 Regenerate Terrain
              </button>

              <div className="input-group">
                <label htmlFor="seed-input">Seed:</label>
                <input
                  id="seed-input"
                  type="number"
                  placeholder="Enter seed..."
                  onBlur={handleSeedChange}
                  onKeyPress={(e) => e.key === 'Enter' && handleSeedChange(e)}
                />
              </div>
            </div>
          )}
        </section>

        {/* Layer 3: Pathfinding Controls */}
        <section className="control-section">
          <h4 onClick={() => setPathExpanded(!pathExpanded)} style={{ cursor: 'pointer' }}>
            🧭 Pathfinding {pathExpanded ? '▼' : '▶'}
          </h4>

          {pathExpanded && (
            <div className="controls">
              <div className="path-coordinates">
                <div className="coordinate-group">
                  <label>Start:</label>
                  <input
                    type="number"
                    value={startX}
                    onChange={(e) => setStartX(e.target.value)}
                    placeholder="X"
                    style={{ width: '60px' }}
                  />
                  <input
                    type="number"
                    value={startY}
                    onChange={(e) => setStartY(e.target.value)}
                    placeholder="Y"
                    style={{ width: '60px' }}
                  />
                </div>

                <div className="coordinate-group">
                  <label>End:</label>
                  <input
                    type="number"
                    value={endX}
                    onChange={(e) => setEndX(e.target.value)}
                    placeholder="X"
                    style={{ width: '60px' }}
                  />
                  <input
                    type="number"
                    value={endY}
                    onChange={(e) => setEndY(e.target.value)}
                    placeholder="Y"
                    style={{ width: '60px' }}
                  />
                </div>
              </div>

              <div className="path-buttons">
                <button onClick={handleFindRandomPassable} className="random-passable-btn" title="Find two random passable tiles">
                  🎲 Random Passable
                </button>
                <button onClick={handleFindPath} className="find-path-btn">
                  🔍 Find Path
                </button>
                <button onClick={handleClearPath} className="clear-path-btn">
                  🗑️ Clear Path
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Layer 4: Villager Controls */}
        <section className="control-section">
          <h4 onClick={() => setVillagersExpanded(!villagersExpanded)} style={{ cursor: 'pointer' }}>
            👥 Villagers ({villagerCount} / {maxVillagers}) {villagersExpanded ? '▼' : '▶'}
          </h4>

          {villagersExpanded && (
            <div className="controls">
              {villagerCount >= maxVillagers && (
                <div style={{
                  padding: '8px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '4px',
                  marginBottom: '8px',
                  color: '#991b1b',
                  fontSize: '12px'
                }}>
                  ⚠️ Maximum villager limit ({maxVillagers}) reached
                </div>
              )}
              <div className="villager-buttons">
                <button
                  onClick={handleSpawnVillager}
                  className="spawn-villager-btn"
                  disabled={villagerCount >= maxVillagers}
                  style={{ opacity: villagerCount >= maxVillagers ? 0.5 : 1 }}
                >
                  ➕ Spawn Villager
                </button>
                <button
                  onClick={() => handleSpawnMultipleVillagers(100)}
                  className="spawn-villager-btn"
                  disabled={villagerCount >= maxVillagers}
                  style={{ opacity: villagerCount >= maxVillagers ? 0.5 : 1 }}
                >
                  ➕➕ Spawn 100
                </button>
                <button
                  onClick={handleTogglePauseVillagers}
                  className={villagersPaused ? "resume-villagers-btn" : "pause-villagers-btn"}
                >
                  {villagersPaused ? '▶️ Resume All' : '⏸️ Pause All'}
                </button>
                <button onClick={handleClearVillagers} className="clear-villagers-btn">
                  🗑️ Clear All
                </button>
              </div>

              {/* Navigation Buttons */}
              {villagerCount > 0 && (
                <div className="villager-buttons" style={{ marginTop: '8px' }}>
                  <button onClick={handleCycleVillager} className="find-path-btn">
                    ⏭️ Cycle Villager
                  </button>
                  <button onClick={handleCycleTemple} className="find-path-btn">
                    🏛️ Cycle Temple
                  </button>
                </div>
              )}

              {/* Layer 5: Villager Selector Dropdown */}
              {villagerCount > 0 && (
                <div className="villager-selector">
                  <label htmlFor="villager-select">🔍 Zoom to Villager:</label>
                  <select
                    id="villager-select"
                    value={selectedVillagerId}
                    onChange={handleZoomToVillager}
                    className="villager-dropdown"
                  >
                    <option value="">-- Select a villager --</option>
                    {getVillagerList().map((villager) => (
                      <option key={villager.id} value={villager.id}>
                        Villager #{villager.id} at ({Math.floor(villager.x)}, {Math.floor(villager.y)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="villager-info">
                <p>
                  Villagers automatically pick random destinations, walk there,
                  pause briefly, then return to origin. Click Spawn to add more!
                </p>
                <p>
                  🎮 Camera: Drag to pan, mouse wheel to zoom, double-click to zoom in
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Biome Legend */}
        <section className="biome-legend">
          <h4>🎨 Biome Legend</h4>
          <div className="biome-list">
            {Object.entries(BIOME_TYPES).map(([key, biome]) => (
              <div key={key} className="biome-item">
                <div
                  className="biome-swatch"
                  style={{ backgroundColor: `#${biome.color.toString(16).padStart(6, '0')}` }}
                />
                <div className="biome-info">
                  <span className="biome-name">{biome.name}</span>
                  <span className="biome-props">
                    Height: {biome.height} |
                    {biome.passable ? ` Cost: ${biome.movementCost}x` : ' Impassable'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Stats */}
        <section className="stats-section">
          <h4>📊 Stats</h4>
          <div className="stats">
            <div className="stat-item">
              <span>FPS:</span>
              <span style={{
                color: fps >= 55 ? '#4ade80' : fps >= 30 ? '#facc15' : '#ef4444',
                fontWeight: 'bold'
              }}>
                {fps}
              </span>
            </div>
            <div className="stat-item">
              <span>Map Size:</span>
              <span>
                {gameRef.current && gameRef.current.scene.getScene('MainScene')?.mapWidth || 0} ×
                {gameRef.current && gameRef.current.scene.getScene('MainScene')?.mapHeight || 0} tiles
              </span>
            </div>
            <div className="stat-item">
              <span>Tile Size:</span>
              <span>4×4 px</span>
            </div>
            <div className="stat-item">
              <span>World Size:</span>
              <span>4000×4000 px</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
