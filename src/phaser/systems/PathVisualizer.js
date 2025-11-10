/**
 * Layer 3: Path Visualization System
 *
 * Debug utility for rendering pathfinding results on the game canvas.
 * Helps visualize paths, waypoints, and pathfinding behavior.
 */

import { TERRAIN_CONFIG } from '../config/terrainConfig';

/**
 * PathVisualizer - Renders paths for debugging
 */
export default class PathVisualizer {
  /**
   * Create a new path visualizer
   * @param {Phaser.Scene} scene - The Phaser scene to render in
   */
  constructor(scene) {
    this.scene = scene;
    this.graphics = null;
    this.isVisible = true;
  }

  /**
   * Initialize the graphics object
   */
  init() {
    if (!this.graphics) {
      this.graphics = this.scene.add.graphics();
    }
  }

  /**
   * Clear all visualizations
   */
  clear() {
    if (this.graphics) {
      this.graphics.clear();
    }
  }

  /**
   * Destroy the visualizer
   */
  destroy() {
    if (this.graphics) {
      this.graphics.destroy();
      this.graphics = null;
    }
  }

  /**
   * Set visibility of visualizations
   * @param {boolean} visible - Whether to show visualizations
   */
  setVisible(visible) {
    this.isVisible = visible;
    if (this.graphics) {
      this.graphics.setVisible(visible);
    }
  }

  /**
   * Draw a path on the canvas
   * @param {Array<{x, y}>} path - Path to visualize
   * @param {Object} options - Visualization options
   */
  drawPath(path, options = {}) {
    if (!this.isVisible || !path || path.length === 0) {
      return;
    }

    this.init();

    const {
      lineColor = 0xff0000,        // Red line
      lineAlpha = 0.8,
      lineWidth = 3,
      showWaypoints = true,
      waypointColor = 0xffff00,    // Yellow dots
      waypointRadius = 4,
      showStartEnd = true,
      startColor = 0x00ff00,       // Green start
      endColor = 0x0000ff          // Blue end
    } = options;

    const tileSize = TERRAIN_CONFIG.TILE_SIZE;

    // Draw line connecting waypoints
    this.graphics.lineStyle(lineWidth, lineColor, lineAlpha);
    this.graphics.beginPath();

    for (let i = 0; i < path.length; i++) {
      const node = path[i];
      const pixelX = node.x * tileSize + tileSize / 2;
      const pixelY = node.y * tileSize + tileSize / 2;

      if (i === 0) {
        this.graphics.moveTo(pixelX, pixelY);
      } else {
        this.graphics.lineTo(pixelX, pixelY);
      }
    }

    this.graphics.strokePath();

    // Draw waypoint dots
    if (showWaypoints) {
      this.graphics.fillStyle(waypointColor, 0.6);

      for (let i = 1; i < path.length - 1; i++) {
        const node = path[i];
        const pixelX = node.x * tileSize + tileSize / 2;
        const pixelY = node.y * tileSize + tileSize / 2;

        this.graphics.fillCircle(pixelX, pixelY, waypointRadius);
      }
    }

    // Draw start and end markers
    if (showStartEnd && path.length > 0) {
      // Start marker (green circle)
      const start = path[0];
      const startX = start.x * tileSize + tileSize / 2;
      const startY = start.y * tileSize + tileSize / 2;

      this.graphics.fillStyle(startColor, 0.9);
      this.graphics.fillCircle(startX, startY, 8);

      // End marker (blue circle)
      const end = path[path.length - 1];
      const endX = end.x * tileSize + tileSize / 2;
      const endY = end.y * tileSize + tileSize / 2;

      this.graphics.fillStyle(endColor, 0.9);
      this.graphics.fillCircle(endX, endY, 8);
    }
  }

  /**
   * Draw multiple paths with different colors
   * @param {Array<{path: Array, color: number}>} paths - Array of paths with colors
   */
  drawMultiplePaths(paths) {
    if (!this.isVisible) {
      return;
    }

    this.clear();

    for (const pathData of paths) {
      this.drawPath(pathData.path, {
        lineColor: pathData.color || 0xff0000,
        showStartEnd: pathData.showStartEnd !== undefined ? pathData.showStartEnd : true,
        showWaypoints: pathData.showWaypoints !== undefined ? pathData.showWaypoints : true
      });
    }
  }

  /**
   * Highlight a specific tile
   * @param {number} x - Tile X coordinate
   * @param {number} y - Tile Y coordinate
   * @param {Object} options - Highlight options
   */
  highlightTile(x, y, options = {}) {
    if (!this.isVisible) {
      return;
    }

    this.init();

    const {
      fillColor = 0xffff00,
      fillAlpha = 0.3,
      strokeColor = 0xffff00,
      strokeAlpha = 0.8,
      strokeWidth = 2
    } = options;

    const tileSize = TERRAIN_CONFIG.TILE_SIZE;
    const pixelX = x * tileSize;
    const pixelY = y * tileSize;

    // Fill
    this.graphics.fillStyle(fillColor, fillAlpha);
    this.graphics.fillRect(pixelX, pixelY, tileSize, tileSize);

    // Stroke
    this.graphics.lineStyle(strokeWidth, strokeColor, strokeAlpha);
    this.graphics.strokeRect(pixelX, pixelY, tileSize, tileSize);
  }

  /**
   * Draw a grid overlay
   * @param {number} width - Grid width in tiles
   * @param {number} height - Grid height in tiles
   * @param {Object} options - Grid options
   */
  drawGrid(width, height, options = {}) {
    if (!this.isVisible) {
      return;
    }

    this.init();

    const {
      color = 0x00ff00,
      alpha = 0.2,
      lineWidth = 1
    } = options;

    const tileSize = TERRAIN_CONFIG.TILE_SIZE;

    this.graphics.lineStyle(lineWidth, color, alpha);

    // Vertical lines
    for (let x = 0; x <= width; x++) {
      const pixelX = x * tileSize;
      this.graphics.lineTo(pixelX, 0);
      this.graphics.lineTo(pixelX, height * tileSize);
      this.graphics.moveTo((x + 1) * tileSize, 0);
    }

    // Horizontal lines
    for (let y = 0; y <= height; y++) {
      const pixelY = y * tileSize;
      this.graphics.lineTo(0, pixelY);
      this.graphics.lineTo(width * tileSize, pixelY);
      this.graphics.moveTo(0, (y + 1) * tileSize);
    }

    this.graphics.strokePath();
  }

  /**
   * Draw path cost information as text
   * @param {Array<{x, y}>} path - The path
   * @param {number} cost - Total path cost
   */
  drawPathInfo(path, cost) {
    if (!this.isVisible || !path || path.length === 0) {
      return;
    }

    // Note: For text rendering in Phaser, you'd typically use scene.add.text()
    // This is a placeholder for future text rendering
    console.log(`[PathVisualizer] Path length: ${path.length}, Total cost: ${cost.toFixed(2)}`);
  }
}
