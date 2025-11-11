/**
 * Layer 6: Game Initialization System
 *
 * Handles game startup: spawning players, temples, initial villagers.
 */

import { PLAYER_COLORS } from './PlayerSystem';

export default class GameInitializer {
  /**
   * Initialize a new game
   * @param {Phaser.Scene} scene - The Phaser scene
   * @param {Object} systems - Game systems {playerSystem, villagerSystem, templeSystem, etc.}
   * @param {Object} config - Game configuration
   */
  static initializeGame(scene, systems, config = {}) {
    console.log('[GameInitializer] ========== GAME START ==========');

    const {
      playerSystem,
      villagerSystem,
      templeSystem,
      pathfindingSystem
    } = systems;

    const {
      mapWidth = 250,
      mapHeight = 250,
      villagersPerPlayer = 3
    } = config;

    // Find suitable spawn locations for players
    const spawnLocations = this.findSpawnLocations(scene, mapWidth, mapHeight, 2);

    if (spawnLocations.length < 2) {
      console.error('[GameInitializer] Could not find suitable spawn locations!');
      return null;
    }

    // Create human player
    const humanPlayer = playerSystem.createPlayer({
      id: 'player_human',
      type: 'human',
      name: 'Divine Being',
      color: PLAYER_COLORS.HUMAN,
      spawnPosition: spawnLocations[0],
      beliefPoints: 100
    });

    // Create AI opponent
    const aiPlayer = playerSystem.createPlayer({
      id: 'player_ai_1',
      type: 'ai',
      name: 'Rival God',
      color: PLAYER_COLORS.AI_1,
      spawnPosition: spawnLocations[1],
      beliefPoints: 100
    });

    console.log(`[GameInitializer] Human spawn: (${spawnLocations[0].x}, ${spawnLocations[0].y})`);
    console.log(`[GameInitializer] AI spawn: (${spawnLocations[1].x}, ${spawnLocations[1].y})`);

    // Spawn temples for each player
    const humanTemple = this.spawnTemple(scene, humanPlayer, spawnLocations[0]);
    const aiTemple = this.spawnTemple(scene, aiPlayer, spawnLocations[1]);

    playerSystem.addTemple(humanPlayer.id, humanTemple);
    playerSystem.addTemple(aiPlayer.id, aiTemple);

    // Add temples to temple system for rendering
    if (templeSystem) {
      templeSystem.addTemple(humanTemple);
      templeSystem.addTemple(aiTemple);
      console.log(`[GameInitializer] Added ${templeSystem.getCount()} temples to TempleSystem`);
    }

    // CENTER CAMERA ON HUMAN TEMPLE SO YOU CAN ACTUALLY SEE IT
    if (scene.cameras && scene.cameras.main) {
      const camera = scene.cameras.main;
      const TILE_SIZE = 4;
      const humanTemplePixelX = humanTemple.position.x * TILE_SIZE;
      const humanTemplePixelY = humanTemple.position.y * TILE_SIZE;

      camera.centerOn(humanTemplePixelX, humanTemplePixelY);
      camera.setZoom(2); // Zoom in so temple is clearly visible

      console.log(`[GameInitializer] ✓ Camera centered on human temple at pixel (${humanTemplePixelX}, ${humanTemplePixelY}), zoom: 2x`);
      console.log(`[GameInitializer] AI temple at pixel (${aiTemple.position.x * TILE_SIZE}, ${aiTemple.position.y * TILE_SIZE})`);
    }

    // Spawn initial villagers for each player
    this.spawnInitialVillagers(
      scene,
      humanPlayer,
      spawnLocations[0],
      villagersPerPlayer,
      playerSystem,
      villagerSystem
    );

    this.spawnInitialVillagers(
      scene,
      aiPlayer,
      spawnLocations[1],
      villagersPerPlayer,
      playerSystem,
      villagerSystem
    );

    console.log('[GameInitializer] Game initialized successfully');
    console.log(`[GameInitializer] - Human: ${humanPlayer.population} villagers`);
    console.log(`[GameInitializer] - AI: ${aiPlayer.population} villagers`);

    return {
      humanPlayer,
      aiPlayer,
      temples: [humanTemple, aiTemple]
    };
  }

  /**
   * Find suitable spawn locations for players
   * @param {Phaser.Scene} scene - The Phaser scene
   * @param {number} mapWidth - Map width in tiles
   * @param {number} mapHeight - Map height in tiles
   * @param {number} playerCount - Number of players
   * @returns {Array} Array of {x, y} spawn positions
   */
  static findSpawnLocations(scene, mapWidth, mapHeight, playerCount) {
    const locations = [];
    const minDistance = Math.min(mapWidth, mapHeight) / 3; // Players must be at least 1/3 map apart

    // Define potential spawn zones (corners and center areas)
    const zones = [
      { x: mapWidth * 0.25, y: mapHeight * 0.25 }, // Top-left
      { x: mapWidth * 0.75, y: mapHeight * 0.75 }, // Bottom-right
      { x: mapWidth * 0.25, y: mapHeight * 0.75 }, // Bottom-left
      { x: mapWidth * 0.75, y: mapHeight * 0.25 }, // Top-right
    ];

    for (const zone of zones) {
      if (locations.length >= playerCount) {
        break;
      }

      // Search for passable land near this zone
      const spawn = this.findNearbyPassableTile(scene, zone.x, zone.y, 50);

      if (spawn) {
        // Check distance from other spawns
        const tooClose = locations.some(loc => {
          const dx = loc.x - spawn.x;
          const dy = loc.y - spawn.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          return distance < minDistance;
        });

        if (!tooClose) {
          locations.push(spawn);
        }
      }
    }

    return locations;
  }

