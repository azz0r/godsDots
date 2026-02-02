/**
 * Layer 6: Temple Management and Rendering System
 *
 * Handles temple rendering, management, villager spawning, and influence auras.
 */

import { TERRAIN_CONFIG } from '../config/terrainConfig';

const TEMPLE_SIZE = 80;
const SPAWN_INTERVAL = 30000; // 30 seconds between spawns
const MAX_VILLAGERS_PER_TEMPLE = 20;
const INFLUENCE_RADIUS = 60; // Tiles - visual influence range

export default class TempleSystem {
  constructor(scene) {
    this.scene = scene;
    this.temples = [];

    // References set by MainScene
    this.villagerSystem = null;
    this.playerSystem = null;
  }

  addTemple(temple) {
    // Initialize spawn timer
    temple.spawnTimer = SPAWN_INTERVAL / 2; // First spawn in half the time
    temple.spawnedCount = 0;

    this.temples.push(temple);

    if (this.scene && this.scene.add) {
      const TILE_SIZE = TERRAIN_CONFIG.TILE_SIZE;
      const pixelX = temple.position.x * TILE_SIZE + TILE_SIZE / 2;
      const pixelY = temple.position.y * TILE_SIZE + TILE_SIZE / 2;
      const color = temple.playerColor || 0xFFD700;

      // Influence aura circle (behind temple)
      const auraRadius = INFLUENCE_RADIUS * TILE_SIZE;
      const aura = this.scene.add.circle(pixelX, pixelY, auraRadius, color, 0.08);
      aura.setDepth(5);
      aura.setStrokeStyle(1, color, 0.2);

      // Main temple body
      const rect = this.scene.add.rectangle(pixelX, pixelY, TEMPLE_SIZE, TEMPLE_SIZE, color);
      rect.setDepth(50);
      rect.setStrokeStyle(2, 0xFFFFFF);

      // Cross marker (horizontal)
      const crossH = this.scene.add.rectangle(pixelX, pixelY, TEMPLE_SIZE / 2, 3, 0xFFFFFF);
      crossH.setDepth(51);

      // Cross marker (vertical)
      const crossV = this.scene.add.rectangle(pixelX, pixelY, 3, TEMPLE_SIZE / 2, 0xFFFFFF);
      crossV.setDepth(51);

      temple._gameObjects = [aura, rect, crossH, crossV];
    }

    console.log(`[TempleSystem] Added temple ${temple.id} at (${temple.position.x}, ${temple.position.y})`);
  }

  removeTemple(templeId) {
    const index = this.temples.findIndex(t => t.id === templeId);
    if (index !== -1) {
      const temple = this.temples[index];
      if (temple._gameObjects) {
        temple._gameObjects.forEach(obj => obj.destroy());
      }
      this.temples.splice(index, 1);
    }
  }

  getTemple(templeId) {
    return this.temples.find(t => t.id === templeId) || null;
  }

  getPlayerTemples(playerId) {
    return this.temples.filter(t => t.playerId === playerId);
  }

  /**
   * Count villagers belonging to a temple's player
   */
  getPlayerVillagerCount(playerId) {
    if (!this.villagerSystem) return 0;
    return this.villagerSystem.villagers.filter(v => v.playerId === playerId).length;
  }

  /**
   * Spawn a villager near a temple
   */
  spawnVillagerAtTemple(temple) {
    if (!this.villagerSystem || !this.playerSystem) return;

    // Find a passable tile near the temple
    const biomeMap = this.villagerSystem.biomeMap;
    if (!biomeMap) return;

    const cx = temple.position.x;
    const cy = temple.position.y;
    const searchRadius = 8;

    for (let attempt = 0; attempt < 15; attempt++) {
      const ox = Math.floor((Math.random() - 0.5) * searchRadius * 2);
      const oy = Math.floor((Math.random() - 0.5) * searchRadius * 2);
      const tx = cx + ox;
      const ty = cy + oy;

      if (tx >= 0 && tx < this.villagerSystem.mapWidth &&
          ty >= 0 && ty < this.villagerSystem.mapHeight &&
          biomeMap[ty] && biomeMap[ty][tx] && biomeMap[ty][tx].passable) {

        const villager = this.villagerSystem.spawnVillager(tx, ty);
        if (villager) {
          this.playerSystem.addVillager(temple.playerId, villager);
          temple.spawnedCount++;
          return;
        }
      }
    }
  }

  update(delta) {
    for (const temple of this.temples) {
      // Spawn timer
      temple.spawnTimer -= delta;
      if (temple.spawnTimer <= 0) {
        temple.spawnTimer = SPAWN_INTERVAL;

        // Check if under population cap (uses scene's full cap calculation if available)
        const currentPop = this.getPlayerVillagerCount(temple.playerId);
        const maxPop = this.scene.getPopulationCap
          ? this.scene.getPopulationCap(this.playerSystem?.getPlayer(temple.playerId))
          : (temple.level || 1) * MAX_VILLAGERS_PER_TEMPLE;

        if (currentPop < maxPop) {
          this.spawnVillagerAtTemple(temple);
        }
      }
    }
  }

  getCount() {
    return this.temples.length;
  }

  clearAll() {
    this.temples.forEach(temple => {
      if (temple._gameObjects) {
        temple._gameObjects.forEach(obj => obj.destroy());
      }
    });
    this.temples = [];
  }

  destroy() {
    this.clearAll();
  }
}
