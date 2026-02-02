/**
 * Fog of War System
 *
 * Renders fog overlay based on player temple influence:
 * - Active influence: fully visible (no fog)
 * - Explored but unowned: terrain visible, enemies hidden (light fog)
 * - Unexplored: fully hidden (dark fog)
 *
 * Uses a low-resolution RenderTexture scaled up for performance.
 */

import { TERRAIN_CONFIG } from '../config/terrainConfig';

const FOG_RESOLUTION = 4; // Render at 1/4 tile resolution
const FOG_UPDATE_INTERVAL = 1000; // Re-render fog every 1 second
const FOG_ALPHA_UNEXPLORED = 0.85;
const FOG_ALPHA_EXPLORED = 0.45;
const INFLUENCE_RADIUS = 60; // Must match TempleSystem

export default class FogOfWarSystem {
  constructor(scene) {
    this.scene = scene;
    this.enabled = true;

    // Map dimensions in tiles
    this.mapWidth = scene.mapWidth;
    this.mapHeight = scene.mapHeight;

    // Fog texture dimensions (downsampled)
    this.fogWidth = Math.ceil(this.mapWidth / FOG_RESOLUTION);
    this.fogHeight = Math.ceil(this.mapHeight / FOG_RESOLUTION);

    // Track explored tiles (persists across influence changes)
    this.explored = new Set();

    // Current visibility set (recomputed each update)
    this.visible = new Set();

    // Fog render texture
    this.fogRT = null;
    this.updateTimer = 0;

    // References
    this.templeSystem = null;
    this.playerSystem = null;

    this.createFogTexture();
  }

  /**
   * Create the fog RenderTexture overlay
   */
  createFogTexture() {
    if (!this.scene.add?.renderTexture) return;

    const TILE_SIZE = TERRAIN_CONFIG.TILE_SIZE;
    const worldWidth = this.mapWidth * TILE_SIZE;
    const worldHeight = this.mapHeight * TILE_SIZE;

    // Create fog at reduced resolution, then scale to world size
    this.fogRT = this.scene.add.renderTexture(0, 0, this.fogWidth, this.fogHeight);
    this.fogRT.setOrigin(0, 0);
    this.fogRT.setScale(TILE_SIZE * FOG_RESOLUTION); // Scale up to world coords
    this.fogRT.setDepth(500); // Above terrain/buildings, below HUD
    this.fogRT.setAlpha(1);

    // Initial full fog
    this.renderFog();
  }

  /**
   * Compute which fog cells are currently visible (within player influence)
   */
  computeVisibility() {
    this.visible.clear();

    if (!this.templeSystem || !this.playerSystem) return;

    const humanPlayer = this.playerSystem.getHumanPlayer();
    if (!humanPlayer) return;

    const playerTemples = this.templeSystem.getPlayerTemples(humanPlayer.id);

    for (const temple of playerTemples) {
      const cx = temple.position.x;
      const cy = temple.position.y;
      const radius = INFLUENCE_RADIUS * (temple.level || 1);

      // Convert to fog-cell coordinates
      const fogCX = Math.floor(cx / FOG_RESOLUTION);
      const fogCY = Math.floor(cy / FOG_RESOLUTION);
      const fogRadius = Math.ceil(radius / FOG_RESOLUTION);

      // Fill circle in fog grid
      const rSq = fogRadius * fogRadius;
      for (let dy = -fogRadius; dy <= fogRadius; dy++) {
        for (let dx = -fogRadius; dx <= fogRadius; dx++) {
          if (dx * dx + dy * dy > rSq) continue;

          const fx = fogCX + dx;
          const fy = fogCY + dy;
          if (fx < 0 || fx >= this.fogWidth || fy < 0 || fy >= this.fogHeight) continue;

          const key = `${fx},${fy}`;
          this.visible.add(key);
          this.explored.add(key);
        }
      }
    }
  }

  /**
   * Render fog to the RenderTexture
   */
  renderFog() {
    if (!this.fogRT) return;

    this.computeVisibility();

    const g = this.scene.make.graphics({ add: false });

    // Fill entire fog with unexplored darkness
    g.fillStyle(0x000000, FOG_ALPHA_UNEXPLORED);
    g.fillRect(0, 0, this.fogWidth, this.fogHeight);

    // Draw explored-but-not-visible cells as lighter fog
    for (const key of this.explored) {
      if (this.visible.has(key)) continue;
      const [fx, fy] = key.split(',').map(Number);
      // Overwrite with lighter fog
      g.fillStyle(0x000000, FOG_ALPHA_EXPLORED);
      g.fillRect(fx, fy, 1, 1);
    }

    // Clear visible cells (fully transparent)
    // RenderTexture erase method removes pixels
    this.fogRT.clear();
    this.fogRT.draw(g);

    // Erase visible areas to make them transparent
    const eraseG = this.scene.make.graphics({ add: false });
    eraseG.fillStyle(0xFFFFFF, 1);
    for (const key of this.visible) {
      const [fx, fy] = key.split(',').map(Number);
      eraseG.fillRect(fx, fy, 1, 1);
    }
    this.fogRT.erase(eraseG);

    g.destroy();
    eraseG.destroy();
  }

