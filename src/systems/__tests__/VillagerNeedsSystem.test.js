import { VillagerNeedsSystem } from '../VillagerNeedsSystem.js'

describe('VillagerNeedsSystem', () => {
  let system
  let villager
  let environment

  beforeEach(() => {
    system = new VillagerNeedsSystem()
    
    // Create a test villager
    villager = {
      id: 'villager1',
      x: 100,
      y: 100,
      state: 'idle',
      happiness: 50,
      health: 100
    }
    
    // Initialize villager needs
    system.initializeVillagerNeeds(villager)
    
    // Default environment
    environment = {
      nearbyVillagers: [],
      activeMiracle: false,
      festival: false
    }
  })

  describe('initializeVillager', () => {
    test('should create a new villager with all required properties', () => {
      const newVillager = system.initializeVillager()
      
      expect(newVillager).toHaveProperty('needs')
      expect(newVillager.needs).toHaveProperty('hunger')
      expect(newVillager.needs).toHaveProperty('rest')
      expect(newVillager.needs).toHaveProperty('faith')
      expect(newVillager.needs).toHaveProperty('social')
      expect(newVillager).toHaveProperty('needPriority', null)
      expect(newVillager).toHaveProperty('seeking', null)
      expect(newVillager).toHaveProperty('moodModifier', 1.0)
      expect(newVillager).toHaveProperty('mood', 'content')
      expect(newVillager).toHaveProperty('happiness', 75)
      expect(newVillager).toHaveProperty('health', 100)
      expect(newVillager).toHaveProperty('energy', 80)
      expect(newVillager).toHaveProperty('conversionResistance', 1.0)
    })
  })

  describe('updateVillagerNeeds', () => {
    test('should initialize needs if not present', () => {
      const uninitializedVillager = { x: 50, y: 50 }
      
      system.updateVillagerNeeds(uninitializedVillager, 1000, environment)
      
      expect(uninitializedVillager.needs).toBeDefined()
      expect(uninitializedVillager.mood).toBeDefined()
    })

    test('should decay needs over time', () => {
      const initialHunger = villager.needs.hunger
      const initialRest = villager.needs.rest
      
      system.updateVillagerNeeds(villager, 1000, environment) // 1 second
      
      expect(villager.needs.hunger).toBeLessThan(initialHunger)
      expect(villager.needs.rest).toBeLessThan(initialRest)
    })

    test('should handle undefined environment gracefully', () => {
      expect(() => {
        system.updateVillagerNeeds(villager, 1000, undefined)
      }).not.toThrow()
    })

    test('should handle environment with no nearbyVillagers', () => {
      const emptyEnvironment = {
        activeMiracle: false,
        festival: false
      }
      
      expect(() => {
        system.updateVillagerNeeds(villager, 1000, emptyEnvironment)
      }).not.toThrow()
    })
  })

  describe('checkPassiveSatisfaction', () => {
    test('should increase social need when near other villagers', () => {
      const initialSocial = villager.needs.social
      
      environment.nearbyVillagers = [
        { id: 'villager2', x: 110, y: 110 },
        { id: 'villager3', x: 120, y: 120 }
      ]
      
      system.checkPassiveSatisfaction(villager, environment)
      
      expect(villager.needs.social).toBeGreaterThan(initialSocial)
    })

    test('should increase faith during active miracle', () => {
      const initialFaith = villager.needs.faith
      
      environment.activeMiracle = true
      
      system.checkPassiveSatisfaction(villager, environment)
      
      expect(villager.needs.faith).toBeGreaterThan(initialFaith)
    })

    test('should handle undefined environment', () => {
      expect(() => {
        system.checkPassiveSatisfaction(villager, undefined)
      }).not.toThrow()
    })
  })

  describe('need decay', () => {
    test('should decay hunger faster when working', () => {
      const idleVillager = { ...villager, state: 'idle' }
      const workingVillager = { ...villager, state: 'working' }
      
      system.initializeVillagerNeeds(idleVillager)
      system.initializeVillagerNeeds(workingVillager)
      
      // Set same initial hunger
      idleVillager.needs.hunger = 80
      workingVillager.needs.hunger = 80
      
      system.decayNeeds(idleVillager, 1000)
      system.decayNeeds(workingVillager, 1000)
      
      expect(workingVillager.needs.hunger).toBeLessThan(idleVillager.needs.hunger)
    })

    test('should decay rest faster when fleeing', () => {
      const idleVillager = { ...villager, state: 'idle' }
      const fleeingVillager = { ...villager, state: 'fleeing' }
      
      system.initializeVillagerNeeds(idleVillager)
      system.initializeVillagerNeeds(fleeingVillager)
      
      // Set same initial rest
      idleVillager.needs.rest = 80
      fleeingVillager.needs.rest = 80
      
      system.decayNeeds(idleVillager, 1000)
      system.decayNeeds(fleeingVillager, 1000)
      
      expect(fleeingVillager.needs.rest).toBeLessThan(idleVillager.needs.rest)
    })
  })

  describe('critical conditions', () => {
    test('should damage health when starving', () => {
      villager.needs.hunger = 0
      const initialHealth = villager.health
      
      system.checkCriticalConditions(villager)
      
      expect(villager.health).toBeLessThan(initialHealth)
    })

    test('should collapse when exhausted', () => {
      villager.needs.rest = 0
      
      system.checkCriticalConditions(villager)
      
      expect(villager.state).toBe('collapsed')
      expect(villager.immobilized).toBe(true)
      expect(villager.collapseTimer).toBe(300)
    })

    test('should reduce conversion resistance when faith is low', () => {
      villager.needs.faith = 3 // Below conversion threshold
      
      system.checkCriticalConditions(villager)
      
      expect(villager.conversionResistance).toBe(0.2)
    })

    test('should cause depression when social need is very low', () => {
      villager.needs.social = 5 // Below depression threshold
      villager.workSpeed = 1.0
      
      system.checkCriticalConditions(villager)
      
      expect(villager.depressed).toBe(true)
      expect(villager.workSpeed).toBe(0.5)
    })
  })

  describe('getNeedsSatisfaction', () => {
    test('should calculate overall satisfaction correctly', () => {
      const villager = {
        needs: {
          hunger: 100, // Max
          rest: 100,   // Max
          faith: 100,  // Max
          social: 100  // Max
        }
      }
      
      const satisfaction = system.getNeedsSatisfaction(villager)
      expect(satisfaction).toBe(1.0)
    })

    test('should handle low needs', () => {
      const villager = {
        needs: {
          hunger: 0,
          rest: 0,
          faith: 0,
          social: 0
        }
      }
      
      const satisfaction = system.getNeedsSatisfaction(villager)
      expect(satisfaction).toBe(0)
    })

    test('should handle average needs', () => {
      const villager = {
        needs: {
          hunger: 50,
          rest: 50,
          faith: 50,
          social: 50
        }
      }
      
      const satisfaction = system.getNeedsSatisfaction(villager)
      expect(satisfaction).toBe(0.5)
    })

    test('should handle null villager', () => {
      const satisfaction = system.getNeedsSatisfaction(null)
      expect(satisfaction).toBe(0)
    })

    test('should handle villager without needs', () => {
      const satisfaction = system.getNeedsSatisfaction({})
      expect(satisfaction).toBe(0)
    })
  })

  describe('mood effects', () => {
    test('should increase happiness when all needs are satisfied', () => {
      villager.needs = {
        hunger: 85,
        rest: 90,
        faith: 75,
        social: 65
      }
      const initialHappiness = villager.happiness
      
      system.updateMoodFromNeeds(villager)
      
      expect(villager.happiness).toBeGreaterThan(initialHappiness)
      expect(villager.moodModifier).toBeGreaterThan(1.0)
    })

    test('should decrease happiness with critical needs', () => {
      villager.needs = {
        hunger: 10, // Critical
        rest: 10,   // Critical
        faith: 50,
        social: 50
      }
      const initialHappiness = villager.happiness
      
      system.updateMoodFromNeeds(villager)
      
      expect(villager.happiness).toBeLessThan(initialHappiness)
      expect(villager.moodModifier).toBeLessThan(1.0)
    })
  })
})