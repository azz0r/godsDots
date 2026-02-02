/**
 * Development Panel
 *
 * Debug UI for testing game systems: terrain, pathfinding, villagers,
 * divine powers, buildings, and camera controls.
 */

import { useState, useEffect, useCallback } from 'react';
import { BIOME_TYPES, TERRAIN_CONFIG } from '../config/terrainConfig';
import {
  GAME_SPEEDS, BELIEF_AMOUNTS, SPAWN_AMOUNTS, PASSABLE_SEARCH_RADIUS,
  POLL_INTERVAL_MS, FPS_THRESHOLDS, FPS_COLORS,
  BUILDING_BUTTONS, TARGETING_STYLE, WARNING_STYLE,
} from '../config/devPanelConfig';
import './TerrainDevPanel.css';

/**
 * Get the MainScene from the game ref, or null.
 */
function getScene(gameRef) {
  if (!gameRef.current) return null;
  return gameRef.current.scene.getScene('MainScene') || null;
}

/**
 * Find passable tiles near center of the map.
 */
function findPassableTilesNearCenter(scene) {
  if (!scene || !scene.biomeMap) return [];

  const centerX = Math.floor(scene.mapWidth / 2);
  const centerY = Math.floor(scene.mapHeight / 2);
  const tiles = [];

  for (let y = centerY - PASSABLE_SEARCH_RADIUS; y < centerY + PASSABLE_SEARCH_RADIUS; y++) {
    for (let x = centerX - PASSABLE_SEARCH_RADIUS; x < centerX + PASSABLE_SEARCH_RADIUS; x++) {
      if (x >= 0 && x < scene.mapWidth && y >= 0 && y < scene.mapHeight) {
        const biome = scene.getBiomeAt(x, y);
        if (biome && biome.passable) {
          tiles.push({ x, y, biome: biome.name });
        }
      }
    }
  }

  return tiles;
}

function getFpsColor(fps) {
  if (fps >= FPS_THRESHOLDS.GOOD) return FPS_COLORS.GOOD;
  if (fps >= FPS_THRESHOLDS.WARN) return FPS_COLORS.WARN;
  return FPS_COLORS.BAD;
}

