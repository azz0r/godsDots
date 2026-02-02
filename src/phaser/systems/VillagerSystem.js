/**
 * Layer 4: Villager Management System
 *
 * Manages all villagers, spawning, updating, and pathfinding integration.
 * Uses individual Phaser circle game objects for reliable rendering.
 */

import Villager from '../entities/Villager';
import { TERRAIN_CONFIG } from '../config/terrainConfig';

const MAX_VILLAGERS = 1400;
const VILLAGER_RADIUS = 10;

export default class VillagerSystem {
  /**
   * Create a new villager system
   * @param {Phaser.Scene} scene - The Phaser scene
   * @param {PathfindingSystem} pathfindingSystem - Pathfinding system reference
   */
  constructor(scene, pathfindingSystem) {
    this.scene = scene;
    this.pathfindingSystem = pathfindingSystem;

    this.villagers = [];
    this.nextId = 1;
    this.isPaused = false;

    // Map bounds for random destination selection
    this.mapWidth = 250;
    this.mapHeight = 250;

    // Behavior settings
    this.autoAssignDestinations = true;

    // Biome data for passability checks
    this.biomeMap = null;
  }

  /**
   * Set map bounds for random destination selection
   */
  setMapBounds(width, height) {
    this.mapWidth = width;
    this.mapHeight = height;
  }

  /**
   * Set terrain reference for passability checks
   */
  setTerrainData(biomeMap) {
    this.biomeMap = biomeMap;
  }

  /**
   * Spawn a new villager at specified position
   * @param {number} x - X position in tiles
   * @param {number} y - Y position in tiles
   * @returns {Villager} The spawned villager
   */
  spawnVillager(x, y) {
    if (!this.scene) {
      return null;
    }

    if (this.villagers.length >= MAX_VILLAGERS) {
      console.warn(`[VillagerSystem] Max villager limit (${MAX_VILLAGERS}) reached`);
      return null;
    }

    const villager = new Villager(this.nextId++, x, y);
    villager.origin = { x, y };

    // Create a visual circle game object
    if (this.scene.add) {
      const TILE_SIZE = TERRAIN_CONFIG.TILE_SIZE;
      const pixelX = x * TILE_SIZE + TILE_SIZE / 2;
      const pixelY = y * TILE_SIZE + TILE_SIZE / 2;

      const circle = this.scene.add.circle(pixelX, pixelY, VILLAGER_RADIUS, 0xff0000);
      circle.setDepth(100);
      circle.setStrokeStyle(1, 0xFFFFFF, 0.7);
      villager._circle = circle;
    }

    this.villagers.push(villager);
    return villager;
  }

  /**
   * Remove a villager by ID
   */
  removeVillager(id) {
    const index = this.villagers.findIndex(v => v.id === id);
    if (index !== -1) {
      const villager = this.villagers[index];
      if (villager._circle) {
        villager._circle.destroy();
      }
      villager.destroy();
      this.villagers.splice(index, 1);
    }
  }

  /**
   * Clear all villagers
   */
  clearAll() {
    this.villagers.forEach(villager => {
      if (villager._circle) {
        villager._circle.destroy();
      }
      villager.destroy();
    });
    this.villagers = [];
  }

  /**
   * Assign a random passable destination to a villager
   */
  assignRandomDestination(villager, destX, destY) {
    if (!this.pathfindingSystem) {
      return;
    }

    let targetX, targetY;

    if (destX !== undefined && destY !== undefined) {
      // Use specified destination
      targetX = destX;
      targetY = destY;
    } else if (villager.returningHome) {
      // Return to origin
      targetX = villager.origin.x;
      targetY = villager.origin.y;
    } else {
      // Pick random passable destination near villager's origin (their temple area)
      const wanderRadius = 30;
      let found = false;

      for (let attempt = 0; attempt < 10; attempt++) {
        const tx = Math.floor(villager.origin.x + (Math.random() - 0.5) * wanderRadius * 2);
        const ty = Math.floor(villager.origin.y + (Math.random() - 0.5) * wanderRadius * 2);

        // Clamp to map bounds
        const cx = Math.max(0, Math.min(this.mapWidth - 1, tx));
        const cy = Math.max(0, Math.min(this.mapHeight - 1, ty));

        // Check passability before trying pathfinding
        if (this.biomeMap && this.biomeMap[cy] && this.biomeMap[cy][cx] &&
            this.biomeMap[cy][cx].passable) {
          targetX = cx;
          targetY = cy;
          found = true;
          break;
        }
      }

      if (!found) {
        // No passable destination found after attempts, stay idle
        villager.clearPath();
        return;
      }
    }

    // Find path to destination
    const startX = Math.floor(villager.x);
    const startY = Math.floor(villager.y);

    const path = this.pathfindingSystem.findPath(startX, startY, targetX, targetY);

    if (path) {
      villager.setPath(path);
      villager.destination = { x: targetX, y: targetY };
    } else {
      villager.clearPath();
    }
  }

  /**
   * Update all villagers
   * @param {number} delta - Time since last frame in milliseconds
   */
  update(delta) {
    if (this.isPaused) {
      return;
    }

    const TILE_SIZE = TERRAIN_CONFIG.TILE_SIZE;

    for (const villager of this.villagers) {
      villager.update(delta);

      // Update circle position to match villager tile position
      if (villager._circle) {
        villager._circle.x = villager.x * TILE_SIZE + TILE_SIZE / 2;
        villager._circle.y = villager.y * TILE_SIZE + TILE_SIZE / 2;

        // Update color if playerColor is set
        if (villager.playerColor && !villager._colorSet) {
          villager._circle.setFillStyle(villager.playerColor);
          villager._colorSet = true;
        }
      }

      // Auto-assign new destination when idle and pause timer expired
      if (this.autoAssignDestinations &&
          villager.state === 'idle' &&
          villager.pauseTimer === 0) {

        if (villager.returningHome) {
          villager.returningHome = false;
          this.assignRandomDestination(villager);
        } else if (villager.destination) {
          villager.returningHome = true;
          this.assignRandomDestination(villager);
        } else {
          this.assignRandomDestination(villager);
        }
      }
    }
  }

  /**
   * Pause all villagers
   */
  pauseAll() {
    this.isPaused = true;
    this.villagers.forEach(villager => villager.pause());
  }

  /**
   * Resume all villagers
   */
  resumeAll() {
    this.isPaused = false;
    this.villagers.forEach(villager => villager.resume());
  }

  /**
   * Get count of active villagers
   */
  getCount() {
    return this.villagers.length;
  }

  /**
   * Get maximum villager limit
   */
  getMaxVillagers() {
    return MAX_VILLAGERS;
  }

  /**
   * Get villager by ID
   */
  getVillager(id) {
    return this.villagers.find(v => v.id === id) || null;
  }
}
