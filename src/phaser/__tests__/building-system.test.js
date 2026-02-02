/**
 * Building System Tests
 */

import BuildingSystem, { BUILDING_TYPES } from '../systems/BuildingSystem';
import { BIOME_TYPES } from '../config/terrainConfig';

function createMockScene() {
  return {
    add: {
      rectangle: jest.fn().mockReturnValue({
        setDepth: jest.fn(),
        setStrokeStyle: jest.fn(),
        setFillStyle: jest.fn(),
        setPosition: jest.fn(),
        destroy: jest.fn(),
      }),
      circle: jest.fn().mockReturnValue({
        setDepth: jest.fn(),
        destroy: jest.fn(),
      }),
    },
    input: {
      mousePointer: { x: 0, y: 0 },
    },
    cameras: {
      main: { zoom: 1, scrollX: 0, scrollY: 0 },
    },
    biomeMap: [
      [BIOME_TYPES.GRASSLAND, BIOME_TYPES.GRASSLAND, BIOME_TYPES.GRASSLAND, BIOME_TYPES.GRASSLAND],
      [BIOME_TYPES.GRASSLAND, BIOME_TYPES.GRASSLAND, BIOME_TYPES.GRASSLAND, BIOME_TYPES.GRASSLAND],
      [BIOME_TYPES.GRASSLAND, BIOME_TYPES.GRASSLAND, BIOME_TYPES.DEEP_OCEAN, BIOME_TYPES.DEEP_OCEAN],
      [BIOME_TYPES.GRASSLAND, BIOME_TYPES.GRASSLAND, BIOME_TYPES.DEEP_OCEAN, BIOME_TYPES.DEEP_OCEAN],
    ],
  };
}

function createMockPlayerSystem() {
  const human = { id: 'player_1', beliefPoints: 500 };
  return {
    getHumanPlayer: () => human,
    spendBeliefPoints: jest.fn((id, cost) => {
      if (human.beliefPoints >= cost) {
        human.beliefPoints -= cost;
        return true;
      }
      return false;
    }),
    _human: human,
  };
}

describe('BuildingSystem', () => {
  test('should initialize empty', () => {
    const system = new BuildingSystem(createMockScene());
    expect(system.buildings).toEqual([]);
    expect(system.placementMode).toBe(false);
  });

  test('should have three building types', () => {
    expect(Object.keys(BUILDING_TYPES)).toEqual(['farm', 'house', 'wall']);
  });

  test('should enter placement mode', () => {
    const system = new BuildingSystem(createMockScene());
    system.playerSystem = createMockPlayerSystem();

    const result = system.startPlacement('farm');
    expect(result).toBe(true);
    expect(system.placementMode).toBe(true);
    expect(system.selectedType).toBe('farm');
  });

  test('should reject placement with insufficient belief', () => {
    const system = new BuildingSystem(createMockScene());
    const ps = createMockPlayerSystem();
    ps._human.beliefPoints = 5;
    system.playerSystem = ps;

    const result = system.startPlacement('farm');
    expect(result).toBe(false);
  });

  test('should cancel placement', () => {
    const system = new BuildingSystem(createMockScene());
    system.playerSystem = createMockPlayerSystem();
    system.startPlacement('farm');
    system.cancelPlacement();
    expect(system.placementMode).toBe(false);
    expect(system.selectedType).toBeNull();
  });

  test('should check placement validity on passable terrain', () => {
    const system = new BuildingSystem(createMockScene());
    expect(system.canPlace(0, 0, 2)).toBe(true); // Grassland 2x2
  });

  test('should reject placement on impassable terrain', () => {
    const system = new BuildingSystem(createMockScene());
    expect(system.canPlace(2, 2, 2)).toBe(false); // Deep ocean
  });

  test('should reject placement on occupied tiles', () => {
    const system = new BuildingSystem(createMockScene());
    system.occupiedTiles.add('0,0');
    expect(system.canPlace(0, 0, 1)).toBe(false);
  });

  test('should create building and mark tiles', () => {
    const system = new BuildingSystem(createMockScene());
    system.playerSystem = createMockPlayerSystem();

    const building = system.createBuilding('farm', 0, 0);
    expect(building).toBeDefined();
    expect(building.type).toBe('farm');
    expect(system.buildings.length).toBe(1);
    expect(system.occupiedTiles.has('0,0')).toBe(true);
    expect(system.occupiedTiles.has('1,1')).toBe(true); // 2x2
  });

  test('should remove building and free tiles', () => {
    const system = new BuildingSystem(createMockScene());
    system.playerSystem = createMockPlayerSystem();

    const building = system.createBuilding('farm', 0, 0);
    system.removeBuilding(building.id);
    expect(system.buildings.length).toBe(0);
    expect(system.occupiedTiles.has('0,0')).toBe(false);
  });

  test('should calculate population bonus from houses', () => {
    const system = new BuildingSystem(createMockScene());
    system.playerSystem = createMockPlayerSystem();

    system.createBuilding('house', 0, 0);
    system.createBuilding('farm', 2, 0);

    expect(system.getPopulationBonus('player_1')).toBe(5);
  });

  test('should calculate food production from farms', () => {
    const system = new BuildingSystem(createMockScene());
    system.playerSystem = createMockPlayerSystem();

    system.createBuilding('farm', 0, 0);
    system.createBuilding('farm', 2, 0);
    system.createBuilding('house', 0, 2);

    expect(system.getFoodProduction('player_1')).toBe(4); // 2 farms * 2 food/sec
  });

  test('should prevent overlapping buildings', () => {
    const system = new BuildingSystem(createMockScene());
    system.playerSystem = createMockPlayerSystem();

    system.createBuilding('farm', 0, 0); // Occupies 0,0 to 1,1
    expect(system.canPlace(1, 0, 2)).toBe(false); // Overlaps at 1,0
  });
});