export default function TerrainDevPanel({ gameRef, isVisible, onToggle }) {
  // Section toggles
  const [expanded, setExpanded] = useState(false);
  const [pathExpanded, setPathExpanded] = useState(true);
  const [villagersExpanded, setVillagersExpanded] = useState(true);
  const [gameExpanded, setGameExpanded] = useState(true);
  const [powersExpanded, setPowersExpanded] = useState(true);

  // Stats
  const [fps, setFps] = useState(0);

  // Pathfinding
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
  const [selectedPower, setSelectedPower] = useState(null);
  const [buildingMode, setBuildingMode] = useState(null);
  const [buildingCount, setBuildingCount] = useState(0);

  // Polling: sync game state from Phaser
  useEffect(() => {
    if (!gameRef.current) return;

    const interval = setInterval(() => {
      if (gameRef.current && gameRef.current.loop) {
        setFps(Math.round(gameRef.current.loop.actualFps || 0));
      }
      const scene = getScene(gameRef);
      if (!scene) return;

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
      if (scene.gameClock) setDayTime(scene.gameClock.getTimeString());
      if (scene.divinePowerSystem) setSelectedPower(scene.divinePowerSystem.selectedPower);
      if (scene.buildingSystem) {
        setBuildingMode(scene.buildingSystem.selectedType);
        setBuildingCount(scene.buildingSystem.getCount());
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [gameRef]);

  // Get max villagers on mount
  useEffect(() => {
    const scene = getScene(gameRef);
    if (scene && scene.villagerSystem) {
      setMaxVillagers(scene.villagerSystem.getMaxVillagers());
    }
  }, [gameRef]);

  // --- Handlers ---

  const handleRegenerate = useCallback(() => {
    const scene = getScene(gameRef);
    if (scene && scene.regenerateTerrain) scene.regenerateTerrain();
  }, [gameRef]);

  const handleSeedChange = useCallback((e) => {
    const seed = parseInt(e.target.value, 10);
    if (isNaN(seed)) return;
    const scene = getScene(gameRef);
    if (scene && scene.generateTerrain) scene.generateTerrain(seed);
  }, [gameRef]);

  const handleSeedKeyPress = useCallback((e) => {
    if (e.key === 'Enter') handleSeedChange(e);
  }, [handleSeedChange]);

  const handleFindPath = useCallback(() => {
    const sx = parseInt(startX, 10);
    const sy = parseInt(startY, 10);
    const ex = parseInt(endX, 10);
    const ey = parseInt(endY, 10);
    if (isNaN(sx) || isNaN(sy) || isNaN(ex) || isNaN(ey)) return;
    const scene = getScene(gameRef);
    if (scene && scene.findPath) scene.findPath(sx, sy, ex, ey);
  }, [gameRef, startX, startY, endX, endY]);

  const handleClearPath = useCallback(() => {
    const scene = getScene(gameRef);
    if (scene && scene.clearPath) scene.clearPath();
  }, [gameRef]);

  const handleFindRandomPassable = useCallback(() => {
    const scene = getScene(gameRef);
    const tiles = findPassableTilesNearCenter(scene);
    if (tiles.length < 2) return;

    const startIdx = Math.floor(Math.random() * tiles.length);
    let endIdx = Math.floor(Math.random() * tiles.length);
    while (endIdx === startIdx && tiles.length > 1) {
      endIdx = Math.floor(Math.random() * tiles.length);
    }
    setStartX(tiles[startIdx].x.toString());
    setStartY(tiles[startIdx].y.toString());
    setEndX(tiles[endIdx].x.toString());
    setEndY(tiles[endIdx].y.toString());
  }, [gameRef]);

  const handleSpawnVillager = useCallback(() => {
    const scene = getScene(gameRef);
    if (!scene || !scene.villagerSystem) return;
    const tiles = findPassableTilesNearCenter(scene);
    if (tiles.length === 0) return;
    const pos = tiles[Math.floor(Math.random() * tiles.length)];
    scene.villagerSystem.spawnVillager(pos.x, pos.y);
    setVillagerCount(scene.villagerSystem.getCount());
  }, [gameRef]);

  const handleSpawnMultiple = useCallback(() => {
    const scene = getScene(gameRef);
    if (!scene || !scene.villagerSystem) return;
    const tiles = findPassableTilesNearCenter(scene);
    if (tiles.length === 0) return;
    for (let i = 0; i < 100; i++) {
      const pos = tiles[Math.floor(Math.random() * tiles.length)];
      scene.villagerSystem.spawnVillager(pos.x, pos.y);
    }
    setVillagerCount(scene.villagerSystem.getCount());
  }, [gameRef]);

  const handleTogglePauseVillagers = useCallback(() => {
    const scene = getScene(gameRef);
    if (!scene || !scene.villagerSystem) return;
    if (villagersPaused) {
      scene.villagerSystem.resumeAll();
      setVillagersPaused(false);
    } else {
      scene.villagerSystem.pauseAll();
      setVillagersPaused(true);
    }
  }, [gameRef, villagersPaused]);

  const handleClearVillagers = useCallback(() => {
    const scene = getScene(gameRef);
    if (!scene || !scene.villagerSystem) return;
    scene.villagerSystem.clearAll();
    setVillagerCount(0);
    setVillagersPaused(false);
    setSelectedVillagerId('');
  }, [gameRef]);

  const handleZoomToVillager = useCallback((e) => {
    const id = parseInt(e.target.value, 10);
    if (!id || isNaN(id)) { setSelectedVillagerId(''); return; }
    setSelectedVillagerId(id.toString());
    const scene = getScene(gameRef);
    if (!scene || !scene.villagerSystem || !scene.cameraControlSystem) return;
    const villager = scene.villagerSystem.getVillager(id);
    if (villager) scene.cameraControlSystem.zoomToVillager(villager);
  }, [gameRef]);

  const handleCycleVillager = useCallback(() => {
    const scene = getScene(gameRef);
    if (!scene || !scene.villagerSystem || !scene.cameraControlSystem) return;
    const villagers = scene.villagerSystem.villagers;
    if (villagers.length === 0) return;
    const next = (currentVillagerIndex + 1) % villagers.length;
    setCurrentVillagerIndex(next);
    scene.cameraControlSystem.zoomToVillager(villagers[next]);
  }, [gameRef, currentVillagerIndex]);

  const handleCycleTemple = useCallback(() => {
    const scene = getScene(gameRef);
    if (!scene || !scene.templeSystem || !scene.cameraControlSystem) return;
    const temples = scene.templeSystem.temples;
    if (temples.length === 0) return;
    const next = (currentTempleIndex + 1) % temples.length;
    setCurrentTempleIndex(next);
    const t = temples[next];
    const worldX = t.position.x * TERRAIN_CONFIG.TILE_SIZE;
    const worldY = t.position.y * TERRAIN_CONFIG.TILE_SIZE;
    scene.cameraControlSystem.zoomToLocation(worldX, worldY, 2);
  }, [gameRef, currentTempleIndex]);

  const handleAddBelief = useCallback((amount) => {
    const scene = getScene(gameRef);
    if (!scene || !scene.playerSystem) return;
    const human = scene.playerSystem.getHumanPlayer();
    if (human) scene.playerSystem.addBeliefPoints(human.id, amount);
  }, [gameRef]);

  const handleSetGameSpeed = useCallback((speed) => {
    const scene = getScene(gameRef);
    if (scene) { scene.gameSpeed = speed; setGameSpeed(speed); }
  }, [gameRef]);

  const handleSkipDay = useCallback(() => {
    const scene = getScene(gameRef);
    if (scene && scene.gameClock) scene.gameClock.update(60000);
  }, [gameRef]);

  const handleSpawnAtTemple = useCallback((count) => {
    const scene = getScene(gameRef);
    if (!scene || !scene.templeSystem || !scene.playerSystem) return;
    const human = scene.playerSystem.getHumanPlayer();
    if (!human) return;
    const temples = scene.templeSystem.getPlayerTemples(human.id);
    if (temples.length === 0) return;
    for (let i = 0; i < count; i++) scene.templeSystem.spawnVillagerAtTemple(temples[0]);
  }, [gameRef]);

  const handleSelectPower = useCallback((powerId) => {
    const scene = getScene(gameRef);
    if (!scene || !scene.divinePowerSystem) return;
    if (scene.divinePowerSystem.selectedPower === powerId) {
      scene.divinePowerSystem.cancelPower();
      setSelectedPower(null);
    } else {
      const ok = scene.divinePowerSystem.selectPower(powerId);
      setSelectedPower(ok ? powerId : null);
    }
  }, [gameRef]);

  const handleStartBuilding = useCallback((typeId) => {
    const scene = getScene(gameRef);
    if (!scene || !scene.buildingSystem) return;
    if (scene.buildingSystem.selectedType === typeId) {
      scene.buildingSystem.cancelPlacement();
      setBuildingMode(null);
    } else {
      const ok = scene.buildingSystem.startPlacement(typeId);
      setBuildingMode(ok ? typeId : null);
    }
  }, [gameRef]);

  // Section toggle handlers
  const toggleGame = useCallback(() => setGameExpanded(v => !v), []);
  const togglePowers = useCallback(() => setPowersExpanded(v => !v), []);
  const toggleControls = useCallback(() => setExpanded(v => !v), []);
  const togglePath = useCallback(() => setPathExpanded(v => !v), []);
  const toggleVillagers = useCallback(() => setVillagersExpanded(v => !v), []);

  // Input handlers
  const handleStartXChange = useCallback((e) => setStartX(e.target.value), []);
  const handleStartYChange = useCallback((e) => setStartY(e.target.value), []);
  const handleEndXChange = useCallback((e) => setEndX(e.target.value), []);
  const handleEndYChange = useCallback((e) => setEndY(e.target.value), []);

  // Derived values
  const getPowerInfos = useCallback(() => {
    const scene = getScene(gameRef);
    if (!scene || !scene.divinePowerSystem) return [];
    return scene.divinePowerSystem.getAllPowerInfo();
  }, [gameRef]);

  const getVillagerList = useCallback(() => {
    const scene = getScene(gameRef);
    if (!scene || !scene.villagerSystem) return [];
    return scene.villagerSystem.villagers || [];
  }, [gameRef]);

  const atMaxVillagers = villagerCount >= maxVillagers;

  if (!isVisible) {
    return (
      <button className="dev-panel-toggle" onClick={onToggle} title="Show Dev Panel">
        DEV
      </button>
    );
  }

  return (
    <div className="terrain-dev-panel">
      <div className="dev-panel-header">
        <h3>Dev Panel</h3>
        <button onClick={onToggle} className="close-btn">x</button>
      </div>

      <div className="dev-panel-content">
        {/* Game State */}
        <section className="control-section">
          <h4 onClick={toggleGame} style={{ cursor: 'pointer' }}>
            Game State {gameExpanded ? '▼' : '▶'}
          </h4>
          {gameExpanded && (
            <div className="controls">
              <div className="stats">
                <div className="stat-item"><span>Time:</span><span style={{ fontWeight: 'bold' }}>{dayTime || 'Loading...'}</span></div>
                <div className="stat-item"><span>Belief:</span><span style={{ fontWeight: 'bold', color: '#FFD700' }}>{belief}</span></div>
                <div className="stat-item"><span>Population:</span><span style={{ fontWeight: 'bold' }}>{population}</span></div>
                <div className="stat-item"><span>Worshipping:</span><span style={{ fontWeight: 'bold', color: '#4ade80' }}>{worshipping}</span></div>
              </div>
              <div className="villager-buttons" style={{ marginTop: '8px' }}>
                {BELIEF_AMOUNTS.map(amt => (
                  <button key={amt} onClick={() => handleAddBelief(amt)} className="find-path-btn">+{amt} Belief</button>
                ))}
              </div>
              <div className="villager-buttons" style={{ marginTop: '4px' }}>
                {SPAWN_AMOUNTS.map(amt => (
                  <button key={amt} onClick={() => handleSpawnAtTemple(amt)} className="spawn-villager-btn">+{amt} Villagers</button>
                ))}
              </div>
              <div style={{ marginTop: '8px' }}>
                <label style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>Game Speed: {gameSpeed}x</label>
                <div className="villager-buttons">
                  {GAME_SPEEDS.map(speed => (
                    <button
                      key={speed}
                      onClick={() => handleSetGameSpeed(speed)}
                      className={gameSpeed === speed ? 'find-path-btn' : 'clear-path-btn'}
                      style={{ fontWeight: gameSpeed === speed ? 'bold' : 'normal', minWidth: '40px' }}
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
          <h4 onClick={togglePowers} style={{ cursor: 'pointer' }}>Divine Powers {powersExpanded ? '▼' : '▶'}</h4>
          {powersExpanded && (
            <div className="controls">
              {selectedPower && <div style={TARGETING_STYLE}>Targeting: Click on map to cast, right-click to cancel</div>}
              <div className="villager-buttons">
                {getPowerInfos().map(power => (
                  <button
                    key={power.id}
                    onClick={() => handleSelectPower(power.id)}
                    className={selectedPower === power.id ? 'find-path-btn' : 'spawn-villager-btn'}
                    style={{ opacity: power.isOnCooldown ? 0.4 : 1, fontWeight: selectedPower === power.id ? 'bold' : 'normal' }}
                    disabled={power.isOnCooldown}
                    title={`Cost: ${power.cost} | CD: ${power.cooldown / 1000}s | Range: ${power.radius} tiles`}
                  >
                    {power.name} ({power.cost})
                    {power.isOnCooldown && ` [${Math.ceil(power.cooldownRemaining / 1000)}s]`}
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
            {buildingMode && <div style={TARGETING_STYLE}>Click to place, right-click/ESC to cancel</div>}
            <div className="villager-buttons">
              {BUILDING_BUTTONS.map(b => (
                <button
                  key={b.id}
                  onClick={() => handleStartBuilding(b.id)}
                  className={buildingMode === b.id ? 'find-path-btn' : 'spawn-villager-btn'}
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
          <h4 onClick={toggleControls} style={{ cursor: 'pointer' }}>Controls {expanded ? '▼' : '▶'}</h4>
          {expanded && (
            <div className="controls">
              <button onClick={handleRegenerate} className="regenerate-btn">Regenerate Terrain</button>
              <div className="input-group">
                <label htmlFor="seed-input">Seed:</label>
                <input id="seed-input" type="number" placeholder="Enter seed..." onBlur={handleSeedChange} onKeyPress={handleSeedKeyPress} />
              </div>
            </div>
          )}
        </section>

        {/* Pathfinding */}
        <section className="control-section">
          <h4 onClick={togglePath} style={{ cursor: 'pointer' }}>Pathfinding {pathExpanded ? '▼' : '▶'}</h4>
          {pathExpanded && (
            <div className="controls">
              <div className="path-coordinates">
                <div className="coordinate-group">
                  <label>Start:</label>
                  <input type="number" value={startX} onChange={handleStartXChange} placeholder="X" style={{ width: '60px' }} />
                  <input type="number" value={startY} onChange={handleStartYChange} placeholder="Y" style={{ width: '60px' }} />
                </div>
                <div className="coordinate-group">
                  <label>End:</label>
                  <input type="number" value={endX} onChange={handleEndXChange} placeholder="X" style={{ width: '60px' }} />
                  <input type="number" value={endY} onChange={handleEndYChange} placeholder="Y" style={{ width: '60px' }} />
                </div>
              </div>
              <div className="path-buttons">
                <button onClick={handleFindRandomPassable} className="random-passable-btn" title="Find two random passable tiles">Random Passable</button>
                <button onClick={handleFindPath} className="find-path-btn">Find Path</button>
                <button onClick={handleClearPath} className="clear-path-btn">Clear Path</button>
              </div>
            </div>
          )}
        </section>

        {/* Villagers */}
        <section className="control-section">
          <h4 onClick={toggleVillagers} style={{ cursor: 'pointer' }}>
            Villagers ({villagerCount} / {maxVillagers}) {villagersExpanded ? '▼' : '▶'}
          </h4>
          {villagersExpanded && (
            <div className="controls">
              {atMaxVillagers && <div style={WARNING_STYLE}>Maximum villager limit ({maxVillagers}) reached</div>}
              <div className="villager-buttons">
                <button onClick={handleSpawnVillager} className="spawn-villager-btn" disabled={atMaxVillagers} style={{ opacity: atMaxVillagers ? 0.5 : 1 }}>
                  Spawn Villager
                </button>
                <button onClick={handleSpawnMultiple} className="spawn-villager-btn" disabled={atMaxVillagers} style={{ opacity: atMaxVillagers ? 0.5 : 1 }}>
                  Spawn 100
                </button>
                <button onClick={handleTogglePauseVillagers} className={villagersPaused ? 'resume-villagers-btn' : 'pause-villagers-btn'}>
                  {villagersPaused ? 'Resume All' : 'Pause All'}
                </button>
                <button onClick={handleClearVillagers} className="clear-villagers-btn">Clear All</button>
              </div>
              {villagerCount > 0 && (
                <div className="villager-buttons" style={{ marginTop: '8px' }}>
                  <button onClick={handleCycleVillager} className="find-path-btn">Cycle Villager</button>
                  <button onClick={handleCycleTemple} className="find-path-btn">Cycle Temple</button>
                </div>
              )}
              {villagerCount > 0 && (
                <div className="villager-selector">
                  <label htmlFor="villager-select">Zoom to Villager:</label>
                  <select id="villager-select" value={selectedVillagerId} onChange={handleZoomToVillager} className="villager-dropdown">
                    <option value="">-- Select --</option>
                    {getVillagerList().map(v => (
                      <option key={v.id} value={v.id}>#{v.id} at ({Math.floor(v.x)}, {Math.floor(v.y)})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Biome Legend */}
        <section className="biome-legend">
          <h4>Biome Legend</h4>
          <div className="biome-list">
            {Object.entries(BIOME_TYPES).map(([key, biome]) => (
              <div key={key} className="biome-item">
                <div className="biome-swatch" style={{ backgroundColor: `#${biome.color.toString(16).padStart(6, '0')}` }} />
                <div className="biome-info">
                  <span className="biome-name">{biome.name}</span>
                  <span className="biome-props">
                    Height: {biome.height} | {biome.passable ? `Cost: ${biome.movementCost}x` : 'Impassable'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Stats */}
        <section className="stats-section">
          <h4>Stats</h4>
          <div className="stats">
            <div className="stat-item">
              <span>FPS:</span>
              <span style={{ color: getFpsColor(fps), fontWeight: 'bold' }}>{fps}</span>
            </div>
            <div className="stat-item"><span>Tile Size:</span><span>{TERRAIN_CONFIG.TILE_SIZE}x{TERRAIN_CONFIG.TILE_SIZE} px</span></div>
          </div>
        </section>
      </div>
    </div>
  );
}
