/**
 * Layer 1: Main Game Scene
 *
 * Handles core game rendering, camera controls, and scene lifecycle.
 * This is the primary scene where the god simulation gameplay occurs.
 */

import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig';

export default class MainScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainScene' });

    // World dimensions
    this.worldWidth = GAME_CONFIG.WORLD_WIDTH;
    this.worldHeight = GAME_CONFIG.WORLD_HEIGHT;

    // Camera settings
    this.minZoom = GAME_CONFIG.MIN_ZOOM;
    this.maxZoom = GAME_CONFIG.MAX_ZOOM;

    // Graphics reference
    this.backgroundGraphics = null;
  }

  /**
   * Initialize scene - called before create
   */
  init() {
    // Scene initialization logic
    this.isInitialized = true;
  }

  /**
   * Create scene - called once at scene start
   * Sets up camera, world bounds, and initial rendering
   */
  create() {
    // Set world bounds (larger than viewport for panning)
    if (this.cameras && this.cameras.main) {
      this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);

      // Set initial zoom
      this.cameras.main.setZoom(GAME_CONFIG.DEFAULT_ZOOM);

      // Center camera on middle of world
      this.cameras.main.centerOn(this.worldWidth / 2, this.worldHeight / 2);
    }

    // Create background graphics object
    if (this.add && this.add.graphics) {
      this.backgroundGraphics = this.add.graphics();

      // Draw initial background
      this.drawBackground();
    }
  }

  /**
   * Update loop - called every frame
   * @param {number} time - Total elapsed time in ms
   * @param {number} delta - Time elapsed since last frame in ms
   */
  update(time, delta) {
    // Update logic will go here in future layers
  }

  /**
   * Pan camera to specific world coordinates
   * @param {number} x - World X coordinate
   * @param {number} y - World Y coordinate
   */
  panCamera(x, y) {
    this.cameras.main.centerOn(x, y);
  }

  /**
   * Zoom camera to specific level with clamping
   * @param {number} zoomLevel - Desired zoom level
   */
  zoomCamera(zoomLevel) {
    // Clamp zoom between min and max
    const clampedZoom = Phaser.Math.Clamp(zoomLevel, this.minZoom, this.maxZoom);
    this.cameras.main.setZoom(clampedZoom);
  }

  /**
   * Get current camera position and zoom
   * @returns {{x: number, y: number, zoom: number}}
   */
  getCameraPosition() {
    const camera = this.cameras.main;
    return {
      x: camera.scrollX + camera.width / 2,
      y: camera.scrollY + camera.height / 2,
      zoom: camera.zoom
    };
  }

  /**
   * Get camera bounds
   * @returns {{width: number, height: number}}
   */
  getCameraBounds() {
    return {
      width: this.worldWidth,
      height: this.worldHeight
    };
  }

  /**
   * Draw background (placeholder for now)
   * Will be replaced by terrain rendering in Layer 2
   */
  drawBackground() {
    if (!this.backgroundGraphics) return;

    this.backgroundGraphics.clear();

    // Simple grid background to show camera is working
    this.backgroundGraphics.lineStyle(1, 0x333333, 0.5);

    // Draw grid lines every 100 pixels
    for (let x = 0; x <= this.worldWidth; x += 100) {
      this.backgroundGraphics.lineBetween(x, 0, x, this.worldHeight);
    }

    for (let y = 0; y <= this.worldHeight; y += 100) {
      this.backgroundGraphics.lineBetween(0, y, this.worldWidth, y);
    }

    // Draw world boundary
    this.backgroundGraphics.lineStyle(2, 0x00ff00, 1);
    this.backgroundGraphics.strokeRect(0, 0, this.worldWidth, this.worldHeight);
  }
}
