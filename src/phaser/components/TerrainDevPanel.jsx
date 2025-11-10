/**
 * Layer 3: Terrain Development Panel with Pathfinding
 *
 * Debug UI for testing terrain generation parameters, visualizing biomes, and pathfinding.
 * Overlays on top of the Phaser game canvas.
 */

import { useState } from 'react';
import { BIOME_TYPES } from '../config/terrainConfig';
import './TerrainDevPanel.css';

export default function TerrainDevPanel({ gameRef, isVisible, onToggle }) {
  const [expanded, setExpanded] = useState(false);
  const [pathExpanded, setPathExpanded] = useState(true);
  // Default to center of map where land is more likely (map is 250x250)
  const [startX, setStartX] = useState('100');
  const [startY, setStartY] = useState('100');
  const [endX, setEndX] = useState('150');
  const [endY, setEndY] = useState('150');

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
