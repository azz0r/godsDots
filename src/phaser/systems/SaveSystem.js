/**
 * Save/Load System
 *
 * Saves game state to localStorage. Stores terrain seed (not full map),
 * temple positions/levels, building positions/types, villager positions/states,
 * and resources (belief, food, day).
 */

const SAVE_KEY = 'godDotsSave';
const AUTOSAVE_KEY = 'godDotsAutoSave';

export default class SaveSystem {
  /**
   * Save current game state
   */
  static saveGame(scene, isAutoSave = false) {
    const state = SaveSystem.serializeState(scene);
    if (!state) return false;

    const key = isAutoSave ? AUTOSAVE_KEY : SAVE_KEY;
    try {
      localStorage.setItem(key, JSON.stringify(state));
      console.log(`[SaveSystem] Game ${isAutoSave ? 'auto-' : ''}saved`);
      return true;
    } catch (e) {
      console.error('[SaveSystem] Save failed:', e);
      return false;
    }
  }

  /**
   * Load game state
   */
  static loadGame(isAutoSave = false) {
    const key = isAutoSave ? AUTOSAVE_KEY : SAVE_KEY;
    try {
      const data = localStorage.getItem(key);
      if (!data) return null;
      return JSON.parse(data);
    } catch (e) {
      console.error('[SaveSystem] Load failed:', e);
      return null;
    }
  }

  /**
   * Check if a save exists
   */
  static hasSave() {
    return localStorage.getItem(SAVE_KEY) !== null ||
           localStorage.getItem(AUTOSAVE_KEY) !== null;
  }

  /**
   * Serialize the full game state
   */
  static serializeState(scene) {
    if (!scene) return null;

    const state = {
      version: 1,
      timestamp: Date.now(),
      terrainSeed: scene.terrainSeed,
      gameSpeed: scene.gameSpeed,
    };

    // Game clock
    if (scene.gameClock) {
      state.clock = {
        day: scene.gameClock.getDay(),
        timeMs: scene.gameClock.timeMs,
      };
    }

    // Players
    if (scene.playerSystem) {
      state.players = scene.playerSystem.players.map(p => ({
        id: p.id,
        type: p.type,
        name: p.name,
        color: p.color,
        beliefPoints: p.beliefPoints,
        food: p.food,
        population: p.population,
        isActive: p.isActive,
        isEliminated: p.isEliminated,
      }));
    }

    // Temples
    if (scene.templeSystem) {
      state.temples = scene.templeSystem.temples.map(t => ({
        id: t.id,
        playerId: t.playerId,
        playerColor: t.playerColor,
        positionX: t.position.x,
        positionY: t.position.y,
        level: t.level || 1,
      }));
    }

    // Buildings
    if (scene.buildingSystem) {
      state.buildings = scene.buildingSystem.buildings.map(b => ({
        type: b.type,
        tileX: b.tileX,
        tileY: b.tileY,
        playerId: b.playerId,
      }));
    }

    // Villagers (compact format)
    if (scene.villagerSystem) {
      state.villagers = scene.villagerSystem.villagers.map(v => ({
        x: Math.round(v.x * 10) / 10,
        y: Math.round(v.y * 10) / 10,
        playerId: v.playerId,
        state: v.state,
        health: v.health,
        name: v.name,
      }));
    }

    return state;
  }

  /**
   * Restore game state to a scene (called after terrain is generated)
   */
  static restoreState(scene, state) {
    if (!state || state.version !== 1) return false;

    // Restore clock
    if (state.clock && scene.gameClock) {
      scene.gameClock.day = state.clock.day;
      scene.gameClock.timeMs = state.clock.timeMs;
    }

    // Restore game speed
    if (state.gameSpeed) {
      scene.gameSpeed = state.gameSpeed;
    }

    // Restore players
    if (state.players && scene.playerSystem) {
      for (const pData of state.players) {
        const player = scene.playerSystem.getPlayer(pData.id);
        if (player) {
          player.beliefPoints = pData.beliefPoints;
          player.food = pData.food || 50;
          player.isActive = pData.isActive;
          player.isEliminated = pData.isEliminated;
        }
      }
    }

    // Restore temple levels
    if (state.temples && scene.templeSystem) {
      for (const tData of state.temples) {
        const temple = scene.templeSystem.getTemple(tData.id);
        if (temple && tData.level > 1) {
          // Upgrade temple to saved level
          for (let l = 1; l < tData.level; l++) {
            temple.level = l + 1;
          }
        }
      }
    }

    // Restore buildings
    if (state.buildings && scene.buildingSystem) {
      for (const bData of state.buildings) {
        const building = scene.buildingSystem.createBuilding(bData.type, bData.tileX, bData.tileY);
        if (building) {
          building.playerId = bData.playerId;
        }
      }
    }

    // Restore villager health and state
    if (state.villagers && scene.villagerSystem) {
      const villagers = scene.villagerSystem.villagers;
      for (let i = 0; i < Math.min(state.villagers.length, villagers.length); i++) {
        const vData = state.villagers[i];
        const villager = villagers[i];
        if (villager && vData) {
          villager.health = vData.health || 100;
          villager.name = vData.name || villager.name;
        }
      }
    }

    console.log('[SaveSystem] Game state restored');
    return true;
  }
}
