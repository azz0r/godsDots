/**
 * Layer 4: Main Game Scene with Terrain, Pathfinding, and Villagers
 *
 * Handles core game rendering, camera controls, terrain generation, pathfinding, and villagers.
 * This is the primary scene where the god simulation gameplay occurs.
 */

import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig';
import { TERRAIN_CONFIG, BIOME_TYPES } from '../config/terrainConfig';
import TerrainGenerator from '../systems/TerrainGenerator';
import BiomeMapper from '../systems/BiomeMapper';
import PathfindingSystem from '../systems/PathfindingSystem';
import PathVisualizer from '../systems/PathVisualizer';
import VillagerSystem from '../systems/VillagerSystem';

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
    this.biomeMap = null; // Store biome map for pathfinding

    // Map dimensions (in tiles)
    this.mapWidth = Math.floor(this.worldWidth / TERRAIN_CONFIG.TILE_SIZE);
    this.mapHeight = Math.floor(this.worldHeight / TERRAIN_CONFIG.TILE_SIZE);

    // Pathfinding system (Layer 3)
    this.pathfindingSystem = null;
    this.pathVisualizer = null;
    this.currentPath = null;
    this.pathStart = null;
    this.pathEnd = null;

    // Villager system (Layer 4)
    this.villagerSystem = null;
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

      // Initialize path visualizer (Layer 3)
      this.pathVisualizer = new PathVisualizer(this);

      // Initialize villager system (Layer 4)
      this.villagerSystem = new VillagerSystem(this, this.pathfindingSystem);
      this.villagerSystem.setMapBounds(this.mapWidth, this.mapHeight);
      this.villagerSystem.setTerrainData(this.biomeMap);
      console.log('[MainScene] Villager system initialized');
    }
  }

  /**
   * Update loop - called every frame
   * @param {number} time - Total elapsed time in ms
   * @param {number} delta - Time elapsed since last frame in ms
   */
  update(time, delta) {
    // Update villagers (Layer 4)
    if (this.villagerSystem) {
      this.villagerSystem.update(delta);
    }
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
    this.biomeMap = BiomeMapper.createBiomeMap(heightMap, moistureMap);
    console.log(`[MainScene] Biome map created:`, this.biomeMap.length, 'x', this.biomeMap[0]?.length);

    // Render terrain using Phaser tilemaps
    console.log(`[MainScene] Rendering terrain...`);
    this.renderTerrain(this.biomeMap);

    // Initialize pathfinding system with biome map
    console.log(`[MainScene] Initializing pathfinding system...`);
    this.pathfindingSystem = new PathfindingSystem(this.biomeMap, {
      allowDiagonal: true,
      dontCrossCorners: true,
      respectHeight: false // Can enable later for height-based movement
    });
    console.log(`[MainScene] Pathfinding system initialized`);

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

  /**
   * Layer 3: Find a path between two points
   * @param {number} startX - Start tile X
   * @param {number} startY - Start tile Y
   * @param {number} endX - End tile X
   * @param {number} endY - End tile Y
   * @returns {Array<{x, y}>|null} Path or null if not found
   */
  findPath(startX, startY, endX, endY) {
    if (!this.pathfindingSystem) {
      console.error('[MainScene] Pathfinding system not initialized');
      return null;
    }

    console.log(`[MainScene] Finding path from (${startX},${startY}) to (${endX},${endY})`);

    const path = this.pathfindingSystem.findPath(startX, startY, endX, endY);

    if (path) {
      const cost = this.pathfindingSystem.getPathCost(path);
      console.log(`[MainScene] Path found! Length: ${path.length}, Cost: ${cost.toFixed(2)}`);
      this.currentPath = path;

      // Visualize the path
      if (this.pathVisualizer) {
        this.pathVisualizer.clear();
        this.pathVisualizer.drawPath(path);
      }
    } else {
      console.log('[MainScene] No path found');
      this.currentPath = null;
    }

    return path;
  }

  /**
   * Clear current path visualization
   */
  clearPath() {
    this.currentPath = null;
    this.pathStart = null;
    this.pathEnd = null;

    if (this.pathVisualizer) {
      this.pathVisualizer.clear();
    }

    console.log('[MainScene] Path cleared');
  }

  /**
   * Set path visualization visibility
   * @param {boolean} visible - Whether to show path
   */
  setPathVisible(visible) {
    if (this.pathVisualizer) {
      this.pathVisualizer.setVisible(visible);
    }
  }

  /**
   * Get biome at specific tile coordinates
   * @param {number} tileX - Tile X coordinate
   * @param {number} tileY - Tile Y coordinate
   * @returns {Object|null} Biome object or null
   */
  getBiomeAt(tileX, tileY) {
    if (!this.biomeMap) return null;

    if (tileY < 0 || tileY >= this.biomeMap.length ||
        tileX < 0 || tileX >= this.biomeMap[0].length) {
      return null;
    }

    return this.biomeMap[tileY][tileX];
  }
}
