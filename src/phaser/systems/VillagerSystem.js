/**
 * Layer 4: Villager Management System
 *
 * Manages all villagers, spawning, updating, and pathfinding integration.
 * Handles pause/resume and automatic destination assignment.
 */

import Villager from '../entities/Villager';

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

    console.log('[VillagerSystem] Initialized');
  }

  /**
   * Set map bounds for random destination selection
   * @param {number} width - Map width in tiles
   * @param {number} height - Map height in tiles
   */
  setMapBounds(width, height) {
    this.mapWidth = width;
    this.mapHeight = height;
  }

  /**
   * Set terrain reference for passability checks
   * @param {Array<Array>} biomeMap - 2D biome map
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
      console.error('[VillagerSystem] Cannot spawn villager without scene');
      return null;
    }

    // Create Phaser graphics for villager
    const TILE_SIZE = 16;
    const graphics = this.scene.add.graphics();
    graphics.fillStyle(0x4a90e2, 1.0); // Blue color
    graphics.fillCircle(0, 0, 6); // 6 pixel radius
    graphics.setDepth(100); // Above terrain

    // Position at tile center
    graphics.x = x * TILE_SIZE + TILE_SIZE / 2;
    graphics.y = y * TILE_SIZE + TILE_SIZE / 2;

    // Create villager entity
    const villager = new Villager(this.nextId++, x, y, graphics);
    villager.origin = { x, y };

    this.villagers.push(villager);

    console.log(`[VillagerSystem] Spawned villager ${villager.id} at (${x},${y})`);

    return villager;
  }

  /**
   * Remove a villager by ID
   * @param {number} id - Villager ID
   */
  removeVillager(id) {
    const index = this.villagers.findIndex(v => v.id === id);
    if (index !== -1) {
      const villager = this.villagers[index];
      villager.destroy();
      this.villagers.splice(index, 1);

      console.log(`[VillagerSystem] Removed villager ${id}`);
    }
  }

  /**
   * Clear all villagers
   */
  clearAll() {
    this.villagers.forEach(villager => villager.destroy());
    this.villagers = [];

    console.log('[VillagerSystem] Cleared all villagers');
  }

  /**
   * Assign a random passable destination to a villager
   * @param {Villager} villager - The villager
   * @param {number} destX - Optional specific X destination
   * @param {number} destY - Optional specific Y destination
   */
  assignRandomDestination(villager, destX, destY) {
    if (!this.pathfindingSystem) {
      console.warn('[VillagerSystem] No pathfinding system available');
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
      // Pick random destination in center area
      const centerX = Math.floor(this.mapWidth / 2);
      const centerY = Math.floor(this.mapHeight / 2);
      const radius = 75;

      targetX = centerX + Math.floor(Math.random() * radius * 2) - radius;
      targetY = centerY + Math.floor(Math.random() * radius * 2) - radius;

      // Clamp to map bounds
      targetX = Math.max(0, Math.min(this.mapWidth - 1, targetX));
      targetY = Math.max(0, Math.min(this.mapHeight - 1, targetY));
    }

    // Find path to destination
    const startX = Math.floor(villager.x);
    const startY = Math.floor(villager.y);

    const path = this.pathfindingSystem.findPath(startX, startY, targetX, targetY);

    if (path) {
      villager.setPath(path);
      villager.destination = { x: targetX, y: targetY };
      console.log(`[VillagerSystem] Assigned destination (${targetX},${targetY}) to villager ${villager.id}`);
    } else {
      console.warn(`[VillagerSystem] No path found for villager ${villager.id} to (${targetX},${targetY})`);
      villager.clearPath();
    }
  }

  /**
   * Update all villagers
   * @param {number} delta - Time since last frame in milliseconds
   */
  update(delta) {
    // Don't update if system is paused
    if (this.isPaused) {
      return;
    }

    // Update each villager
    for (const villager of this.villagers) {
      villager.update(delta);

      // Auto-assign new destination when idle and pause timer expired
      if (this.autoAssignDestinations &&
          villager.state === 'idle' &&
          villager.pauseTimer === 0) {

        if (villager.returningHome) {
          // Just returned home, now go back to destination
          villager.returningHome = false;
          this.assignRandomDestination(villager);
        } else if (villager.destination) {
          // Just reached destination, now return home
          villager.returningHome = true;
          this.assignRandomDestination(villager);
        } else {
          // First time, pick random destination
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

    console.log('[VillagerSystem] Paused all villagers');
  }

  /**
   * Resume all villagers
   */
  resumeAll() {
    this.isPaused = false;
    this.villagers.forEach(villager => villager.resume());

    console.log('[VillagerSystem] Resumed all villagers');
  }

  /**
   * Get count of active villagers
   * @returns {number} Villager count
   */
  getCount() {
    return this.villagers.length;
  }

  /**
   * Get villager by ID
   * @param {number} id - Villager ID
   * @returns {Villager|null} The villager or null
   */
  getVillager(id) {
    return this.villagers.find(v => v.id === id) || null;
  }
}
