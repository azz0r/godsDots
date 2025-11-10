/**
 * Layer 6: Belief System Tests
 *
 * Tests for villager belief generation, miracle witnessing, and conversion mechanics.
 */

import BeliefSystem, { BELIEF_CONSTANTS } from '../systems/BeliefSystem';

// Mock database service
const createMockDB = () => ({
  VillagerBelief: {
    where: jest.fn().mockReturnThis(),
    equals: jest.fn().mockReturnThis(),
    first: jest.fn(),
    add: jest.fn(),
    modify: jest.fn(),
    toArray: jest.fn(),
    and: jest.fn().mockReturnThis()
  },
  ConversionEvent: {
    add: jest.fn()
  }
});

// Mock scene
const createMockScene = () => ({
  events: {
    emit: jest.fn()
  }
});

describe('BeliefSystem', () => {
  let system;
  let mockDB;
  let mockScene;

  beforeEach(() => {
    mockDB = createMockDB();
    mockScene = createMockScene();
    system = new BeliefSystem(mockScene, mockDB);
  });

  afterEach(() => {
    system.destroy();
  });

  describe('initialization', () => {
    test('should initialize with empty belief cache', () => {
      expect(system.beliefCache.size).toBe(0);
    });

    test('should set update interval to 1000ms', () => {
      expect(system.updateInterval).toBe(1000);
    });
  });

  describe('calculateWorshipGeneration', () => {
    test('should return 0 for invalid inputs', () => {
      expect(system.calculateWorshipGeneration(null, null, null)).toBe(0);
      expect(system.calculateWorshipGeneration({id: 1}, null, 'p1')).toBe(0);
      expect(system.calculateWorshipGeneration({id: 1}, {level: 1}, null)).toBe(0);
    });

    test('should calculate worship at level 1 temple with 0% belief', () => {
      const villager = { id: 'v1' };
      const temple = { level: 1 };
      const playerId = 'p1';

      // Villager has 0% belief
      jest.spyOn(system, 'getBeliefStrength').mockReturnValue(0);

      const result = system.calculateWorshipGeneration(villager, temple, playerId);

      // 5 BP/min * 0.0 devotion * 1.2 temple = 0
      expect(result).toBe(0);
    });

    test('should calculate worship at level 1 temple with 50% belief', () => {
      const villager = { id: 'v1' };
      const temple = { level: 1 };
      const playerId = 'p1';

      jest.spyOn(system, 'getBeliefStrength').mockReturnValue(50);

      const result = system.calculateWorshipGeneration(villager, temple, playerId);

      // 5 BP/min * 0.5 devotion * 1.2 temple = 3.0
      expect(result).toBeCloseTo(3.0, 1);
    });

    test('should calculate worship at level 3 temple with 100% belief', () => {
      const villager = { id: 'v1' };
      const temple = { level: 3 };
      const playerId = 'p1';

      jest.spyOn(system, 'getBeliefStrength').mockReturnValue(100);

      const result = system.calculateWorshipGeneration(villager, temple, playerId);

      // 5 BP/min * 1.0 devotion * 1.6 temple = 8.0
      expect(result).toBeCloseTo(8.0, 1);
    });

    test('should scale with temple level correctly', () => {
      const villager = { id: 'v1' };
      const playerId = 'p1';

      jest.spyOn(system, 'getBeliefStrength').mockReturnValue(100);

      const level1 = system.calculateWorshipGeneration(villager, {level: 1}, playerId);
      const level2 = system.calculateWorshipGeneration(villager, {level: 2}, playerId);
      const level3 = system.calculateWorshipGeneration(villager, {level: 3}, playerId);

      expect(level2).toBeGreaterThan(level1);
      expect(level3).toBeGreaterThan(level2);
    });
  });

  describe('processWitnessEvent', () => {
    test('should return 0 if villager too far from miracle', () => {
      const villager = { id: 'v1', position: { x: 0, y: 0 } };
      const miracle = { type: 'heal', position: { x: 1000, y: 1000 }, power: 1.0 };
      const playerId = 'p1';

      const result = system.processWitnessEvent(villager, miracle, playerId);

      expect(result).toBe(0);
    });

    test('should generate belief for witnessing helpful miracle', () => {
      const villager = { id: 'v1', position: { x: 10, y: 10 } };
      const miracle = { type: 'heal', position: { x: 10, y: 10 }, power: 1.0 };
      const playerId = 'p1';

      jest.spyOn(system, 'addBelief').mockImplementation(() => {});
      jest.spyOn(system, 'logImpressionEvent').mockImplementation(() => {});

      const result = system.processWitnessEvent(villager, miracle, playerId);

      // Healing miracle at same position: 15 * 1.0 * 1.5 (helpful bonus) * 1.0 (power) = 22.5
      expect(result).toBeCloseTo(22.5, 1);
      expect(system.addBelief).toHaveBeenCalled();
      expect(system.logImpressionEvent).toHaveBeenCalled();
    });

    test('should apply distance decay to miracle witness', () => {
      const playerId = 'p1';
      jest.spyOn(system, 'addBelief').mockImplementation(() => {});
      jest.spyOn(system, 'logImpressionEvent').mockImplementation(() => {});

      // Miracle at epicenter
      const villagerNear = { id: 'v1', position: { x: 10, y: 10 } };
      const miracleNear = { type: 'heal', position: { x: 10, y: 10 }, power: 1.0 };
      const resultNear = system.processWitnessEvent(villagerNear, miracleNear, playerId);

      // Villager at edge of miracle radius
      const villagerFar = { id: 'v2', position: { x: 50, y: 10 } };
      const miracleFar = { type: 'heal', position: { x: 10, y: 10 }, power: 1.0 };
      const resultFar = system.processWitnessEvent(villagerFar, miracleFar, playerId);

      expect(resultNear).toBeGreaterThan(resultFar);
    });

    test('should apply lower bonus for harmful miracles', () => {
      const playerId = 'p1';
      jest.spyOn(system, 'addBelief').mockImplementation(() => {});
      jest.spyOn(system, 'logImpressionEvent').mockImplementation(() => {});

      const villager = { id: 'v1', position: { x: 10, y: 10 } };

      const healMiracle = { type: 'heal', position: { x: 10, y: 10 }, power: 1.0 };
      const lightningMiracle = { type: 'lightning', position: { x: 10, y: 10 }, power: 1.0 };

      const healResult = system.processWitnessEvent(villager, healMiracle, playerId);
      const lightningResult = system.processWitnessEvent(villager, lightningMiracle, playerId);

      expect(healResult).toBeGreaterThan(lightningResult);
    });

    test('should scale belief with miracle power', () => {
      const villager = { id: 'v1', position: { x: 10, y: 10 } };
      const playerId = 'p1';

      jest.spyOn(system, 'addBelief').mockImplementation(() => {});
      jest.spyOn(system, 'logImpressionEvent').mockImplementation(() => {});

      const weakMiracle = { type: 'heal', position: { x: 10, y: 10 }, power: 1.0 };
      const strongMiracle = { type: 'heal', position: { x: 10, y: 10 }, power: 2.0 };

      const weakResult = system.processWitnessEvent(villager, weakMiracle, playerId);
      const strongResult = system.processWitnessEvent(villager, strongMiracle, playerId);

      expect(strongResult).toBeCloseTo(weakResult * 2, 1);
    });
  });

  describe('getMiracleBeliefModifier', () => {
    test('should return positive bonus for helpful miracles', () => {
      expect(system.getMiracleBeliefModifier('heal')).toBe(BELIEF_CONSTANTS.POSITIVE_MIRACLE_BONUS);
      expect(system.getMiracleBeliefModifier('food')).toBe(BELIEF_CONSTANTS.POSITIVE_MIRACLE_BONUS);
      expect(system.getMiracleBeliefModifier('growth')).toBe(BELIEF_CONSTANTS.POSITIVE_MIRACLE_BONUS);
    });

    test('should return penalty for harmful miracles', () => {
      expect(system.getMiracleBeliefModifier('lightning')).toBe(BELIEF_CONSTANTS.DESTRUCTIVE_MIRACLE_PENALTY);
      expect(system.getMiracleBeliefModifier('storm')).toBe(BELIEF_CONSTANTS.DESTRUCTIVE_MIRACLE_PENALTY);
      expect(system.getMiracleBeliefModifier('curse')).toBe(BELIEF_CONSTANTS.DESTRUCTIVE_MIRACLE_PENALTY);
    });

    test('should return neutral modifier for unknown miracles', () => {
      expect(system.getMiracleBeliefModifier('unknown')).toBe(1.0);
    });
  });

  describe('calculateProximityInfluence', () => {
    test('should return 0 for no temples', () => {
      const villager = { id: 'v1', position: { x: 10, y: 10 } };
      const result = system.calculateProximityInfluence(villager, [], 'p1');
      expect(result).toBe(0);
    });

    test('should return high value for working at temple', () => {
      const villager = {
        id: 'v1',
        position: { x: 10, y: 10 },
        workplaceId: 't1'
      };
      const temples = [
        { id: 't1', playerId: 'p1', position: { x: 10, y: 10 } }
      ];

      const result = system.calculateProximityInfluence(villager, temples, 'p1');

      expect(result).toBe(BELIEF_CONSTANTS.WORKING_TEMPLE_RATE);
    });

    test('should return proximity value for living near temple', () => {
      const villager = {
        id: 'v1',
        position: { x: 20, y: 10 }
      };
      const temples = [
        { id: 't1', playerId: 'p1', position: { x: 10, y: 10 } }
      ];

      const result = system.calculateProximityInfluence(villager, temples, 'p1');

      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(BELIEF_CONSTANTS.TEMPLE_PASSIVE_RATE);
    });

    test('should not apply influence from rival player temples', () => {
      const villager = { id: 'v1', position: { x: 10, y: 10 } };
      const temples = [
        { id: 't1', playerId: 'p2', position: { x: 10, y: 10 } } // Different player
      ];

      const result = system.calculateProximityInfluence(villager, temples, 'p1');

      expect(result).toBe(0);
    });

    test('should not apply influence beyond temple radius', () => {
      const villager = { id: 'v1', position: { x: 200, y: 10 } };
      const temples = [
        { id: 't1', playerId: 'p1', position: { x: 10, y: 10 } }
      ];

      const result = system.calculateProximityInfluence(villager, temples, 'p1');

      expect(result).toBe(0);
    });
  });

  describe('applyBeliefDecay', () => {
    test('should apply normal decay for healthy villager', () => {
      const villager = {
        id: 'v1',
        health: 100,
        happiness: 80
      };

      jest.spyOn(system, 'addBelief').mockImplementation(() => {});

      system.applyBeliefDecay(villager, 'p1', 1); // 1 minute

      expect(system.addBelief).toHaveBeenCalledWith(
        'v1',
        'p1',
        -BELIEF_CONSTANTS.NEGLECT_DECAY_RATE,
        expect.objectContaining({ method: 'decay' })
      );
    });

    test('should apply high decay for starving villager', () => {
      const villager = {
        id: 'v1',
        health: 20,
        happiness: 80
      };

      jest.spyOn(system, 'addBelief').mockImplementation(() => {});

      system.applyBeliefDecay(villager, 'p1', 1); // 1 minute

      expect(system.addBelief).toHaveBeenCalledWith(
        'v1',
        'p1',
        -BELIEF_CONSTANTS.STARVATION_DECAY_RATE,
        expect.objectContaining({ reason: 'starvation' })
      );
    });

    test('should apply high decay for unhappy villager', () => {
      const villager = {
        id: 'v1',
        health: 100,
        happiness: 20
      };

      jest.spyOn(system, 'addBelief').mockImplementation(() => {});

      system.applyBeliefDecay(villager, 'p1', 1); // 1 minute

      expect(system.addBelief).toHaveBeenCalledWith(
        'v1',
        'p1',
        -BELIEF_CONSTANTS.STARVATION_DECAY_RATE,
        expect.objectContaining({ method: 'decay' })
      );
    });
  });

  describe('checkConversionThreshold', () => {
    test('should emit influenced event when crossing 20% threshold', () => {
      system.checkConversionThreshold('v1', 'p1', 25, 15);

      expect(mockScene.events.emit).toHaveBeenCalledWith(
        'villager_influenced',
        expect.objectContaining({ villagerId: 'v1', playerId: 'p1' })
      );
    });

    test('should emit conversion event when crossing 80% threshold', () => {
      jest.spyOn(system, 'logConversion').mockImplementation(() => {});

      system.checkConversionThreshold('v1', 'p1', 85, 75);

      expect(mockScene.events.emit).toHaveBeenCalledWith(
        'villager_converted',
        expect.objectContaining({ villagerId: 'v1', playerId: 'p1' })
      );
      expect(system.logConversion).toHaveBeenCalled();
    });

    test('should not emit events when not crossing thresholds', () => {
      system.checkConversionThreshold('v1', 'p1', 50, 45);

      expect(mockScene.events.emit).not.toHaveBeenCalled();
    });
  });

  describe('belief cache management', () => {
    test('should update cache when belief added', () => {
      system.updateCache('v1', 'p1', 50);

      expect(system.beliefCache.has('v1')).toBe(true);
      expect(system.beliefCache.get('v1')['p1'].strength).toBe(50);
    });

    test('should retrieve belief from cache', () => {
      system.updateCache('v1', 'p1', 75);

      const strength = system.getBeliefStrength('v1', 'p1');

      expect(strength).toBe(75);
    });

    test('should return 0 for uncached belief', () => {
      const strength = system.getBeliefStrength('v999', 'p999');

      expect(strength).toBe(0);
    });
  });

  describe('distance calculation', () => {
    test('should calculate distance between two positions', () => {
      const pos1 = { x: 0, y: 0 };
      const pos2 = { x: 3, y: 4 };

      const distance = system.calculateDistance(pos1, pos2);

      expect(distance).toBe(5); // 3-4-5 triangle
    });

    test('should return 0 for same position', () => {
      const pos = { x: 10, y: 20 };

      const distance = system.calculateDistance(pos, pos);

      expect(distance).toBe(0);
    });
  });

  describe('cleanup', () => {
    test('should clear cache on destroy', () => {
      system.updateCache('v1', 'p1', 50);
      expect(system.beliefCache.size).toBeGreaterThan(0);

      system.destroy();

      expect(system.beliefCache.size).toBe(0);
    });
  });
});
