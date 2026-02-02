/**
 * Divine Power System Tests
 */

import DivinePowerSystem from '../systems/DivinePowerSystem';

function createMockScene() {
  return {
    add: {
      circle: jest.fn().mockReturnValue({
        setDepth: jest.fn(),
        setStrokeStyle: jest.fn(),
        setPosition: jest.fn(),
        setRadius: jest.fn(),
        destroy: jest.fn(),
        radius: 0,
      }),
    },
    input: {
      mousePointer: { x: 0, y: 0 },
    },
    cameras: {
      main: { zoom: 1, scrollX: 0, scrollY: 0 },
    },
    tweens: {
      add: jest.fn(),
    },
    time: {
      delayedCall: jest.fn(),
    },
    events: {
      emit: jest.fn(),
    },
  };
}

function createMockPlayerSystem() {
  const human = {
    id: 'player_1',
    beliefPoints: 500,
  };

  return {
    getHumanPlayer: () => human,
    spendBeliefPoints: jest.fn((playerId, cost) => {
      if (human.beliefPoints >= cost) {
        human.beliefPoints -= cost;
        return true;
      }
      return false;
    }),
    addBeliefPoints: jest.fn((playerId, amount) => {
      human.beliefPoints += amount;
    }),
    _human: human,
  };
}

describe('DivinePowerSystem', () => {
  test('should initialize with no selected power', () => {
    const system = new DivinePowerSystem(createMockScene());
    expect(system.selectedPower).toBeNull();
  });

  test('should select a valid power', () => {
    const system = new DivinePowerSystem(createMockScene());
    system.playerSystem = createMockPlayerSystem();

    const result = system.selectPower('heal');
    expect(result).toBe(true);
    expect(system.selectedPower).toBe('heal');
  });

  test('should reject invalid power', () => {
    const system = new DivinePowerSystem(createMockScene());
    const result = system.selectPower('invalid');
    expect(result).toBe(false);
    expect(system.selectedPower).toBeNull();
  });

  test('should cancel selected power', () => {
    const system = new DivinePowerSystem(createMockScene());
    system.playerSystem = createMockPlayerSystem();
    system.selectPower('heal');
    system.cancelPower();
    expect(system.selectedPower).toBeNull();
  });

  test('should reject power on cooldown', () => {
    const system = new DivinePowerSystem(createMockScene());
    system.playerSystem = createMockPlayerSystem();
    system.cooldowns.heal = 5000;

    const result = system.selectPower('heal');
    expect(result).toBe(false);
  });

  test('should reject power when insufficient belief', () => {
    const system = new DivinePowerSystem(createMockScene());
    const playerSystem = createMockPlayerSystem();
    playerSystem._human.beliefPoints = 5; // Not enough for heal (20)
    system.playerSystem = playerSystem;

    const result = system.selectPower('heal');
    expect(result).toBe(false);
  });

  test('should cast power and start cooldown', () => {
    const scene = createMockScene();
    const system = new DivinePowerSystem(scene);
    const playerSystem = createMockPlayerSystem();
    system.playerSystem = playerSystem;
    system.villagerSystem = { villagers: [] };

    system.selectPower('heal');
    const result = system.castAtWorld(100, 100);

    expect(result).toBe(true);
    expect(system.selectedPower).toBeNull();
    expect(system.cooldowns.heal).toBeGreaterThan(0);
    expect(playerSystem.spendBeliefPoints).toHaveBeenCalledWith('player_1', 20);
    expect(scene.events.emit).toHaveBeenCalledWith('powerCast', expect.any(Object));
  });

  test('should tick cooldowns', () => {
    const system = new DivinePowerSystem(createMockScene());
    system.cooldowns.heal = 5000;

    system.update(2000);
    expect(system.cooldowns.heal).toBe(3000);

    system.update(4000);
    expect(system.cooldowns.heal).toBe(0);
  });

  test('should return power info', () => {
    const system = new DivinePowerSystem(createMockScene());
    system.cooldowns.heal = 3000;

    const info = system.getPowerInfo('heal');
    expect(info.name).toBe('Heal');
    expect(info.cost).toBe(20);
    expect(info.isOnCooldown).toBe(true);
    expect(info.cooldownRemaining).toBe(3000);
  });

  test('should return all power infos', () => {
    const system = new DivinePowerSystem(createMockScene());
    const infos = system.getAllPowerInfo();
    expect(infos.length).toBe(3);
    expect(infos.map(i => i.id)).toEqual(['heal', 'storm', 'food']);
  });
});
