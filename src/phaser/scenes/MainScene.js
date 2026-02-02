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
import GameClock from '../systems/GameClock';
import DivinePowerSystem from '../systems/DivinePowerSystem';
import BuildingSystem, { BUILDING_TYPES } from '../systems/BuildingSystem';
import AIGodSystem from '../systems/AIGodSystem';
import SaveSystem from '../systems/SaveSystem';
import FogOfWarSystem from '../systems/FogOfWarSystem';
import ParticleSystem from '../systems/ParticleSystem';
import { loadSettings } from './SettingsScene';

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

    // Divine power system
    this.divinePowerSystem = null;

    // Building system
    this.buildingSystem = null;

    // AI system
    this.aiGodSystem = null;

    // Fog of war
    this.fogOfWarSystem = null;

    // Particle effects
    this.particleSystem = null;

    // Game speed multiplier (1 = normal, 2 = double, etc.)
    this.gameSpeed = 1;

    // Pause state (Story 3)
    this.isPaused = false;
    this.pauseOverlay = null;

    // Auto-save
    this.autoSaveTimer = 60000; // Auto-save every 60 seconds

    // Minimap
    this.minimapVisible = true;
    this.minimapTexture = null;
    this.minimapBorder = null;
    this.minimapViewport = null;
    this.minimapUpdateTimer = 0;
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

      // Wire up cross-system references for worship/belief/spawning
      this.villagerSystem.templeSystem = this.templeSystem;
      this.villagerSystem.playerSystem = this.playerSystem;
      this.templeSystem.villagerSystem = this.villagerSystem;
      this.templeSystem.playerSystem = this.playerSystem;

      // Initialize divine power system
      this.divinePowerSystem = new DivinePowerSystem(this);
      this.divinePowerSystem.playerSystem = this.playerSystem;
      this.divinePowerSystem.villagerSystem = this.villagerSystem;

      // Initialize building system
      this.buildingSystem = new BuildingSystem(this);
      this.buildingSystem.playerSystem = this.playerSystem;
      this.buildingSystem.pathfindingSystem = this.pathfindingSystem;
      this.buildingSystem.templeSystem = this.templeSystem;

      // Initialize AI system
      this.aiGodSystem = new AIGodSystem(this);
      this.aiGodSystem.playerSystem = this.playerSystem;
      this.aiGodSystem.buildingSystem = this.buildingSystem;
      this.aiGodSystem.templeSystem = this.templeSystem;

      // Initialize particle system
      this.particleSystem = new ParticleSystem(this);

      // Initialize fog of war system
      this.fogOfWarSystem = new FogOfWarSystem(this);
      this.fogOfWarSystem.templeSystem = this.templeSystem;
      this.fogOfWarSystem.playerSystem = this.playerSystem;

      // Create in-game HUD, info panel, and minimap
      this.createHUD();
      this.createInfoPanel();
      this.createMinimap();

      // Initialize game clock (day/night cycle)
      this.gameClock = new GameClock(this);

      // Apply saved settings
      const savedSettings = loadSettings();
      this.gameSpeed = savedSettings.gameSpeed || 1;

      // Register click handlers for divine power targeting and building placement
      this.input.on('pointerdown', (pointer) => {
        // Right-click cancels any targeting
        if (pointer.rightButtonDown()) {
          if (this.divinePowerSystem?.selectedPower) this.divinePowerSystem.cancelPower();
          if (this.buildingSystem?.placementMode) this.buildingSystem.cancelPlacement();
          return;
        }

        // Left-click: cast power or place building
        if (pointer.leftButtonDown()) {
          const camera = this.cameras.main;
          const worldX = pointer.x / camera.zoom + camera.scrollX;
          const worldY = pointer.y / camera.zoom + camera.scrollY;

          if (this.divinePowerSystem?.selectedPower) {
            this.divinePowerSystem.castAtWorld(worldX, worldY);
          } else if (this.buildingSystem?.placementMode) {
            this.buildingSystem.placeAtWorld(worldX, worldY);
          } else {
            this.selectEntityAt(worldX, worldY);
          }
        }
      });
    }

    // Keyboard handlers
    if (this.input && this.input.keyboard) {
      // ESC: cancel targeting or toggle pause
      this.input.keyboard.on('keydown-ESC', () => {
        if (this.divinePowerSystem && this.divinePowerSystem.selectedPower) {
          this.divinePowerSystem.cancelPower();
        } else if (this.buildingSystem && this.buildingSystem.placementMode) {
          this.buildingSystem.cancelPlacement();
        } else {
          this.togglePause();
        }
      });

      // Number keys for divine powers
      this.input.keyboard.on('keydown-ONE', () => {
        if (this.divinePowerSystem) this.divinePowerSystem.selectPower('heal');
      });
      this.input.keyboard.on('keydown-TWO', () => {
        if (this.divinePowerSystem) this.divinePowerSystem.selectPower('storm');
      });
      this.input.keyboard.on('keydown-THREE', () => {
        if (this.divinePowerSystem) this.divinePowerSystem.selectPower('food');
      });

      // Building shortcuts
      this.input.keyboard.on('keydown-F', () => {
        if (this.buildingSystem) this.buildingSystem.startPlacement('farm');
      });
      this.input.keyboard.on('keydown-H', () => {
        if (this.buildingSystem) this.buildingSystem.startPlacement('house');
      });
      this.input.keyboard.on('keydown-W', () => {
        if (this.buildingSystem) this.buildingSystem.startPlacement('wall');
      });

      // M: toggle minimap
      this.input.keyboard.on('keydown-M', () => {
        this.minimapVisible = !this.minimapVisible;
        if (this.minimapTexture) this.minimapTexture.setVisible(this.minimapVisible);
        if (this.minimapBorder) this.minimapBorder.setVisible(this.minimapVisible);
        if (this.minimapViewport) this.minimapViewport.setVisible(this.minimapVisible);
      });

      // U: upgrade selected temple
      this.input.keyboard.on('keydown-U', () => {
        if (this.selectedEntity && this.selectedEntityType === 'temple') {
          const temple = this.selectedEntity;
          if (temple.playerId === this.playerSystem?.getHumanPlayer()?.id) {
            this.templeSystem.upgradeTemple(temple.id);
            this.updateInfoPanel();
          }
        }
      });

      console.log('[MainScene] Keyboard handlers registered');
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
    this.showGameOverScreen(result);
  }

  /**
   * Show game over screen with stats
   */
  showGameOverScreen(result) {
    const { width, height } = this.cameras.main;

    // Overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.85);
    overlay.fillRect(0, 0, width, height);
    overlay.setScrollFactor(0);
    overlay.setDepth(11000);

    const isVictory = result.winner && result.winner.type === 'human';
    const titleText = isVictory ? 'VICTORY' : (result.winner ? 'DEFEAT' : 'DRAW');
    const titleColor = isVictory ? '#FFD700' : '#FF4444';

    const title = this.add.text(width / 2, 150, titleText, {
      fontFamily: 'Georgia, serif',
      fontSize: '72px',
      fontStyle: 'bold',
      color: titleColor,
      stroke: '#000000',
      strokeThickness: 8,
    });
    title.setOrigin(0.5);
    title.setScrollFactor(0);
    title.setDepth(11001);

    // Stats
    const human = this.playerSystem?.getHumanPlayer();
    const day = this.gameClock ? this.gameClock.getDay() : 1;
    const belief = human ? Math.floor(human.beliefPoints) : 0;
    const pop = human ? human.population : 0;
    const buildings = this.buildingSystem ? this.buildingSystem.getPlayerBuildings(human?.id || '').length : 0;

    const statsLines = [
      `Days Survived: ${day}`,
      `Final Population: ${pop}`,
      `Belief Earned: ${belief}`,
      `Buildings Built: ${buildings}`,
    ];

    const stats = this.add.text(width / 2, 320, statsLines.join('\n'), {
      fontFamily: 'monospace',
      fontSize: '24px',
      color: '#FFFFFF',
      align: 'center',
      lineSpacing: 10,
    });
    stats.setOrigin(0.5);
    stats.setScrollFactor(0);
    stats.setDepth(11001);

    // Buttons
    const retryBtn = this.createGameOverButton(width / 2, height - 200, 'RETRY', () => {
      this.scene.restart();
    });

    const menuBtn = this.createGameOverButton(width / 2, height - 120, 'MAIN MENU', () => {
      this.scene.start('MainMenuScene');
    });

    // Store for cleanup
    this.gameOverElements = [overlay, title, stats, ...retryBtn, ...menuBtn];
  }

  createGameOverButton(x, y, text, onClick) {
    const w = 300, h = 55;
    const bg = this.add.graphics();
    bg.fillStyle(0x2a2a4e);
    bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 10);
    bg.lineStyle(2, 0x4a4a8e);
    bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 10);
    bg.setScrollFactor(0);
    bg.setDepth(11002);

    const t = this.add.text(x, y, text, {
      fontFamily: 'Georgia, serif',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#FFFFFF',
    });
    t.setOrigin(0.5);
    t.setScrollFactor(0);
    t.setDepth(11003);

    const hitArea = new Phaser.Geom.Rectangle(x - w / 2, y - h / 2, w, h);
    bg.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
    bg.on('pointerover', () => t.setColor('#FFD700'));
    bg.on('pointerout', () => t.setColor('#FFFFFF'));
    bg.on('pointerdown', onClick);

    return [bg, t];
  }

  /**
   * Update loop - called every frame
   * @param {number} time - Total elapsed time in ms
   * @param {number} delta - Time elapsed since last frame in ms
   */
  update(time, delta) {
    // Story 3: Skip updates if game is paused
    if (this.isPaused) {
      // Still allow camera controls when paused
      if (this.cameraControlSystem) {
        this.cameraControlSystem.update(delta);
      }
      return;
    }

    // Apply game speed multiplier
    const scaledDelta = delta * this.gameSpeed;

    // Update villagers (Layer 4)
    if (this.villagerSystem) {
      this.villagerSystem.update(scaledDelta);
    }

    // Update temples (Layer 6)
    if (this.templeSystem) {
      this.templeSystem.update(scaledDelta);
    }

    // Update camera controls (Layer 5) - not scaled by game speed
    if (this.cameraControlSystem) {
      this.cameraControlSystem.update(delta);
    }

    // Update player system (Layer 6)
    if (this.playerSystem && this.gameStarted && !this.gameEnded) {
      this.playerSystem.update(time, scaledDelta);
    }

    // Update game clock
    if (this.gameClock) {
      this.gameClock.update(scaledDelta);
    }

    // Update divine power system (cooldowns tick at real time, targeting follows cursor)
    if (this.divinePowerSystem) {
      this.divinePowerSystem.update(delta);
    }

    // Update building system (food production uses game speed, ghost preview uses real time)
    if (this.buildingSystem) {
      this.buildingSystem.update(delta, scaledDelta);
    }

    // Update AI system
    if (this.aiGodSystem) {
      this.aiGodSystem.update(scaledDelta);
    }

    // Update fog of war
    if (this.fogOfWarSystem) {
      this.fogOfWarSystem.update(delta);
    }

    // Update HUD and minimap
    this.updateHUD();
    this.updateMinimap();

    // Auto-save
    this.autoSaveTimer -= delta;
    if (this.autoSaveTimer <= 0) {
      this.autoSaveTimer = 60000;
      SaveSystem.saveGame(this, true);
    }
  }

  /**
   * Create in-game HUD showing belief, population, worship count
   */
  createHUD() {
    const style = {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#FFFFFF',
      backgroundColor: 'rgba(0,0,0,0.6)',
      padding: { x: 12, y: 8 },
    };

    this.hudText = this.add.text(10, 10, '', style);
    this.hudText.setScrollFactor(0);
    this.hudText.setDepth(5000);

    // Power hints at bottom of screen
    const hintStyle = {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#AAAAAA',
      backgroundColor: 'rgba(0,0,0,0.4)',
      padding: { x: 8, y: 4 },
    };

    this.powerHintText = this.add.text(10, this.cameras.main.height - 40,
      '[1] Heal  [2] Storm  [3] Food  |  [F] Farm  [H] House  [W] Wall  |  [U] Upgrade  [ESC] Pause', hintStyle);
    this.powerHintText.setScrollFactor(0);
    this.powerHintText.setDepth(5000);
  }

  /**
   * Update HUD text each frame
   */
  updateHUD() {
    if (!this.hudText || !this.playerSystem) return;

    const human = this.playerSystem.getHumanPlayer();
    if (!human) return;

    const belief = Math.floor(human.beliefPoints);
    const food = Math.floor(human.food);
    const pop = human.population;
    const worshipping = this.villagerSystem ? this.villagerSystem.getWorshippingCount() : 0;
    const sleeping = this.villagerSystem ? this.villagerSystem.getSleepingCount() : 0;
    const timeStr = this.gameClock ? this.gameClock.getTimeString() : '';

    const popCap = this.getPopulationCap(human);
    let statusParts = [`${timeStr}`, `Belief: ${belief}`, `Food: ${food}`, `Pop: ${pop}/${popCap}`];
    if (worshipping > 0) statusParts.push(`Worshipping: ${worshipping}`);
    if (sleeping > 0) statusParts.push(`Sleeping: ${sleeping}`);
    if (food === 0) statusParts.push('STARVING');

    // Show targeting/placement mode
    if (this.divinePowerSystem && this.divinePowerSystem.selectedPower) {
      const info = this.divinePowerSystem.getPowerInfo(this.divinePowerSystem.selectedPower);
      if (info) statusParts.push(`CASTING: ${info.name}`);
    } else if (this.buildingSystem && this.buildingSystem.placementMode) {
      statusParts.push(`BUILDING: ${this.buildingSystem.selectedType}`);
    }

    this.hudText.setText(statusParts.join('  |  '));

    // Update selection ring to follow moving entities
    if (this.selectedEntity && this.selectedEntityType === 'villager' && this.selectionRing?.visible) {
      const TILE_SIZE = TERRAIN_CONFIG.TILE_SIZE;
      this.selectionRing.setPosition(
        this.selectedEntity.x * TILE_SIZE + TILE_SIZE / 2,
        this.selectedEntity.y * TILE_SIZE + TILE_SIZE / 2
      );
      this.updateInfoPanel();
    }
  }

  /**
   * Create minimap in bottom-right corner
   */
  createMinimap() {
    const MINIMAP_SIZE = 200;
    const camera = this.cameras.main;
    const mx = camera.width - MINIMAP_SIZE - 10;
    const my = camera.height - MINIMAP_SIZE - 10;

    // Create a render texture for the minimap
    this.minimapRT = this.add.renderTexture(mx, my, MINIMAP_SIZE, MINIMAP_SIZE);
    this.minimapRT.setScrollFactor(0);
    this.minimapRT.setDepth(5010);
    this.minimapRT.setOrigin(0, 0);
    this.minimapTexture = this.minimapRT;

    // Border
    this.minimapBorder = this.add.graphics();
    this.minimapBorder.lineStyle(2, 0xFFFFFF, 0.8);
    this.minimapBorder.strokeRect(mx, my, MINIMAP_SIZE, MINIMAP_SIZE);
    this.minimapBorder.setScrollFactor(0);
    this.minimapBorder.setDepth(5011);

    // Viewport indicator
    this.minimapViewport = this.add.graphics();
    this.minimapViewport.setScrollFactor(0);
    this.minimapViewport.setDepth(5012);

    // Store minimap config
    this.minimapConfig = { x: mx, y: my, size: MINIMAP_SIZE };

    // Make minimap clickable to move camera
    this.minimapRT.setInteractive();
    this.minimapRT.on('pointerdown', (pointer) => {
      const localX = pointer.x - mx;
      const localY = pointer.y - my;
      const worldX = (localX / MINIMAP_SIZE) * this.worldWidth;
      const worldY = (localY / MINIMAP_SIZE) * this.worldHeight;
      this.cameras.main.centerOn(worldX, worldY);
    });

    // Initial render
    this.renderMinimap();
  }

  /**
   * Render minimap content (called every 2 seconds)
   */
  renderMinimap() {
    if (!this.minimapRT || !this.biomeMap) return;

    const MINIMAP_SIZE = this.minimapConfig.size;
    const TILE_SIZE = TERRAIN_CONFIG.TILE_SIZE;
    const scale = MINIMAP_SIZE / this.worldWidth;

    // Use a temp graphics to draw
    const g = this.make.graphics({ add: false });

    // Draw terrain at minimap scale (sample every Nth tile for performance)
    const step = Math.max(1, Math.floor(this.mapWidth / 100));
    for (let y = 0; y < this.mapHeight; y += step) {
      for (let x = 0; x < this.mapWidth; x += step) {
        const biome = this.biomeMap[y][x];
        g.fillStyle(biome.color, 1);
        const px = x * TILE_SIZE * scale;
        const py = y * TILE_SIZE * scale;
        const size = Math.max(1, step * TILE_SIZE * scale);
        g.fillRect(px, py, size, size);
      }
    }

    // Draw temple positions
    if (this.templeSystem) {
      for (const temple of this.templeSystem.temples) {
        const tx = temple.position.x * TILE_SIZE * scale;
        const ty = temple.position.y * TILE_SIZE * scale;
        const color = temple.playerColor || 0xFFD700;
        g.fillStyle(color, 1);
        g.fillRect(tx - 3, ty - 3, 6, 6);
      }
    }

    // Draw villager clusters (sample)
    if (this.villagerSystem) {
      for (let i = 0; i < this.villagerSystem.villagers.length; i += 3) {
        const v = this.villagerSystem.villagers[i];
        const vx = v.x * TILE_SIZE * scale;
        const vy = v.y * TILE_SIZE * scale;
        g.fillStyle(v.playerColor || 0xFF0000, 0.8);
        g.fillCircle(vx, vy, 1.5);
      }
    }

    this.minimapRT.clear();
    this.minimapRT.draw(g);
    g.destroy();
  }

  /**
   * Update minimap viewport indicator
   */
  updateMinimap() {
    if (!this.minimapViewport || !this.minimapConfig || !this.minimapVisible) return;

    const camera = this.cameras.main;
    const cfg = this.minimapConfig;
    const scale = cfg.size / this.worldWidth;

    // Viewport rectangle on minimap
    const vpX = cfg.x + camera.scrollX * scale;
    const vpY = cfg.y + camera.scrollY * scale;
    const vpW = (camera.width / camera.zoom) * scale;
    const vpH = (camera.height / camera.zoom) * scale;

    this.minimapViewport.clear();
    this.minimapViewport.lineStyle(1, 0xFFFFFF, 0.9);
    this.minimapViewport.strokeRect(vpX, vpY, vpW, vpH);

    // Periodic full minimap re-render (every 2 seconds)
    this.minimapUpdateTimer -= 16; // approximate
    if (this.minimapUpdateTimer <= 0) {
      this.minimapUpdateTimer = 2000;
      this.renderMinimap();
    }
  }

  /**
   * Create the info panel for entity details (bottom-right)
   */
  createInfoPanel() {
    const panelStyle = {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#FFFFFF',
      backgroundColor: 'rgba(0,0,0,0.7)',
      padding: { x: 12, y: 8 },
      wordWrap: { width: 280 },
    };

    this.infoPanelText = this.add.text(
      this.cameras.main.width - 300,
      60,
      '', panelStyle
    );
    this.infoPanelText.setScrollFactor(0);
    this.infoPanelText.setDepth(5000);
    this.infoPanelText.setVisible(false);

    // Selection highlight ring
    this.selectionRing = this.add.circle(0, 0, 16, 0xFFFFFF, 0);
    this.selectionRing.setStrokeStyle(2, 0xFFFFFF, 0.8);
    this.selectionRing.setDepth(200);
    this.selectionRing.setVisible(false);

    this.selectedEntity = null;
    this.selectedEntityType = null;
  }

  /**
   * Select the entity nearest to world coordinates
   */
  selectEntityAt(worldX, worldY) {
    const TILE_SIZE = TERRAIN_CONFIG.TILE_SIZE;
    const tileX = worldX / TILE_SIZE;
    const tileY = worldY / TILE_SIZE;
    const clickRadius = 5; // tiles

    let best = null;
    let bestDist = clickRadius;
    let bestType = null;

    // Check villagers
    if (this.villagerSystem) {
      for (const v of this.villagerSystem.villagers) {
        const dx = v.x - tileX;
        const dy = v.y - tileY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < bestDist) {
          best = v;
          bestDist = dist;
          bestType = 'villager';
        }
      }
    }

    // Check temples (larger click target)
    if (this.templeSystem) {
      for (const t of this.templeSystem.temples) {
        const dx = t.position.x - tileX;
        const dy = t.position.y - tileY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < Math.max(bestDist, 12)) {
          best = t;
          bestDist = dist;
          bestType = 'temple';
        }
      }
    }

    // Check buildings
    if (this.buildingSystem) {
      for (const b of this.buildingSystem.buildings) {
        const cx = b.tileX + b.size / 2;
        const cy = b.tileY + b.size / 2;
        const dx = cx - tileX;
        const dy = cy - tileY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < bestDist) {
          best = b;
          bestDist = dist;
          bestType = 'building';
        }
      }
    }

    if (best) {
      this.selectedEntity = best;
      this.selectedEntityType = bestType;
      this.showSelectionRing(best, bestType);
      this.updateInfoPanel();
    } else {
      // Clicked empty terrain - show biome info
      const itx = Math.floor(tileX);
      const ity = Math.floor(tileY);
      const biome = this.getBiomeAt(itx, ity);
      if (biome) {
        this.selectedEntity = { tileX: itx, tileY: ity, biome };
        this.selectedEntityType = 'terrain';
        this.hideSelectionRing();
        this.updateInfoPanel();
      } else {
        this.clearSelection();
      }
    }
  }

  /**
   * Show selection ring around entity
   */
  showSelectionRing(entity, type) {
    if (!this.selectionRing) return;
    const TILE_SIZE = TERRAIN_CONFIG.TILE_SIZE;

    let px, py, radius;
    if (type === 'villager') {
      px = entity.x * TILE_SIZE + TILE_SIZE / 2;
      py = entity.y * TILE_SIZE + TILE_SIZE / 2;
      radius = 14;
    } else if (type === 'temple') {
      px = entity.position.x * TILE_SIZE + TILE_SIZE / 2;
      py = entity.position.y * TILE_SIZE + TILE_SIZE / 2;
      radius = 50;
    } else if (type === 'building') {
      px = entity.tileX * TILE_SIZE + (entity.size * TILE_SIZE) / 2;
      py = entity.tileY * TILE_SIZE + (entity.size * TILE_SIZE) / 2;
      radius = entity.size * TILE_SIZE / 2 + 4;
    }

    this.selectionRing.setPosition(px, py);
    this.selectionRing.setRadius(radius);
    this.selectionRing.setVisible(true);
  }

  hideSelectionRing() {
    if (this.selectionRing) this.selectionRing.setVisible(false);
  }

  clearSelection() {
    this.selectedEntity = null;
    this.selectedEntityType = null;
    this.hideSelectionRing();
    if (this.infoPanelText) this.infoPanelText.setVisible(false);
  }

  /**
   * Update info panel text based on selected entity
   */
  updateInfoPanel() {
    if (!this.infoPanelText || !this.selectedEntity) return;

    const e = this.selectedEntity;
    const type = this.selectedEntityType;
    let lines = [];

    if (type === 'villager') {
      lines.push(`${e.name || 'Villager'} (#${e.id})`);
      lines.push(`State: ${e.state}`);
      lines.push(`Health: ${e.health}/${e.maxHealth}`);
      lines.push(`Position: (${Math.floor(e.x)}, ${Math.floor(e.y)})`);
      lines.push(`Speed: ${e.speed} (x${e.speedMultiplier.toFixed(1)})`);
      if (e.worshipTempleId) lines.push(`Worshipping: ${e.worshipTempleId}`);
    } else if (type === 'temple') {
      lines.push(`Temple: ${e.id}`);
      lines.push(`Level: ${e.level || 1}`);
      lines.push(`Position: (${e.position.x}, ${e.position.y})`);
      const pop = this.templeSystem.getPlayerVillagerCount(e.playerId);
      lines.push(`Villagers: ${pop}`);
      const upgradeCost = this.templeSystem.getUpgradeCost(e);
      if (upgradeCost !== null) {
        lines.push(`Upgrade: ${upgradeCost} belief [U]`);
      } else {
        lines.push('MAX LEVEL');
      }
    } else if (type === 'building') {
      const bType = BUILDING_TYPES[e.type];
      lines.push(`${bType.name}`);
      lines.push(`Type: ${e.type}`);
      lines.push(`Position: (${e.tileX}, ${e.tileY})`);
      if (e.type === 'farm') lines.push(`Food: +${bType.foodPerSecond}/sec`);
      if (e.type === 'house') lines.push(`Pop bonus: +${bType.popBonus}`);
    } else if (type === 'terrain') {
      lines.push(`Terrain`);
      lines.push(`Tile: (${e.tileX}, ${e.tileY})`);
      lines.push(`Biome: ${e.biome.name || 'Unknown'}`);
      lines.push(`Passable: ${e.biome.passable ? 'Yes' : 'No'}`);
    }

    this.infoPanelText.setText(lines.join('\n'));
    this.infoPanelText.setVisible(true);
  }

  /**
   * Get population cap for a player (temple base + house bonus)
   */
  getPopulationCap(player) {
    if (!player) return 0;
    const templeBase = this.templeSystem
      ? this.templeSystem.getPlayerTemples(player.id).reduce((sum, t) => sum + (t.level || 1) * 20, 0)
      : 20;
    const houseBonus = this.buildingSystem
      ? this.buildingSystem.getPopulationBonus(player.id)
      : 0;
    return templeBase + houseBonus;
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

  /**
   * Story 3: Toggle pause state
   */
  togglePause() {
    if (this.isPaused) {
      this.resumeGame();
    } else {
      this.pauseGame();
    }
  }

  /**
   * Story 3: Pause the game
   */
  pauseGame() {
    if (this.isPaused) return;

    this.isPaused = true;
    console.log('[MainScene] Game paused');

    // Create pause overlay
    this.createPauseOverlay();
  }

  /**
   * Story 3: Resume the game
   */
  resumeGame() {
    if (!this.isPaused) return;

    this.isPaused = false;
    console.log('[MainScene] Game resumed');

    // Remove pause overlay
    this.removePauseOverlay();
  }

  /**
   * Story 3: Create pause menu overlay
   */
  createPauseOverlay() {
    const { width, height } = this.cameras.main;

    // Semi-transparent black overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.8);
    overlay.fillRect(0, 0, width, height);
    overlay.setScrollFactor(0); // Fixed to camera
    overlay.setDepth(10000); // Above everything

    // Pause panel background
    const panelWidth = 500;
    const panelHeight = 600;
    const panelX = (width - panelWidth) / 2;
    const panelY = (height - panelHeight) / 2;

    const panel = this.add.graphics();
    panel.fillStyle(0x1a1a2e);
    panel.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 20);
    panel.lineStyle(4, 0x4a4a8e);
    panel.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 20);
    panel.setScrollFactor(0);
    panel.setDepth(10001);

    // "PAUSED" title
    const title = this.add.text(width / 2, panelY + 80, 'PAUSED', {
      fontFamily: 'Georgia, serif',
      fontSize: '64px',
      fontStyle: 'bold',
      color: '#FFD700',
      stroke: '#000000',
      strokeThickness: 6
    });
    title.setOrigin(0.5);
    title.setScrollFactor(0);
    title.setDepth(10002);

    // Buttons
    const buttonConfigs = [
      { text: 'RESUME', y: panelY + 180, action: () => this.resumeGame() },
      { text: 'SAVE GAME', y: panelY + 270, action: () => { SaveSystem.saveGame(this); this.resumeGame(); } },
      { text: 'RESTART', y: panelY + 360, action: () => this.restartGame() },
      { text: 'MAIN MENU', y: panelY + 450, action: () => this.returnToMainMenu() }
    ];

    const buttons = buttonConfigs.map((config) => {
      return this.createPauseButton(width / 2, config.y, config.text, config.action);
    });

    // Store overlay elements for cleanup
    this.pauseOverlay = {
      overlay,
      panel,
      title,
      buttons
    };
  }

  /**
   * Story 3: Create a pause menu button
   */
  createPauseButton(x, y, text, onClick) {
    const buttonWidth = 350;
    const buttonHeight = 70;

    // Button background
    const bg = this.add.graphics();
    const normalColor = 0x2a2a4e;
    const hoverColor = 0x3a3a6e;

    bg.fillStyle(normalColor);
    bg.fillRoundedRect(x - buttonWidth / 2, y - buttonHeight / 2, buttonWidth, buttonHeight, 12);
    bg.lineStyle(3, 0x4a4a8e);
    bg.strokeRoundedRect(x - buttonWidth / 2, y - buttonHeight / 2, buttonWidth, buttonHeight, 12);
    bg.setScrollFactor(0);
    bg.setDepth(10002);

    // Button text
    const textObj = this.add.text(x, y, text, {
      fontFamily: 'Georgia, serif',
      fontSize: '32px',
      fontStyle: 'bold',
      color: '#FFFFFF'
    });
    textObj.setOrigin(0.5);
    textObj.setScrollFactor(0);
    textObj.setDepth(10003);

    // Make interactive
    const hitArea = new Phaser.Geom.Rectangle(
      x - buttonWidth / 2,
      y - buttonHeight / 2,
      buttonWidth,
      buttonHeight
    );

    bg.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

    bg.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(hoverColor);
      bg.fillRoundedRect(x - buttonWidth / 2, y - buttonHeight / 2, buttonWidth, buttonHeight, 12);
      bg.lineStyle(4, 0xFFD700);
      bg.strokeRoundedRect(x - buttonWidth / 2, y - buttonHeight / 2, buttonWidth, buttonHeight, 12);
      textObj.setColor('#FFD700');
    });

    bg.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(normalColor);
      bg.fillRoundedRect(x - buttonWidth / 2, y - buttonHeight / 2, buttonWidth, buttonHeight, 12);
      bg.lineStyle(3, 0x4a4a8e);
      bg.strokeRoundedRect(x - buttonWidth / 2, y - buttonHeight / 2, buttonWidth, buttonHeight, 12);
      textObj.setColor('#FFFFFF');
    });

    bg.on('pointerdown', () => {
      onClick();
    });

    return { bg, text: textObj };
  }

  /**
   * Story 3: Remove pause overlay
   */
  removePauseOverlay() {
    if (!this.pauseOverlay) return;

    // Destroy overlay elements
    this.pauseOverlay.overlay.destroy();
    this.pauseOverlay.panel.destroy();
    this.pauseOverlay.title.destroy();

    this.pauseOverlay.buttons.forEach((button) => {
      button.bg.destroy();
      button.text.destroy();
    });

    this.pauseOverlay = null;
  }

  /**
   * Story 3: Restart the current game
   */
  restartGame() {
    console.log('[MainScene] Restarting game...');

    // Remove pause overlay first
    this.removePauseOverlay();
    this.isPaused = false;

    // Restart the scene (fresh start)
    this.scene.restart();
  }

  /**
   * Story 3: Return to main menu
   */
  returnToMainMenu() {
    console.log('[MainScene] Returning to main menu...');

    // Remove pause overlay
    this.removePauseOverlay();
    this.isPaused = false;

    // Transition to main menu with fade
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('MainMenuScene');
    });
  }
}
