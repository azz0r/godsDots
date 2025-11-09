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
    console.log(`[Layer 2] Generating terrain with seed: ${seed}`);

    // Create terrain generator with seed
    this.terrainGenerator = new TerrainGenerator(seed);

    // Generate height and moisture maps
    const heightMap = this.terrainGenerator.generateHeightMap(this.mapWidth, this.mapHeight);
    const moistureMap = this.terrainGenerator.generateMoistureMap(this.mapWidth, this.mapHeight);

    // Create biome map
    const biomeMap = BiomeMapper.createBiomeMap(heightMap, moistureMap);

    // Render terrain using Phaser tilemaps
    this.renderTerrain(biomeMap);

    console.log(`[Layer 2] Terrain generated: ${this.mapWidth}x${this.mapHeight} tiles`);
  }

  /**
   * Render terrain using Phaser tilemap system
   * Uses Graphics objects to draw colored tiles (no sprite sheet needed)
   */
  renderTerrain(biomeMap) {
    // Clear existing terrain if present
    if (this.terrainLayer) {
      this.terrainLayer.destroy();
    }

    // Create a tilemap from blank data
    const map = this.make.tilemap({
      tileWidth: TERRAIN_CONFIG.TILE_SIZE,
      tileHeight: TERRAIN_CONFIG.TILE_SIZE,
      width: this.mapWidth,
      height: this.mapHeight
    });

    // Create blank layer
    const layer = map.createBlankLayer('terrain', null, 0, 0,
      this.mapWidth, this.mapHeight, TERRAIN_CONFIG.TILE_SIZE, TERRAIN_CONFIG.TILE_SIZE);

    // Render each tile with custom graphics callback
    layer.forEachTile((tile) => {
      const biome = biomeMap[tile.y][tile.x];
      const graphics = this.add.graphics();

      // Draw filled rectangle for this biome
      graphics.fillStyle(biome.color, 1);
      graphics.fillRect(
        tile.x * TERRAIN_CONFIG.TILE_SIZE,
        tile.y * TERRAIN_CONFIG.TILE_SIZE,
        TERRAIN_CONFIG.TILE_SIZE,
        TERRAIN_CONFIG.TILE_SIZE
      );

      // Optional: Add border for visual clarity
      graphics.lineStyle(0.5, 0x000000, 0.1);
      graphics.strokeRect(
        tile.x * TERRAIN_CONFIG.TILE_SIZE,
        tile.y * TERRAIN_CONFIG.TILE_SIZE,
        TERRAIN_CONFIG.TILE_SIZE,
        TERRAIN_CONFIG.TILE_SIZE
      );
    });

    this.terrainLayer = layer;
    this.terrainMap = map;
  }

  /**
   * Regenerate terrain with a new seed
   * Exposed for dev panel controls
   */
  regenerateTerrain() {
    const newSeed = Date.now();
    this.terrainSeed = newSeed;
    this.generateTerrain(newSeed);
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
