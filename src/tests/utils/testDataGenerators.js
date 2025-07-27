/**
 * Test data generators for consistent and predictable test data
 */

export class TestDataGenerator {
  constructor(seed = 12345) {
    this.seed = seed;
    this.currentSeed = seed;
  }

  // Simple pseudo-random number generator for consistent results
  random() {
    const x = Math.sin(this.currentSeed++) * 10000;
    return x - Math.floor(x);
  }

  randomInt(min, max) {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  randomFloat(min, max) {
    return this.random() * (max - min) + min;
  }

  randomChoice(array) {
    return array[this.randomInt(0, array.length - 1)];
  }

  // Game entity generators
  generateVillager(overrides = {}) {
    return {
      id: this.currentSeed++,
      x: this.randomFloat(0, 1000),
      y: this.randomFloat(0, 1000),
      vx: 0,
      vy: 0,
      health: 100,
      hunger: this.randomInt(50, 100),
      happiness: this.randomInt(50, 100),
      age: this.randomInt(18, 60),
      profession: this.randomChoice(['farmer', 'builder', 'gatherer', 'idle']),
      home: null,
      workplace: null,
      carrying: null,
      state: 'idle',
      target: null,
      pathfinding: {
        targetNode: null,
        currentPath: null
      },
      ...overrides
    };
  }

  generateBuilding(type, overrides = {}) {
    const buildingSpecs = {
      house: { width: 30, height: 30, maxWorkers: 0, residents: 4 },
      temple: { width: 60, height: 60, maxWorkers: 5, residents: 0 },
      workshop: { width: 40, height: 40, maxWorkers: 3, residents: 0 },
      market: { width: 50, height: 50, maxWorkers: 4, residents: 0 },
      storage: { width: 35, height: 35, maxWorkers: 2, residents: 0 },
      outpost: { width: 25, height: 25, maxWorkers: 1, residents: 0 }
    };

    const spec = buildingSpecs[type] || buildingSpecs.house;

    return {
      id: this.currentSeed++,
      type,
      x: this.randomFloat(100, 900),
      y: this.randomFloat(100, 900),
      width: spec.width,
      height: spec.height,
      health: 100,
      level: 1,
      workers: 0,
      maxWorkers: spec.maxWorkers,
      residents: spec.residents,
      constructionTime: 0,
      isUnderConstruction: false,
      ownerId: null,
      ...overrides
    };
  }

  generateResource(type, overrides = {}) {
    const resourceTypes = {
      tree: { amount: 100, regenerates: true, regenerateRate: 0.1 },
      stone: { amount: 500, regenerates: false, regenerateRate: 0 },
      ironOre: { amount: 300, regenerates: false, regenerateRate: 0 },
      goldOre: { amount: 200, regenerates: false, regenerateRate: 0 },
      berryBush: { amount: 50, regenerates: true, regenerateRate: 0.5 },
      wheat: { amount: 80, regenerates: true, regenerateRate: 0.3 },
      fish: { amount: 150, regenerates: true, regenerateRate: 0.2 },
      clay: { amount: 250, regenerates: false, regenerateRate: 0 }
    };

    const spec = resourceTypes[type] || resourceTypes.tree;

    return {
      id: this.currentSeed++,
      type,
      x: this.randomFloat(0, 1000),
      y: this.randomFloat(0, 1000),
      amount: spec.amount,
      maxAmount: spec.amount,
      regenerates: spec.regenerates,
      regenerateRate: spec.regenerateRate,
      depleted: false,
      ...overrides
    };
  }

  generateTerrain(width, height) {
    const terrain = [];
    const terrainTypes = ['grass', 'water', 'sand', 'forest', 'hills', 'mountains'];
    
    for (let y = 0; y < height; y++) {
      terrain[y] = [];
      for (let x = 0; x < width; x++) {
        const type = this.randomChoice(terrainTypes);
        terrain[y][x] = {
          type,
          elevation: this.randomFloat(0, 1),
          moisture: this.randomFloat(0, 1),
          temperature: this.randomFloat(0, 1),
          walkable: type !== 'water' && type !== 'mountains',
          buildable: type === 'grass' || type === 'sand',
          hasRiver: false
        };
      }
    }
    
    return terrain;
  }

  generateGameState(overrides = {}) {
    const villagerCount = overrides.villagerCount || 10;
    const buildingCount = overrides.buildingCount || 5;
    const resourceCount = overrides.resourceCount || 20;

    const gameState = {
      gameId: 1,
      levelId: 1,
      beliefPoints: 1000,
      population: villagerCount,
      gameTime: 0,
      isPaused: false,
      selectedPower: null,
      humanPlayerId: 'player1',
      villagers: [],
      buildings: [],
      resources: [],
      terrain: this.generateTerrain(50, 50),
      ...overrides
    };

    // Always add a temple first
    gameState.buildings.push(
      this.generateBuilding('temple', {
        x: 500,
        y: 500,
        id: 0
      })
    );

    // Generate villagers
    for (let i = 0; i < villagerCount; i++) {
      gameState.villagers.push(this.generateVillager());
    }

    // Generate buildings
    for (let i = 1; i < buildingCount; i++) {
      const type = this.randomChoice(['house', 'workshop', 'market', 'storage']);
      gameState.buildings.push(this.generateBuilding(type));
    }

    // Generate resources
    for (let i = 0; i < resourceCount; i++) {
      const type = this.randomChoice(['tree', 'stone', 'berryBush', 'wheat']);
      gameState.resources.push(this.generateResource(type));
    }

    return gameState;
  }

  generateLandPlot(overrides = {}) {
    return {
      id: `${this.randomInt(0, 10)}_${this.randomInt(0, 10)}`,
      x: this.randomFloat(0, 1000),
      y: this.randomFloat(0, 1000),
      width: 40,
      height: 40,
      type: this.randomChoice(['buildable', 'water', 'forest', 'road']),
      owner: null,
      ownerId: null,
      building: null,
      buildingId: null,
      developmentLevel: 0,
      locked: false,
      ...overrides
    };
  }

  generatePathfindingScenario() {
    // Create a grid with obstacles
    const grid = [];
    const width = 20;
    const height = 20;
    
    for (let y = 0; y < height; y++) {
      grid[y] = [];
      for (let x = 0; x < width; x++) {
        grid[y][x] = {
          x,
          y,
          walkable: this.random() > 0.2, // 20% obstacles
          cost: this.randomChoice([1, 1, 1, 2, 3]) // Varying terrain costs
        };
      }
    }
    
    // Ensure start and end are walkable
    grid[0][0].walkable = true;
    grid[height-1][width-1].walkable = true;
    
    return {
      grid,
      start: { x: 0, y: 0 },
      end: { x: width - 1, y: height - 1 }
    };
  }

  // Batch generators for performance testing
  generateManyVillagers(count) {
    const villagers = [];
    for (let i = 0; i < count; i++) {
      villagers.push(this.generateVillager({ id: i }));
    }
    return villagers;
  }

  generateManyBuildings(count, types = ['house', 'workshop', 'market']) {
    const buildings = [];
    for (let i = 0; i < count; i++) {
      const type = types[i % types.length];
      buildings.push(this.generateBuilding(type, { id: i }));
    }
    return buildings;
  }

  generateManyResources(count) {
    const resources = [];
    const types = ['tree', 'stone', 'berryBush', 'wheat', 'ironOre'];
    for (let i = 0; i < count; i++) {
      const type = types[i % types.length];
      resources.push(this.generateResource(type, { id: i }));
    }
    return resources;
  }

  // Scenario generators for integration testing
  generateVillageScenario() {
    const temple = this.generateBuilding('temple', {
      x: 500,
      y: 500,
      id: 0
    });

    const houses = [];
    const angle = (Math.PI * 2) / 8;
    for (let i = 0; i < 8; i++) {
      const distance = 150;
      const x = 500 + Math.cos(angle * i) * distance;
      const y = 500 + Math.sin(angle * i) * distance;
      houses.push(this.generateBuilding('house', { x, y, id: i + 1 }));
    }

    const villagers = this.generateManyVillagers(20);
    // Assign homes to villagers
    villagers.forEach((villager, i) => {
      if (i < houses.length * 3) {
        villager.home = houses[Math.floor(i / 3)].id;
      }
    });

    const resources = [];
    // Place resources around village
    for (let i = 0; i < 30; i++) {
      const angle = (Math.PI * 2 * i) / 30;
      const distance = 200 + this.randomFloat(0, 100);
      const x = 500 + Math.cos(angle) * distance;
      const y = 500 + Math.sin(angle) * distance;
      const type = this.randomChoice(['tree', 'stone', 'berryBush']);
      resources.push(this.generateResource(type, { x, y, id: i + 100 }));
    }

    return {
      buildings: [temple, ...houses],
      villagers,
      resources
    };
  }

  reset() {
    this.currentSeed = this.seed;
  }
}

// Singleton instance for consistent test data across tests
export const testDataGenerator = new TestDataGenerator();

// Utility functions for common test scenarios
export function createMockTerrainSystem(walkable = true) {
  return {
    getTerrainAt: jest.fn((x, y) => ({
      type: 'grass',
      walkable,
      elevation: 0.5,
      moisture: 0.5,
      temperature: 0.5
    })),
    isWalkable: jest.fn(() => walkable),
    grid: testDataGenerator.generateTerrain(50, 50),
    spawnPoints: [
      { x: 250, y: 250 },
      { x: 750, y: 250 },
      { x: 250, y: 750 },
      { x: 750, y: 750 }
    ]
  };
}

export function createMockGameContext() {
  return {
    landManager: {
      getPlotAt: jest.fn(() => null),
      initializeGrid: jest.fn(),
      claimPlot: jest.fn(),
      plots: new Map()
    },
    pathfindingGrid: {
      updateBuilding: jest.fn(),
      updateAllBuildings: jest.fn(),
      findPath: jest.fn(() => [])
    },
    mapGenerator: {
      generate: jest.fn(() => ({
        terrain: testDataGenerator.generateTerrain(50, 50),
        resources: [],
        spawnPoints: []
      }))
    },
    debugMode: false,
    gameState: 'playing'
  };
}