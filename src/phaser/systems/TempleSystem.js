/**
 * Layer 6: Temple Management and Rendering System
 *
 * Handles temple rendering and management using individual Phaser game objects.
 */

import { TERRAIN_CONFIG } from '../config/terrainConfig';

const TEMPLE_SIZE = 80;

export default class TempleSystem {
  /**
   * Create a new temple system
   * @param {Phaser.Scene} scene - The Phaser scene
   */
  constructor(scene) {
    this.scene = scene;
    this.temples = [];
  }

  /**
   * Add a temple to the system and create its visual
   * @param {Object} temple - Temple entity
   */
  addTemple(temple) {
    this.temples.push(temple);

    // Create visual game objects for this temple
    if (this.scene && this.scene.add) {
      const TILE_SIZE = TERRAIN_CONFIG.TILE_SIZE;
      const pixelX = temple.position.x * TILE_SIZE + TILE_SIZE / 2;
      const pixelY = temple.position.y * TILE_SIZE + TILE_SIZE / 2;
      const color = temple.playerColor || 0xFFD700;

      // Main temple body
      const rect = this.scene.add.rectangle(pixelX, pixelY, TEMPLE_SIZE, TEMPLE_SIZE, color);
      rect.setDepth(50);
      rect.setStrokeStyle(2, 0xFFFFFF);

      // Cross marker (horizontal line)
      const crossH = this.scene.add.rectangle(pixelX, pixelY, TEMPLE_SIZE / 2, 3, 0xFFFFFF);
      crossH.setDepth(51);

      // Cross marker (vertical line)
      const crossV = this.scene.add.rectangle(pixelX, pixelY, 3, TEMPLE_SIZE / 2, 0xFFFFFF);
      crossV.setDepth(51);

      temple._gameObjects = [rect, crossH, crossV];
    }

    console.log(`[TempleSystem] Added temple ${temple.id} at (${temple.position.x}, ${temple.position.y})`);
  }

  /**
   * Remove a temple
   * @param {string} templeId - Temple ID
   */
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

  /**
   * Get temple by ID
   * @param {string} templeId - Temple ID
   * @returns {Object|null} Temple entity
   */
  getTemple(templeId) {
    return this.temples.find(t => t.id === templeId) || null;
  }

  /**
   * Get all temples for a player
   * @param {string} playerId - Player ID
   * @returns {Array} Player's temples
   */
  getPlayerTemples(playerId) {
    return this.temples.filter(t => t.playerId === playerId);
  }

  /**
   * Update temples (called every frame)
   * @param {number} delta - Time since last frame
   */
  update(delta) {
    // Temples are static - no per-frame work needed
  }

  /**
   * Get count of active temples
   * @returns {number} Temple count
   */
  getCount() {
    return this.temples.length;
  }

  /**
   * Clear all temples
   */
  clearAll() {
    this.temples.forEach(temple => {
      if (temple._gameObjects) {
        temple._gameObjects.forEach(obj => obj.destroy());
      }
    });
    this.temples = [];
  }

  /**
   * Clean up
   */
  destroy() {
    this.clearAll();
  }
}
