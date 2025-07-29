import { BuildingUpgradeSystem } from '../BuildingUpgradeSystem.js'

describe('BuildingUpgradeSystem', () => {
  let system
  let mockPlayer
  let mockBuilding

  beforeEach(() => {
    system = new BuildingUpgradeSystem()
    
    mockPlayer = {
      id: 'player1',
      beliefPoints: 1000,
      technologies: [],
      unlockedBuildings: []
    }
    
    mockBuilding = {
      id: 'building1',
      type: 'house',
      level: 1,
      isUnderConstruction: false,
      upgrading: null
    }
  })

  describe('checkUpgradeEligibility', () => {
    test('should return null for null building', () => {
      const result = system.checkUpgradeEligibility(null, mockPlayer)
      expect(result).toBeNull()
    })

    test('should return null for building under construction', () => {
      mockBuilding.isUnderConstruction = true
      const result = system.checkUpgradeEligibility(mockBuilding, mockPlayer)
      expect(result).toBeNull()
    })

    test('should return null for building already upgrading', () => {
      mockBuilding.upgrading = { toLevel: 2 }
      const result = system.checkUpgradeEligibility(mockBuilding, mockPlayer)
      expect(result).toBeNull()
    })

    test('should return null for unknown building type', () => {
      mockBuilding.type = 'unknown'
      const result = system.checkUpgradeEligibility(mockBuilding, mockPlayer)
      expect(result).toBeNull()
    })

    test('should return null for max level building', () => {
      mockBuilding.level = 3 // Max level for house
      const result = system.checkUpgradeEligibility(mockBuilding, mockPlayer)
      expect(result).toBeNull()
    })

    test('should return null if requirements not met', () => {
      mockBuilding.level = 1 // Level 2 requires carpentry
      const result = system.checkUpgradeEligibility(mockBuilding, mockPlayer)
      expect(result).toBeNull()
    })

    test('should return upgrade info if all conditions met', () => {
      mockBuilding.level = 1
      mockPlayer.technologies = ['carpentry'] // Has required tech
      
      const result = system.checkUpgradeEligibility(mockBuilding, mockPlayer)
      
      expect(result).toBeDefined()
      expect(result.level).toBe(2)
      expect(result.name).toBe('Large House')
      expect(result.cost).toBeGreaterThan(0)
      expect(result.benefits).toBeDefined()
      expect(result.buildTime).toBeDefined()
    })

    test('should handle temple upgrades correctly', () => {
      mockBuilding.type = 'temple'
      mockBuilding.level = 1
      mockPlayer.technologies = ['theology']
      
      const result = system.checkUpgradeEligibility(mockBuilding, mockPlayer)
      
      expect(result).toBeDefined()
      expect(result.level).toBe(2)
      expect(result.name).toBe('Temple')
    })

    test('should calculate cost correctly', () => {
      mockBuilding.level = 1
      mockPlayer.technologies = ['carpentry']
      
      const result = system.checkUpgradeEligibility(mockBuilding, mockPlayer)
      
      // Should use gold cost or default to 50
      expect(result.cost).toBe(10) // house level2 has gold: 10
    })
  })

  describe('upgradeBuilding', () => {
    test('should start upgrade process', () => {
      const result = system.upgradeBuilding(mockBuilding, mockPlayer)
      
      expect(result).toBe(true)
      expect(mockBuilding.upgrading).toBeDefined()
      expect(mockBuilding.upgrading.toLevel).toBe(2)
      expect(mockBuilding.operational).toBe(false)
    })

    test('should return false if cannot upgrade', () => {
      mockBuilding.level = 10 // Too high
      const result = system.upgradeBuilding(mockBuilding, mockPlayer)
      
      expect(result).toBe(false)
      expect(mockBuilding.upgrading).toBeNull()
    })
  })

  describe('updateUpgrades', () => {
    test('should progress upgrade over time', () => {
      const buildings = [mockBuilding]
      mockBuilding.upgrading = {
        toLevel: 2,
        progress: 0,
        totalTime: 100
      }
      
      system.updateUpgrades(buildings, 16000) // 16 seconds
      
      expect(mockBuilding.upgrading.progress).toBe(16)
    })

    test('should complete upgrade when time elapsed', () => {
      const buildings = [mockBuilding]
      mockBuilding.upgrading = {
        toLevel: 2,
        progress: 99,
        totalTime: 100
      }
      
      system.updateUpgrades(buildings, 2000) // 2 more seconds
      
      expect(mockBuilding.upgrading).toBeNull()
      expect(mockBuilding.level).toBe(2)
      expect(mockBuilding.operational).toBe(true)
    })

    test('should handle empty buildings array', () => {
      expect(() => {
        system.updateUpgrades([], 1000)
      }).not.toThrow()
    })
  })

  describe('completeUpgrade', () => {
    test('should apply all upgrade benefits', () => {
      mockBuilding.upgrading = { toLevel: 2 }
      
      system.completeUpgrade(mockBuilding)
      
      expect(mockBuilding.level).toBe(2)
      expect(mockBuilding.name).toBe('Large House')
      expect(mockBuilding.happiness).toBe(10) // From benefits
      expect(mockBuilding.restQuality).toBe(1.2)
      expect(mockBuilding.operational).toBe(true)
      expect(mockBuilding.upgrading).toBeNull()
    })

    test('should apply visual upgrades', () => {
      mockBuilding.upgrading = { toLevel: 2 }
      
      system.completeUpgrade(mockBuilding)
      
      expect(mockBuilding.appearance).toBeDefined()
      expect(mockBuilding.appearance.size).toBeGreaterThan(1)
      expect(mockBuilding.appearance.quality).toBe(2)
    })
  })

  describe('canAffordUpgrade', () => {
    test('should check player resources', () => {
      const upgrade = {
        cost: { wood: 40, stone: 30, iron: 10 }
      }
      
      mockPlayer.resources = {
        wood: 50,
        stone: 40,
        iron: 20
      }
      
      const result = system.canAffordUpgrade(mockPlayer, upgrade)
      expect(result).toBe(true)
    })

    test('should return false if insufficient resources', () => {
      const upgrade = {
        cost: { wood: 40, stone: 30, iron: 10 }
      }
      
      mockPlayer.resources = {
        wood: 30, // Not enough
        stone: 40,
        iron: 20
      }
      
      const result = system.canAffordUpgrade(mockPlayer, upgrade)
      expect(result).toBe(false)
    })
  })
})