  /**
   * Find a passable tile near a position
   * @param {Phaser.Scene} scene - The Phaser scene
   * @param {number} centerX - Center X position
   * @param {number} centerY - Center Y position
   * @param {number} searchRadius - Search radius in tiles
   * @returns {Object|null} {x, y} or null
   */
  static findNearbyPassableTile(scene, centerX, centerY, searchRadius) {
    const biomeMap = scene.biomeMap;
    if (!biomeMap) {
      return null;
    }

    // Spiral search from center
    for (let r = 0; r < searchRadius; r++) {
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
        const x = Math.floor(centerX + Math.cos(angle) * r);
        const y = Math.floor(centerY + Math.sin(angle) * r);

        if (x >= 0 && x < biomeMap[0].length && y >= 0 && y < biomeMap.length) {
          const biome = biomeMap[y][x];
          if (biome && biome.passable) {
            return { x, y };
          }
        }
      }
    }

    return null;
  }

  /**
   * Spawn a temple for a player
   * @param {Phaser.Scene} scene - The Phaser scene
   * @param {Object} player - Player entity
   * @param {Object} position - {x, y} position
   * @returns {Object} Temple entity
   */
  static spawnTemple(scene, player, position) {
    const temple = {
      id: `temple_${player.id}`,
      type: 'temple',
      playerId: player.id,
      playerColor: player.color, // Add player color for rendering
      position: position,
      level: 1,
      health: 100,
      isUnderConstruction: false
    };

    console.log(`[GameInitializer] Spawned temple for ${player.name} at (${position.x}, ${position.y})`);

    return temple;
  }

  /**
   * Spawn initial villagers for a player
   * @param {Phaser.Scene} scene - The Phaser scene
   * @param {Object} player - Player entity
   * @param {Object} spawnCenter - {x, y} center position
   * @param {number} count - Number of villagers to spawn
   * @param {Object} playerSystem - Player system
   * @param {Object} villagerSystem - Villager system
   */
  static spawnInitialVillagers(scene, player, spawnCenter, count, playerSystem, villagerSystem) {
    const spawnRadius = 10; // Spawn within 10 tiles of center

    for (let i = 0; i < count; i++) {
      // Find a random passable position near spawn center
      const spawnPos = this.findNearbyPassableTile(
        scene,
        spawnCenter.x + (Math.random() - 0.5) * spawnRadius,
        spawnCenter.y + (Math.random() - 0.5) * spawnRadius,
        15
      );

      if (spawnPos) {
        const villager = villagerSystem.spawnVillager(spawnPos.x, spawnPos.y);
        playerSystem.addVillager(player.id, villager);
      } else {
        console.warn(`[GameInitializer] Could not find spawn position for villager ${i + 1}`);
      }
    }

    console.log(`[GameInitializer] Spawned ${player.population} villagers for ${player.name}`);
  }

  /**
   * Display game start message
   * @param {Phaser.Scene} scene - The Phaser scene
   */
  static showGameStartMessage(scene) {
    console.log('[GameInitializer] ========== GAME STARTED ==========');
    console.log('[GameInitializer] Objective: Convert all villagers to your belief');
    console.log('[GameInitializer] Controls:');
    console.log('[GameInitializer] - Drag to pan camera');
    console.log('[GameInitializer] - Mouse wheel to zoom');
    console.log('[GameInitializer] - Double-click to zoom to location');

    // Emit event for UI to display message
    scene.events.emit('game_started');
  }

  /**
   * Display game end message
   * @param {Phaser.Scene} scene - The Phaser scene
   * @param {Object} result - {winner, reason}
   */
  static showGameEndMessage(scene, result) {
    if (!result.winner) {
      console.log('[GameInitializer] ========== GAME DRAW ==========');
      console.log('[GameInitializer] No players remaining!');
    } else if (result.winner.type === 'human') {
      console.log('[GameInitializer] ========== VICTORY ==========');
      console.log(`[GameInitializer] You have won! Reason: ${result.reason}`);
    } else {
      console.log('[GameInitializer] ========== DEFEAT ==========');
      console.log(`[GameInitializer] ${result.winner.name} has won! Reason: ${result.reason}`);
    }

    // Emit event for UI
    scene.events.emit('game_ended', result);
  }
}