  /**
   * Check if a tile position is currently visible to the human player
   */
  isTileVisible(tileX, tileY) {
    if (!this.enabled) return true;
    const fx = Math.floor(tileX / FOG_RESOLUTION);
    const fy = Math.floor(tileY / FOG_RESOLUTION);
    return this.visible.has(`${fx},${fy}`);
  }

  /**
   * Check if a tile has been explored (even if not currently visible)
   */
  isTileExplored(tileX, tileY) {
    if (!this.enabled) return true;
    const fx = Math.floor(tileX / FOG_RESOLUTION);
    const fy = Math.floor(tileY / FOG_RESOLUTION);
    return this.explored.has(`${fx},${fy}`);
  }

  /**
   * Hide/show enemy entities based on fog
   */
  updateEntityVisibility() {
    if (!this.enabled) return;

    const humanPlayer = this.playerSystem?.getHumanPlayer();
    if (!humanPlayer) return;

    // Hide enemy villagers in fog
    if (this.scene.villagerSystem) {
      for (const villager of this.scene.villagerSystem.villagers) {
        if (villager.playerId === humanPlayer.id) continue; // Always show own villagers
        if (!villager._circle) continue;

        const isVisible = this.isTileVisible(Math.floor(villager.x), Math.floor(villager.y));
        villager._circle.setVisible(isVisible && villager._circle.visible !== false);
      }
    }

    // Hide enemy buildings in fog
    if (this.scene.buildingSystem) {
      for (const building of this.scene.buildingSystem.buildings) {
        if (building.playerId === humanPlayer.id) continue;

        const isVisible = this.isTileVisible(building.tileX, building.tileY);
        for (const obj of building._gameObjects) {
          obj.setVisible(isVisible);
        }
      }
    }

    // Hide enemy temples in fog (show explored ones dimly)
    if (this.templeSystem) {
      for (const temple of this.templeSystem.temples) {
        if (temple.playerId === humanPlayer.id) continue;
        if (!temple._gameObjects) continue;

        const isVisible = this.isTileVisible(temple.position.x, temple.position.y);
        const isExplored = this.isTileExplored(temple.position.x, temple.position.y);

        for (const obj of temple._gameObjects) {
          obj.setVisible(isVisible || isExplored);
          if (isExplored && !isVisible) {
            obj.setAlpha(0.3); // Dim in explored fog
          } else if (isVisible) {
            obj.setAlpha(1);
          }
        }
      }
    }
  }

  /**
   * Update fog system
   */
  update(delta) {
    if (!this.enabled || !this.fogRT) return;

    this.updateTimer -= delta;
    if (this.updateTimer <= 0) {
      this.updateTimer = FOG_UPDATE_INTERVAL;
      this.renderFog();
    }

    // Entity visibility updates more frequently
    this.updateEntityVisibility();
  }

  /**
   * Toggle fog of war on/off
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    if (this.fogRT) {
      this.fogRT.setVisible(enabled);
    }

    // Show all entities when fog disabled
    if (!enabled) {
      this.showAllEntities();
    }
  }

  /**
   * Show all entities (when fog disabled)
   */
  showAllEntities() {
    if (this.scene.villagerSystem) {
      for (const v of this.scene.villagerSystem.villagers) {
        if (v._circle) v._circle.setVisible(true);
      }
    }
    if (this.scene.buildingSystem) {
      for (const b of this.scene.buildingSystem.buildings) {
        for (const obj of b._gameObjects) obj.setVisible(true);
      }
    }
    if (this.templeSystem) {
      for (const t of this.templeSystem.temples) {
        if (t._gameObjects) {
          for (const obj of t._gameObjects) {
            obj.setVisible(true);
            obj.setAlpha(1);
          }
        }
      }
    }
  }

  destroy() {
    if (this.fogRT) {
      this.fogRT.destroy();
      this.fogRT = null;
    }
    this.explored.clear();
    this.visible.clear();
  }
}
