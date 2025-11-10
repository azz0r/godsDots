/**
 * Layer 4: Villager Entity
 *
 * Represents a single villager with pathfinding and state management.
 * Villagers move between destinations, pause, and return.
 */

import { TERRAIN_CONFIG } from '../config/terrainConfig';

export default class Villager {
  /**
   * Create a new villager
   * @param {number} id - Unique villager ID
   * @param {number} x - Starting X position (in tiles)
   * @param {number} y - Starting Y position (in tiles)
   * @param {Phaser.GameObjects.Graphics} graphics - Phaser graphics object
   */
  constructor(id, x, y, graphics) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.graphics = graphics;

    // Movement
    this.speed = 10; // Tiles per second (slower for bigger map)
    this.currentPath = null;
    this.pathIndex = 0;

    // State management
    this.state = 'idle'; // idle, moving
    this.isPaused = false;

    // Return journey
    this.origin = { x, y };
    this.destination = null;
    this.returningHome = false;
    this.pauseTimer = 0;
    this.pauseDuration = 2000; // 2 seconds pause at destination

    console.log(`[Villager ${this.id}] Created at (${x},${y})`);
  }

  /**
   * Set a path for the villager to follow
   * @param {Array<{x, y}>} path - Array of tile coordinates
   */
  setPath(path) {
    if (!path || path.length === 0) {
      this.clearPath();
      return;
    }

    this.currentPath = path;
    this.pathIndex = 0;
    this.state = 'moving';

    console.log(`[Villager ${this.id}] Path set with ${path.length} waypoints`);
  }

  /**
   * Clear current path
   */
  clearPath() {
    this.currentPath = null;
    this.pathIndex = 0;
    this.state = 'idle';
  }

  /**
   * Pause the villager
   */
  pause() {
    this.isPaused = true;
  }

  /**
   * Resume the villager
   */
  resume() {
    this.isPaused = false;
  }

  /**
   * Update villager (called every frame)
   * @param {number} delta - Time since last frame in milliseconds
   */
  update(delta) {
    // Don't update if paused
    if (this.isPaused) {
      return;
    }

    // Handle pause timer at destination
    if (this.pauseTimer > 0) {
      this.pauseTimer -= delta;
      if (this.pauseTimer <= 0) {
        this.pauseTimer = 0;
        // Will be handled by VillagerSystem to assign new path
      }
      return;
    }

    // Only update if moving
    if (this.state !== 'moving' || !this.currentPath) {
      return;
    }

    // Calculate movement for this frame
    let remainingMovement = (this.speed * delta) / 1000; // Convert to seconds

    // Keep moving through waypoints until we run out of movement or reach the end
    while (remainingMovement > 0 && this.pathIndex < this.currentPath.length) {
      const target = this.currentPath[this.pathIndex];
      if (!target) {
        this.clearPath();
        break;
      }

      // Calculate distance to target
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= remainingMovement) {
        // Reached waypoint
        this.x = target.x;
        this.y = target.y;
        remainingMovement -= distance;
        this.pathIndex++;

        // Check if reached end of path
        if (this.pathIndex >= this.currentPath.length) {
          this.clearPath();
          this.pauseTimer = this.pauseDuration;
          console.log(`[Villager ${this.id}] Reached destination, pausing...`);
          break;
        }
      } else {
        // Move towards waypoint
        const ratio = remainingMovement / distance;
        this.x += dx * ratio;
        this.y += dy * ratio;
        remainingMovement = 0;
      }
    }

    // Update graphics position
    this.updateGraphics();
  }

  /**
   * Update graphics position to match villager position
   */
  updateGraphics() {
    if (this.graphics) {
      // Convert tile position to pixel position
      const TILE_SIZE = TERRAIN_CONFIG.TILE_SIZE;
      this.graphics.x = this.x * TILE_SIZE + TILE_SIZE / 2;
      this.graphics.y = this.y * TILE_SIZE + TILE_SIZE / 2;
    }
  }

  /**
   * Destroy the villager and clean up resources
   */
  destroy() {
    if (this.graphics) {
      this.graphics.destroy();
      this.graphics = null;
    }

    console.log(`[Villager ${this.id}] Destroyed`);
  }
}
