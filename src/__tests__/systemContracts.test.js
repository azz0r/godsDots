/**
 * System Contract Tests
 * Verify that systems expose expected methods and handle parameters correctly
 */

import { VillagerNeedsSystem } from '../systems/VillagerNeedsSystem.js'
import { WorshipSystem } from '../systems/WorshipSystem.js'
import { MiracleSystem } from '../systems/MiracleSystem.js'
import { ImpressivenessSystem } from '../systems/ImpressivenessSystem.js'
import { PreacherSystem } from '../systems/PreacherSystem.js'
import { DayNightSystem } from '../systems/DayNightSystem.js'
import { ProfessionSystem } from '../systems/ProfessionSystem.js'
import { BuildingUpgradeSystem } from '../systems/BuildingUpgradeSystem.js'

describe('System Contracts', () => {
  describe('VillagerNeedsSystem', () => {
    let system
    
    beforeEach(() => {
      system = new VillagerNeedsSystem()
    })
    
    test('should expose all required methods', () => {
      // Methods called by useGameEngine
      expect(typeof system.initializeVillager).toBe('function')
      expect(typeof system.initializeVillagerNeeds).toBe('function')
      expect(typeof system.updateVillagerNeeds).toBe('function')
      expect(typeof system.getNeedsSatisfaction).toBe('function')
      expect(typeof system.getVillagerNeedStatus).toBe('function')
      
      // Internal methods
      expect(typeof system.decayNeeds).toBe('function')
      expect(typeof system.checkNeedSatisfaction).toBe('function')
      expect(typeof system.checkPassiveSatisfaction).toBe('function')
      expect(typeof system.updateNeedPriority).toBe('function')
      expect(typeof system.updateMoodFromNeeds).toBe('function')
      expect(typeof system.checkCriticalConditions).toBe('function')
    })
    
    test('updateVillagerNeeds should handle all parameter variations', () => {
      // Null villager
      expect(() => system.updateVillagerNeeds(null, 16, {})).not.toThrow()
      
      // Undefined environment
      expect(() => system.updateVillagerNeeds({}, 16, undefined)).not.toThrow()
      
      // Missing environment properties
      expect(() => system.updateVillagerNeeds({}, 16, {})).not.toThrow()
      
      // Valid parameters
      const villager = { id: 'v1' }
      const environment = {
        nearbyVillagers: [],
        activeMiracle: false,
        festival: false
      }
      expect(() => system.updateVillagerNeeds(villager, 16, environment)).not.toThrow()
      
      // Verify needs were initialized
      expect(villager.needs).toBeDefined()
    })
    
    test('getNeedsSatisfaction should return correct range', () => {
      // Null villager
      expect(system.getNeedsSatisfaction(null)).toBe(0)
      
      // Villager without needs
      expect(system.getNeedsSatisfaction({})).toBe(0)
      
      // Full satisfaction
      const fullVillager = {
        needs: { hunger: 100, rest: 100, faith: 100, social: 100 }
      }
      expect(system.getNeedsSatisfaction(fullVillager)).toBe(1)
      
      // No satisfaction
      const emptyVillager = {
        needs: { hunger: 0, rest: 0, faith: 0, social: 0 }
      }
      expect(system.getNeedsSatisfaction(emptyVillager)).toBe(0)
      
      // Partial satisfaction
      const partialVillager = {
        needs: { hunger: 50, rest: 50, faith: 50, social: 50 }
      }
      const partial = system.getNeedsSatisfaction(partialVillager)
      expect(partial).toBeGreaterThan(0)
      expect(partial).toBeLessThan(1)
    })
  })
  
  describe('WorshipSystem', () => {
    let system
    
    beforeEach(() => {
      system = new WorshipSystem()
    })
    
    test('should expose required methods', () => {
      expect(typeof system.updateWorship).toBe('function')
      expect(typeof system.updateTempleCharges).toBe('function')
      expect(typeof system.updateActivePrayers).toBe('function')
      expect(typeof system.generatePrayerPower).toBe('function')
    })
    
    test('updateWorship should validate array parameters', () => {
      // Should throw with non-array players
      expect(() => {
        system.updateWorship({ id: 'player1' }, [], 16)
      }).toThrow()
      
      // Should throw with non-array temples
      expect(() => {
        system.updateWorship([], { id: 'temple1' }, 16)
      }).toThrow()
      
      // Should work with valid arrays
      const players = [{ 
        id: 'player1', 
        buildings: [], 
        villagers: [],
        worshipLevel: 1
      }]
      const temples = []
      expect(() => {
        system.updateWorship(players, temples, 16)
      }).not.toThrow()
    })
    
    test('should handle empty arrays gracefully', () => {
      expect(() => {
        system.updateWorship([], [], 16)
      }).not.toThrow()
    })
  })
  
  describe('MiracleSystem', () => {
    let system
    
    beforeEach(() => {
      system = new MiracleSystem()
    })
    
    test('should expose required methods', () => {
      // Methods called by useGameEngine
      expect(typeof system.hasActiveMiracle).toBe('function')
      expect(typeof system.startCasting).toBe('function')
      expect(typeof system.addGesturePoint).toBe('function')
      expect(typeof system.completeCasting).toBe('function')
      expect(typeof system.update).toBe('function')
      expect(typeof system.canCastMiracle).toBe('function')
      expect(typeof system.castMiracle).toBe('function')
    })
    
    test('hasActiveMiracle should handle all inputs', () => {
      // Should not throw with any input
      expect(() => system.hasActiveMiracle(null, null)).not.toThrow()
      expect(() => system.hasActiveMiracle(undefined, undefined)).not.toThrow()
      expect(() => system.hasActiveMiracle(100, 100)).not.toThrow()
      
      // Should return boolean
      expect(typeof system.hasActiveMiracle(0, 0)).toBe('boolean')
    })
  })
  
  describe('Cross-System Dependencies', () => {
    test('all systems should be instantiable', () => {
      const systems = {
        villagerNeeds: new VillagerNeedsSystem(),
        worship: new WorshipSystem(),
        miracle: new MiracleSystem(),
        impressiveness: new ImpressivenessSystem(),
        preacher: new PreacherSystem(),
        dayNight: new DayNightSystem(),
        profession: new ProfessionSystem(),
        buildingUpgrade: new BuildingUpgradeSystem()
      }
      
      // All should be objects
      Object.values(systems).forEach(system => {
        expect(system).toBeDefined()
        expect(typeof system).toBe('object')
      })
    })
    
    test('singleton exports should work', () => {
      const { villagerNeedsSystem } = require('../systems/VillagerNeedsSystem.js')
      const { worshipSystem } = require('../systems/WorshipSystem.js')
      const { miracleSystem } = require('../systems/MiracleSystem.js')
      const { impressivenessSystem } = require('../systems/ImpressivenessSystem.js')
      
      expect(villagerNeedsSystem).toBeDefined()
      expect(worshipSystem).toBeDefined()
      expect(miracleSystem).toBeDefined()
      expect(impressivenessSystem).toBeDefined()
    })
  })
  
  describe('Parameter Type Safety', () => {
    test('systems should validate parameter types', () => {
      const needsSystem = new VillagerNeedsSystem()
      const worshipSystem = new WorshipSystem()
      
      // Test various invalid inputs
      const invalidInputs = [null, undefined, 'string', 123, true, false]
      
      invalidInputs.forEach(input => {
        // VillagerNeedsSystem should handle gracefully
        expect(() => needsSystem.updateVillagerNeeds(input, 16, {})).not.toThrow()
        expect(() => needsSystem.getNeedsSatisfaction(input)).not.toThrow()
      })
      
      // WorshipSystem should validate arrays
      invalidInputs.forEach(input => {
        if (input !== null && input !== undefined) {
          expect(() => worshipSystem.updateWorship(input, [], 16)).toThrow()
        }
      })
    })
  })
})