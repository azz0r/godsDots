/**
 * Layer 6: Temple Management and Rendering System
 *
 * Handles temple rendering and management.
 */

import { TERRAIN_CONFIG } from '../config/terrainConfig';

export default class TempleSystem {
  /**
   * Create a new temple system
   * @param {Phaser.Scene} scene - The Phaser scene
   */
  constructor(scene) {
    this.scene = scene;
    this.temples = [];

    // Graphics object for batch rendering
    if (scene && scene.add && scene.add.graphics) {
      this.templesGraphics = scene.add.graphics();
      this.templesGraphics.setDepth(50); // Between terrain and villagers
      console.log('[TempleSystem] Initialized with graphics');
    } else {
      this.templesGraphics = null;
      console.log('[TempleSystem] Initialized (test mode - no graphics)');
    }
  }

  /**
   * Add a temple to the system
   * @param {Object} temple - Temple entity
   */
  addTemple(temple) {
    this.temples.push(temple);
    console.log(`[TempleSystem] Added temple ${temple.id} at (${temple.position.x}, ${temple.position.y})`);
  }

  /**
   * Remove a temple
   * @param {string} templeId - Temple ID
   */
  removeTemple(templeId) {
    const index = this.temples.findIndex(t => t.id === templeId);
    if (index !== -1) {
      this.temples.splice(index, 1);
      console.log(`[TempleSystem] Removed temple ${templeId}`);
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
    // Render temples
    this.renderTemples();
  }

  /**
   * Batch render all temples to a single graphics object
   */
  renderTemples() {
    // Skip rendering in test mode
    if (!this.templesGraphics) {
      return;
    }

    // Clear previous frame
    this.templesGraphics.clear();

    if (this.temples.length === 0) {
      console.warn('[TempleSystem] No temples to render!');
      return;
    }

    const TILE_SIZE = TERRAIN_CONFIG.TILE_SIZE;
    const TEMPLE_SIZE = 32; // Temple size in pixels - MUCH BIGGER so you can actually see it

    // DEBUG: Log once per second
    if (!this._lastDebugLog || Date.now() - this._lastDebugLog > 1000) {
      console.log(`[TempleSystem] Rendering ${this.temples.length} temples at depth ${this.templesGraphics.depth}`);
      this.temples.forEach(t => {
        const pixelX = t.position.x * TILE_SIZE;
        const pixelY = t.position.y * TILE_SIZE;
        console.log(`  - Temple ${t.id} at tile (${t.position.x}, ${t.position.y}), pixel (${pixelX}, ${pixelY}), color: 0x${(t.playerColor || 0xFFD700).toString(16)}`);
      });
      this._lastDebugLog = Date.now();
    }

    // Group temples by player color
    const colorGroups = new Map();

    for (const temple of this.temples) {
      // Get player color from playerSystem (need to pass it through)
      const color = temple.playerColor || 0xFFD700; // Gold default

      if (!colorGroups.has(color)) {
        colorGroups.set(color, []);
      }

      colorGroups.get(color).push(temple);
    }

    // Draw each color group
    for (const [color, temples] of colorGroups) {
      // Fill color for temple body
      this.templesGraphics.fillStyle(color, 1.0);
      // Stroke for outline
      this.templesGraphics.lineStyle(1, 0xFFFFFF, 1.0);

      for (const temple of temples) {
        const pixelX = temple.position.x * TILE_SIZE + TILE_SIZE / 2;
        const pixelY = temple.position.y * TILE_SIZE + TILE_SIZE / 2;

        // Draw temple as a larger square with an outline
        this.templesGraphics.fillRect(
          pixelX - TEMPLE_SIZE / 2,
          pixelY - TEMPLE_SIZE / 2,
          TEMPLE_SIZE,
          TEMPLE_SIZE
        );
        this.templesGraphics.strokeRect(
          pixelX - TEMPLE_SIZE / 2,
          pixelY - TEMPLE_SIZE / 2,
          TEMPLE_SIZE,
          TEMPLE_SIZE
        );

        // Draw a small cross/marker on top to indicate it's a temple
        this.templesGraphics.lineStyle(1, 0xFFFFFF, 1.0);
        // Vertical line
        this.templesGraphics.beginPath();
        this.templesGraphics.moveTo(pixelX, pixelY - 2);
        this.templesGraphics.lineTo(pixelX, pixelY + 2);
        this.templesGraphics.strokePath();
        // Horizontal line
        this.templesGraphics.beginPath();
        this.templesGraphics.moveTo(pixelX - 2, pixelY);
        this.templesGraphics.lineTo(pixelX + 2, pixelY);
        this.templesGraphics.strokePath();
      }
    }
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
    this.temples = [];
    if (this.templesGraphics) {
      this.templesGraphics.clear();
    }
    console.log('[TempleSystem] Cleared all temples');
  }

  /**
   * Clean up
   */
  destroy() {
    if (this.templesGraphics) {
      this.templesGraphics.destroy();
      this.templesGraphics = null;
    }
    this.temples = [];
    console.log('[TempleSystem] Destroyed');
  }
}
