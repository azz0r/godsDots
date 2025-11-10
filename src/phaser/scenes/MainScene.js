/**
 * Layer 5: Main Game Scene with Terrain, Pathfinding, Villagers, and Camera Controls
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
import TempleSystem from '../systems/TempleSystem';
import CameraControlSystem from '../systems/CameraControlSystem';
import PlayerSystem from '../systems/PlayerSystem';
import GameInitializer from '../systems/GameInitializer';

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
    this.terrainRenderTexture = null; // RenderTexture for efficient terrain rendering
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

    // Temple system (Layer 6)
    this.templeSystem = null;

    // Camera control system (Layer 5)
    this.cameraControlSystem = null;

    // Player system (Layer 6)
    this.playerSystem = null;

    // Game state (Layer 6)
    this.gameStarted = false;
    this.gameEnded = false;
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
    console.log('[MainScene] ========== CREATE SCENE ==========');
    console.log(`[MainScene] World: ${this.worldWidth}x${this.worldHeight}px`);
    console.log(`[MainScene] Map: ${this.mapWidth}x${this.mapHeight} tiles`);
    console.log(`[MainScene] Tile size: ${TERRAIN_CONFIG.TILE_SIZE}px`);

    // Set world bounds (larger than viewport for panning)
    if (this.cameras && this.cameras.main) {
      this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
      console.log(`[MainScene] Camera bounds: (0,0) to (${this.worldWidth},${this.worldHeight})`);

      // Set initial zoom
      this.cameras.main.setZoom(GAME_CONFIG.DEFAULT_ZOOM);
      console.log(`[MainScene] Zoom: ${GAME_CONFIG.DEFAULT_ZOOM}x`);

      // Center camera on middle of world
      const centerX = this.worldWidth / 2;
      const centerY = this.worldHeight / 2;
      this.cameras.main.centerOn(centerX, centerY);
      console.log(`[MainScene] Camera centered on: (${centerX}, ${centerY})`);
      console.log(`[MainScene] Camera scrollX: ${this.cameras.main.scrollX}, scrollY: ${this.cameras.main.scrollY}`);
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

      // Initialize temple system (Layer 6)
      this.templeSystem = new TempleSystem(this);
      console.log('[MainScene] Temple system initialized');

      // Initialize camera control system (Layer 5)
      this.cameraControlSystem = new CameraControlSystem(this);
      console.log('[MainScene] Camera control system initialized');

      // Initialize player system (Layer 6)
      this.playerSystem = new PlayerSystem(this);
      console.log('[MainScene] Player system initialized');

      // Start the game (spawn players, temples, villagers)
      this.startGame();
    }
  }

  /**
   * Start the game - spawn players and initial entities
   */
  startGame() {
    if (this.gameStarted) {
      return;
    }

    console.log('[MainScene] Starting game...');

    const result = GameInitializer.initializeGame(
      this,
      {
        playerSystem: this.playerSystem,
        villagerSystem: this.villagerSystem,
        templeSystem: this.templeSystem,
        pathfindingSystem: this.pathfindingSystem
      },
      {
        mapWidth: this.mapWidth,
        mapHeight: this.mapHeight,
        villagersPerPlayer: 3
      }
    );

    if (result) {
      this.gameStarted = true;
      GameInitializer.showGameStartMessage(this);

      // Listen for game end events
      this.events.on('game_end', this.handleGameEnd, this);
    }
  }

  /**
   * Handle game end
   * @param {Object} result - {winner, reason}
   */
  handleGameEnd(result) {
    if (this.gameEnded) {
      return;
    }

    this.gameEnded = true;
    GameInitializer.showGameEndMessage(this, result);
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

    // Update temples (Layer 6)
    if (this.templeSystem) {
      this.templeSystem.update(delta);
    }

    // Update camera controls (Layer 5)
    if (this.cameraControlSystem) {
      this.cameraControlSystem.update(delta);
    }

    // Update player system (Layer 6)
    if (this.playerSystem && this.gameStarted && !this.gameEnded) {
      this.playerSystem.update(time, delta);
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
   * Render terrain using RenderTexture for optimal performance
   * Pre-renders all 1M tiles once to a texture, then displays as a sprite
   */
  renderTerrain(biomeMap) {
    console.log('[MainScene] renderTerrain() called - Using RenderTexture optimization');

    // Clean up existing terrain
    if (this.terrainRenderTexture) {
      this.terrainRenderTexture.destroy();
      this.terrainRenderTexture = null;
    }
    if (this.terrainGraphics) {
      this.terrainGraphics.destroy();
      this.terrainGraphics = null;
    }

    // Check if renderTexture is available (not in test mode)
    if (!this.add.renderTexture) {
      console.warn('[MainScene] RenderTexture not available (test mode), using fallback Graphics');
      this.renderTerrainFallback(biomeMap);
      return;
    }

    // Create RenderTexture to hold the terrain (rendered once)
    console.log(`[MainScene] Creating RenderTexture (${this.worldWidth}x${this.worldHeight})...`);
    this.terrainRenderTexture = this.add.renderTexture(0, 0, this.worldWidth, this.worldHeight);

    // Create temporary graphics object to draw to RenderTexture (not added to scene)
    const tempGraphics = this.make.graphics({ add: false });

    console.log(`[MainScene] Pre-rendering ${this.mapWidth}x${this.mapHeight} tiles to texture...`);
    const startTime = performance.now();
    let tilesRendered = 0;

    // Batch render tiles by color to reduce draw calls
    const colorBatches = new Map();

    // Group tiles by color
    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        const biome = biomeMap[y][x];
        const color = biome.color;

        if (!colorBatches.has(color)) {
          colorBatches.set(color, []);
        }

        colorBatches.get(color).push({
          x: x * TERRAIN_CONFIG.TILE_SIZE,
          y: y * TERRAIN_CONFIG.TILE_SIZE
        });
        tilesRendered++;
      }
    }

    // Render all tiles of the same color in one batch
    console.log(`[MainScene] Rendering ${colorBatches.size} color batches...`);
    for (const [color, tiles] of colorBatches) {
      tempGraphics.fillStyle(color, 1);
      for (const tile of tiles) {
        tempGraphics.fillRect(tile.x, tile.y, TERRAIN_CONFIG.TILE_SIZE, TERRAIN_CONFIG.TILE_SIZE);
      }
    }

    // Draw the graphics to the RenderTexture
    this.terrainRenderTexture.draw(tempGraphics);

    // Clean up temporary graphics
    tempGraphics.destroy();

    // The RenderTexture itself is already a display object - no need to create a sprite
    // Just set its properties
    this.terrainRenderTexture.setPosition(0, 0);
    this.terrainRenderTexture.setOrigin(0, 0);
    this.terrainRenderTexture.setDepth(0); // Below everything else

    const endTime = performance.now();
    console.log(`[MainScene] ✓ Rendered ${tilesRendered} tiles to texture in ${(endTime - startTime).toFixed(2)}ms`);
    console.log(`[MainScene] ✓ Performance: Reduced from 2M draw calls/frame to 1 sprite render/frame`);
    console.log(`[MainScene] Terrain texture positioned at (${this.terrainRenderTexture.x}, ${this.terrainRenderTexture.y})`);
    console.log(`[MainScene] Terrain texture size: ${this.terrainRenderTexture.width}x${this.terrainRenderTexture.height}`);
  }

  /**
   * Fallback terrain rendering for test environments
   * Uses standard Graphics rendering (slower but works in all environments)
   */
  renderTerrainFallback(biomeMap) {
    console.log('[MainScene] Using fallback Graphics rendering');

    // Create a single graphics object for all terrain
    this.terrainGraphics = this.add.graphics();

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

        tilesRendered++;
      }
    }

    console.log(`[MainScene] ✓ Rendered ${tilesRendered} tiles (fallback mode)`);
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
