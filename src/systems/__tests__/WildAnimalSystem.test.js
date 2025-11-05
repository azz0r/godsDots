/**
 * Wild Animal System Tests
 * Animals that roam the world and can attack villagers
 */

import { WildAnimalSystem } from '../WildAnimalSystem'
import { WorldClock } from '../WorldClock'

describe('WildAnimalSystem', () => {
  let animalSystem
  let clock

  beforeEach(() => {
    clock = new WorldClock()
    animalSystem = new WildAnimalSystem(clock)
  })

  describe('Initialization', () => {
    test('should initialize with empty animals array', () => {
      expect(animalSystem.animals).toEqual([])
    })

    test('should have predefined animal types', () => {
      const types = animalSystem.getAnimalTypes()
      expect(types).toContain('wolf')
      expect(types).toContain('bear')
      expect(types).toContain('boar')
    })

    test('should have configuration for each animal type', () => {
      const wolfConfig = animalSystem.getAnimalConfig('wolf')
      expect(wolfConfig).toBeDefined()
      expect(wolfConfig.speed).toBeGreaterThan(0)
      expect(wolfConfig.damage).toBeGreaterThan(0)
    })
  })

  describe('Animal Spawning', () => {
    test('should spawn animal at location', () => {
      const animal = animalSystem.spawnAnimal('wolf', 100, 100)

      expect(animal).toBeDefined()
      expect(animal.type).toBe('wolf')
      expect(animal.x).toBe(100)
      expect(animal.y).toBe(100)
      expect(animal.health).toBeGreaterThan(0)
    })

    test('should add spawned animal to animals array', () => {
      animalSystem.spawnAnimal('wolf', 100, 100)
      expect(animalSystem.animals.length).toBe(1)
    })

    test('should assign unique ID to each animal', () => {
      const animal1 = animalSystem.spawnAnimal('wolf', 100, 100)
      const animal2 = animalSystem.spawnAnimal('bear', 200, 200)

      expect(animal1.id).not.toBe(animal2.id)
    })

    test('should initialize animal state', () => {
      const animal = animalSystem.spawnAnimal('wolf', 100, 100)

      expect(animal.state).toBe('wandering')
      expect(animal.vx).toBe(0)
      expect(animal.vy).toBe(0)
      expect(animal.target).toBeNull()
    })
  })

  describe('Animal Behavior - Wandering', () => {
    test('should move animals randomly when wandering', () => {
      const animal = animalSystem.spawnAnimal('wolf', 100, 100)
      const initialX = animal.x
      const initialY = animal.y

      animalSystem.update([], 1000)

      // Position should change (or have velocity)
      const moved = animal.x !== initialX || animal.y !== initialY || animal.vx !== 0 || animal.vy !== 0
      expect(moved).toBe(true)
    })

    test('should keep animals within world bounds', () => {
      const animal = animalSystem.spawnAnimal('wolf', 10, 10)
      animal.vx = -20 // Try to move out of bounds
      animal.vy = -20

      const worldSize = { width: 1000, height: 1000 }
      animalSystem.update([], 100, worldSize)

      expect(animal.x).toBeGreaterThanOrEqual(0)
      expect(animal.y).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Animal Behavior - Hunting', () => {
    test('should detect nearby villagers', () => {
      const animal = animalSystem.spawnAnimal('wolf', 100, 100)
      const villagers = [
        { id: 'v1', x: 120, y: 120, health: 100 },
        { id: 'v2', x: 500, y: 500, health: 100 }
      ]

      const nearbyVillagers = animalSystem.findNearbyVillagers(animal, villagers)

      expect(nearbyVillagers.length).toBe(1)
      expect(nearbyVillagers[0].id).toBe('v1')
    })

    test('should chase nearby villagers if predator', () => {
      const wolf = animalSystem.spawnAnimal('wolf', 100, 100)
      const villagers = [{ id: 'v1', x: 150, y: 150, health: 100 }]

      animalSystem.update(villagers, 100)

      expect(wolf.state).toBe('hunting')
      expect(wolf.target).toBeDefined()
    })

    test('should NOT chase villagers if passive animal', () => {
      const deer = animalSystem.spawnAnimal('deer', 100, 100)
      const villagers = [{ id: 'v1', x: 120, y: 120, health: 100 }]

      animalSystem.update(villagers, 100)

      expect(deer.state).not.toBe('hunting')
    })

    test('should move towards target when hunting', () => {
      const wolf = animalSystem.spawnAnimal('wolf', 100, 100)
      wolf.state = 'hunting'
      wolf.target = { x: 200, y: 200 }

      animalSystem.updateHunting(wolf, 1000)

      // Should have velocity towards target
      expect(wolf.vx).toBeGreaterThan(0)
      expect(wolf.vy).toBeGreaterThan(0)
    })
  })

  describe('Animal Behavior - Attacking', () => {
    test('should attack villager when in range', () => {
      const wolf = animalSystem.spawnAnimal('wolf', 100, 100)
      const villager = { id: 'v1', x: 105, y: 105, health: 100 }

      animalSystem.tryAttack(wolf, villager)

      expect(villager.health).toBeLessThan(100)
    })

    test('should respect attack cooldown', () => {
      const wolf = animalSystem.spawnAnimal('wolf', 100, 100)
      const villager = { id: 'v1', x: 105, y: 105, health: 100 }

      animalSystem.tryAttack(wolf, villager)
      const firstHealth = villager.health

      // Immediate second attack should not work
      animalSystem.tryAttack(wolf, villager)

      expect(villager.health).toBe(firstHealth)
    })

    test('should set villager to fleeing state when attacked', () => {
      const wolf = animalSystem.spawnAnimal('wolf', 100, 100)
      const villager = { id: 'v1', x: 105, y: 105, health: 100, state: 'idle' }

      animalSystem.tryAttack(wolf, villager)

      expect(villager.state).toBe('fleeing')
    })
  })

  describe('Animal Behavior - Fleeing', () => {
    test('should flee when health is low', () => {
      const wolf = animalSystem.spawnAnimal('wolf', 100, 100)
      wolf.health = 15 // Low health

      animalSystem.updateAnimalState(wolf, [])

      expect(wolf.state).toBe('fleeing')
    })

    test('should move away from threats when fleeing', () => {
      const wolf = animalSystem.spawnAnimal('wolf', 100, 100)
      wolf.state = 'fleeing'
      wolf.fleeingFrom = { x: 120, y: 120 }

      animalSystem.updateFleeing(wolf, 1000)

      // Should have velocity away from threat
      expect(wolf.vx).toBeLessThan(0)
      expect(wolf.vy).toBeLessThan(0)
    })
  })

  describe('Animal Health and Death', () => {
    test('should remove dead animals', () => {
      const wolf = animalSystem.spawnAnimal('wolf', 100, 100)
      wolf.health = 0

      animalSystem.update([], 100)

      expect(animalSystem.animals.length).toBe(0)
    })

    test('should create death effect for dead animals', () => {
      const callback = jest.fn()
      animalSystem.onAnimalDeath(callback)

      const wolf = animalSystem.spawnAnimal('wolf', 100, 100)
      wolf.health = 0

      animalSystem.update([], 100)

      expect(callback).toHaveBeenCalledWith(wolf)
    })
  })

  describe('Nocturnal Behavior', () => {
    test('should increase predator aggression at night', () => {
      clock.setTime(23, 0) // Night
      const wolf = animalSystem.spawnAnimal('wolf', 100, 100)

      const aggressionDay = animalSystem.getAggressionModifier(wolf, 12)
      const aggressionNight = animalSystem.getAggressionModifier(wolf, 23)

      expect(aggressionNight).toBeGreaterThan(aggressionDay)
    })

    test('should have nocturnal animals more active at night', () => {
      clock.setTime(23, 0) // Night
      const bat = animalSystem.spawnAnimal('bat', 100, 100)

      expect(animalSystem.isActive(bat)).toBe(true)
    })

    test('should have diurnal animals less active at night', () => {
      clock.setTime(23, 0) // Night
      const deer = animalSystem.spawnAnimal('deer', 100, 100)

      expect(animalSystem.isActive(deer)).toBe(false)
    })
  })

  describe('Pack Behavior', () => {
    test('should identify pack animals', () => {
      const wolf = animalSystem.spawnAnimal('wolf', 100, 100)
      expect(animalSystem.isPackAnimal('wolf')).toBe(true)
    })

    test('should find nearby pack members', () => {
      const wolf1 = animalSystem.spawnAnimal('wolf', 100, 100)
      const wolf2 = animalSystem.spawnAnimal('wolf', 120, 120)
      animalSystem.spawnAnimal('bear', 150, 150)

      const pack = animalSystem.findPackMembers(wolf1)

      expect(pack.length).toBe(1)
      expect(pack[0].id).toBe(wolf2.id)
    })

    test('should coordinate attacks with pack', () => {
      const wolf1 = animalSystem.spawnAnimal('wolf', 100, 100)
      const wolf2 = animalSystem.spawnAnimal('wolf', 110, 110)
      const villager = { id: 'v1', x: 150, y: 150, health: 100 }

      wolf1.target = villager
      wolf1.state = 'hunting'

      animalSystem.coordinatePackHunting(wolf1, [wolf2])

      // Wolf2 should join the hunt
      expect(wolf2.target).toBe(villager)
      expect(wolf2.state).toBe('hunting')
    })
  })

  describe('Animal Population Management', () => {
    test('should limit max animals per type', () => {
      // Spawn max wolves
      for (let i = 0; i < 20; i++) {
        animalSystem.spawnAnimal('wolf', Math.random() * 1000, Math.random() * 1000)
      }

      const wolves = animalSystem.getAnimalsByType('wolf')
      expect(wolves.length).toBeLessThanOrEqual(animalSystem.config.maxPerType.wolf)
    })

    test('should get animals by type', () => {
      animalSystem.spawnAnimal('wolf', 100, 100)
      animalSystem.spawnAnimal('wolf', 200, 200)
      animalSystem.spawnAnimal('bear', 300, 300)

      const wolves = animalSystem.getAnimalsByType('wolf')
      const bears = animalSystem.getAnimalsByType('bear')

      expect(wolves.length).toBe(2)
      expect(bears.length).toBe(1)
    })

    test('should count total animals', () => {
      animalSystem.spawnAnimal('wolf', 100, 100)
      animalSystem.spawnAnimal('bear', 200, 200)

      expect(animalSystem.getAnimalCount()).toBe(2)
    })
  })
})
