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
const MAX_LEVEL = 5;
const UPGRADE_COSTS = { 2: 100, 3: 250, 4: 500, 5: 1000 };

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
   * Get upgrade cost for a temple's next level
   */
  getUpgradeCost(temple) {
    const nextLevel = (temple.level || 1) + 1;
    if (nextLevel > MAX_LEVEL) return null;
    return UPGRADE_COSTS[nextLevel] || null;
  }

  /**
   * Upgrade a temple to the next level
   */
  upgradeTemple(templeId) {
    const temple = this.getTemple(templeId);
    if (!temple) return false;

    const currentLevel = temple.level || 1;
    if (currentLevel >= MAX_LEVEL) return false;

    const cost = UPGRADE_COSTS[currentLevel + 1];
    if (!cost) return false;

    if (!this.playerSystem?.spendBeliefPoints(temple.playerId, cost)) {
      return false;
    }

    temple.level = currentLevel + 1;

    // Update visuals - make temple larger and update aura
    if (temple._gameObjects && temple._gameObjects.length >= 4) {
      const TILE_SIZE = TERRAIN_CONFIG.TILE_SIZE;
      const newSize = TEMPLE_SIZE + (temple.level - 1) * 16;
      const newAuraRadius = INFLUENCE_RADIUS * temple.level * TILE_SIZE;

      // Update aura (index 0)
      const aura = temple._gameObjects[0];
      aura.setRadius(newAuraRadius);

      // Update temple body (index 1)
      const body = temple._gameObjects[1];
      body.setSize(newSize, newSize);

      // Update cross markers
      const crossH = temple._gameObjects[2];
      crossH.setSize(newSize / 2, 3);

      const crossV = temple._gameObjects[3];
      crossV.setSize(3, newSize / 2);
    }

    console.log(`[TempleSystem] Temple ${templeId} upgraded to level ${temple.level}`);
    return true;
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
          // Spawn effects
          if (this.scene.audioSystem) this.scene.audioSystem.playSpawnSound();
          if (this.scene.particleSystem) {
            const TILE_SIZE = TERRAIN_CONFIG.TILE_SIZE;
            this.scene.particleSystem.emitSpawn(
              tx * TILE_SIZE + TILE_SIZE / 2,
              ty * TILE_SIZE + TILE_SIZE / 2
            );
          }
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
