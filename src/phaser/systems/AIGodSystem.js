/**
 * AI God System
 *
 * Simple AI opponent that manages its own territory.
 * Behaviors: passive belief income, building farms/houses, expanding.
 */

import { BUILDING_TYPES } from './BuildingSystem';
import { TERRAIN_CONFIG } from '../config/terrainConfig';

const AI_DECISION_INTERVAL = 5000; // Decide every 5 seconds
const AI_PASSIVE_BELIEF_PER_SEC = 2; // Passive belief income
const AI_BUILD_CHANCE = 0.4; // 40% chance to build when deciding
const AI_UPGRADE_CHANCE = 0.2; // 20% chance to upgrade temple

export default class AIGodSystem {
  constructor(scene) {
    this.scene = scene;
    this.decisionTimer = AI_DECISION_INTERVAL;

    // References set by MainScene
    this.playerSystem = null;
    this.buildingSystem = null;
    this.templeSystem = null;
  }

  update(delta) {
    if (!this.playerSystem) return;

    const aiPlayers = this.playerSystem.getAIPlayers();

    for (const ai of aiPlayers) {
      if (!ai.isActive || ai.isEliminated) continue;

      // Passive belief income
      const beliefThisFrame = (AI_PASSIVE_BELIEF_PER_SEC * delta) / 1000;
      this.playerSystem.addBeliefPoints(ai.id, beliefThisFrame);

      // Passive food income (AI doesn't starve)
      this.playerSystem.addFood(ai.id, (1 * delta) / 1000);
    }

    // Periodic decision making
    this.decisionTimer -= delta;
    if (this.decisionTimer <= 0) {
      this.decisionTimer = AI_DECISION_INTERVAL;

      for (const ai of aiPlayers) {
        if (!ai.isActive || ai.isEliminated) continue;
        this.makeDecision(ai);
      }
    }
  }

  makeDecision(ai) {
    const belief = ai.beliefPoints;

    // Priority 1: Upgrade temple if affordable
    if (Math.random() < AI_UPGRADE_CHANCE && this.templeSystem) {
      const temples = this.templeSystem.getPlayerTemples(ai.id);
      for (const temple of temples) {
        const cost = this.templeSystem.getUpgradeCost(temple);
        if (cost && belief >= cost) {
          this.templeSystem.upgradeTemple(temple.id);
          return;
        }
      }
    }

    // Priority 2: Build something
    if (Math.random() < AI_BUILD_CHANCE && this.buildingSystem && this.templeSystem) {
      const aiBuildings = this.buildingSystem.getPlayerBuildings(ai.id);
      const farmCount = aiBuildings.filter(b => b.type === 'farm').length;
      const houseCount = aiBuildings.filter(b => b.type === 'house').length;

      // Decide what to build
      let buildType = null;
      if (farmCount < 3 && belief >= BUILDING_TYPES.farm.cost) {
        buildType = 'farm';
      } else if (houseCount < 3 && belief >= BUILDING_TYPES.house.cost) {
        buildType = 'house';
      } else if (farmCount < 6 && belief >= BUILDING_TYPES.farm.cost) {
        buildType = 'farm';
      }

      if (buildType) {
        this.aiBuild(ai, buildType);
      }
    }
  }

  /**
   * AI builds a structure near its temple
   */
  aiBuild(ai, typeId) {
    if (!this.templeSystem || !this.buildingSystem) return;

    const temples = this.templeSystem.getPlayerTemples(ai.id);
    if (temples.length === 0) return;

    const temple = temples[0];
    const type = BUILDING_TYPES[typeId];
    const biomeMap = this.scene.biomeMap;
    if (!biomeMap) return;

    // Search for valid placement near temple
    const searchRadius = 30;
    for (let attempt = 0; attempt < 20; attempt++) {
      const ox = Math.floor((Math.random() - 0.5) * searchRadius * 2);
      const oy = Math.floor((Math.random() - 0.5) * searchRadius * 2);
      const tx = temple.position.x + ox;
      const ty = temple.position.y + oy;

      if (this.buildingSystem.canPlace(tx, ty, type.size, ai.id)) {
        // Spend belief manually for AI
        if (this.playerSystem.spendBeliefPoints(ai.id, type.cost)) {
          const building = this.buildingSystem.createBuilding(typeId, tx, ty);
          if (building) {
            building.playerId = ai.id;
          }
          return;
        }
      }
    }
  }

  destroy() {
    this.playerSystem = null;
    this.buildingSystem = null;
    this.templeSystem = null;
  }
}
