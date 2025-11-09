/**
 * Layer 2: Main Game Scene with Terrain
 *
 * Handles core game rendering, camera controls, and terrain generation.
 * This is the primary scene where the god simulation gameplay occurs.
 */

import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig';
import { TERRAIN_CONFIG, BIOME_TYPES } from '../config/terrainConfig';
import TerrainGenerator from '../systems/TerrainGenerator';
import BiomeMapper from '../systems/BiomeMapper';

export default class MainScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainScene' });

    // World dimensions (in pixels)
    this.worldWidth = GAME_CONFIG.WORLD_WIDTH;
    this.worldHeight = GAME_CONFIG.WORLD_HEIGHT;

    // Camera settings
    this.minZoom = GAME_CONFIG.MIN_ZOOM;
    this.maxZoom = GAME_CONFIG.MAX_ZOOM;

    // Terrain system
    this.terrainGenerator = null;
    this.terrainMap = null;
    this.terrainLayer = null;
    this.terrainGraphics = null; // Single graphics object for all terrain
    this.terrainSeed = Date.now();

    // Map dimensions (in tiles)
    this.mapWidth = Math.floor(this.worldWidth / TERRAIN_CONFIG.TILE_SIZE);
    this.mapHeight = Math.floor(this.worldHeight / TERRAIN_CONFIG.TILE_SIZE);
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
   * Sets up camera, world bounds, terrain, and initial rendering
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

    // Generate and render terrain (skip if in test mode)
    if (this.make && this.make.tilemap) {
      this.generateTerrain();
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
   * Generate procedural terrain and render as tilemap
   */
  generateTerrain(seed = this.terrainSeed) {
    console.log(`[MainScene] generateTerrain() called with seed: ${seed}`);
    console.log(`[MainScene] Map dimensions: ${this.mapWidth}x${this.mapHeight}`);

    // Create terrain generator with seed
    console.log(`[MainScene] Creating TerrainGenerator...`);
    this.terrainGenerator = new TerrainGenerator(seed);
    console.log(`[MainScene] TerrainGenerator created with seed:`, this.terrainGenerator.seed);

    // Generate height and moisture maps
    console.log(`[MainScene] Generating height map...`);
    const heightMap = this.terrainGenerator.generateHeightMap(this.mapWidth, this.mapHeight);
    console.log(`[MainScene] Height map generated:`, heightMap.length, 'x', heightMap[0]?.length);

    console.log(`[MainScene] Generating moisture map...`);
    const moistureMap = this.terrainGenerator.generateMoistureMap(this.mapWidth, this.mapHeight);
    console.log(`[MainScene] Moisture map generated:`, moistureMap.length, 'x', moistureMap[0]?.length);

    // Create biome map
    console.log(`[MainScene] Creating biome map...`);
    const biomeMap = BiomeMapper.createBiomeMap(heightMap, moistureMap);
    console.log(`[MainScene] Biome map created:`, biomeMap.length, 'x', biomeMap[0]?.length);

    // Render terrain using Phaser tilemaps
    console.log(`[MainScene] Rendering terrain...`);
    this.renderTerrain(biomeMap);

    console.log(`[MainScene] ✓ Terrain generation complete!`);
  }

  /**
   * Render terrain using a single Graphics object
   * Efficient rendering with proper cleanup for regeneration
   */
  renderTerrain(biomeMap) {
    console.log('[MainScene] renderTerrain() called');
    console.log('[MainScene] Existing graphics:', this.terrainGraphics);

    // Clear existing terrain graphics
    if (this.terrainGraphics) {
      console.log('[MainScene] Clearing and destroying existing graphics...');
      this.terrainGraphics.clear();
      this.terrainGraphics.destroy();
      this.terrainGraphics = null;
      console.log('[MainScene] Old graphics destroyed');
    }

    // Create a single graphics object for all terrain
    console.log('[MainScene] Creating new graphics object...');
    this.terrainGraphics = this.add.graphics();
    console.log('[MainScene] Graphics object created:', this.terrainGraphics);

    // Render each tile
    console.log(`[MainScene] Rendering ${this.mapWidth}x${this.mapHeight} tiles...`);
    let tilesRendered = 0;

    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        const biome = biomeMap[y][x];
        const pixelX = x * TERRAIN_CONFIG.TILE_SIZE;
        const pixelY = y * TERRAIN_CONFIG.TILE_SIZE;

        // Draw filled rectangle for this biome
        this.terrainGraphics.fillStyle(biome.color, 1);
        this.terrainGraphics.fillRect(
          pixelX,
          pixelY,
          TERRAIN_CONFIG.TILE_SIZE,
          TERRAIN_CONFIG.TILE_SIZE
        );

        // Optional: Add subtle border for visual clarity
        this.terrainGraphics.lineStyle(0.5, 0x000000, 0.1);
        this.terrainGraphics.strokeRect(
          pixelX,
          pixelY,
          TERRAIN_CONFIG.TILE_SIZE,
          TERRAIN_CONFIG.TILE_SIZE
        );

        tilesRendered++;
      }
    }

    console.log(`[MainScene] ✓ Rendered ${tilesRendered} tiles successfully`);
  }

  /**
   * Regenerate terrain with a new seed
   * Exposed for dev panel controls
   */
  regenerateTerrain() {
    console.log('[MainScene] regenerateTerrain() called');
    console.log('[MainScene] Current seed:', this.terrainSeed);

    const newSeed = Date.now();
    console.log('[MainScene] New seed:', newSeed);

    this.terrainSeed = newSeed;
    console.log('[MainScene] Seed updated, calling generateTerrain...');

    this.generateTerrain(newSeed);

    console.log('[MainScene] ✓ regenerateTerrain() complete');
  }

  /**
   * Get terrain data at specific tile coordinates
   */
  getTerrainAt(tileX, tileY) {
    if (!this.terrainMap) return null;

    const tile = this.terrainMap.getTileAt(tileX, tileY);
    return tile;
  }
}
