/**
 * Layer 5: Terrain Development Panel with Pathfinding, Villagers, and Camera Controls
 *
 * Debug UI for testing terrain generation, pathfinding, villager spawning, and camera controls.
 * Overlays on top of the Phaser game canvas.
 */

import { useState } from 'react';
import { BIOME_TYPES } from '../config/terrainConfig';
import './TerrainDevPanel.css';

export default function TerrainDevPanel({ gameRef, isVisible, onToggle }) {
  const [expanded, setExpanded] = useState(false);
  const [pathExpanded, setPathExpanded] = useState(true);
  const [villagersExpanded, setVillagersExpanded] = useState(true);

  // Default to center of map where land is more likely (map is 250x250)
  const [startX, setStartX] = useState('100');
  const [startY, setStartY] = useState('100');
  const [endX, setEndX] = useState('150');
  const [endY, setEndY] = useState('150');

  // Villager state
  const [villagerCount, setVillagerCount] = useState(0);
  const [villagersPaused, setVillagersPaused] = useState(false);
  const [selectedVillagerId, setSelectedVillagerId] = useState('');

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
            👥 Villagers ({villagerCount}) {villagersExpanded ? '▼' : '▶'}
          </h4>

          {villagersExpanded && (
            <div className="controls">
              <div className="villager-buttons">
                <button onClick={handleSpawnVillager} className="spawn-villager-btn">
                  ➕ Spawn Villager
                </button>
                <button onClick={() => handleSpawnMultipleVillagers(100)} className="spawn-villager-btn">
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
              <span>Map Size:</span>
              <span>
                {gameRef.current && gameRef.current.scene.getScene('MainScene')?.mapWidth || 0} ×
                {gameRef.current && gameRef.current.scene.getScene('MainScene')?.mapHeight || 0} tiles
              </span>
            </div>
            <div className="stat-item">
              <span>Tile Size:</span>
              <span>16×16 px</span>
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
