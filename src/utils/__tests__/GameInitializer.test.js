import { GameInitializer } from '../GameInitializer'
import { MapGenerator } from '../mapGeneration/MapGenerator'
import { LandManager } from '../../classes/LandManager'
import { PathfindingGrid } from '../../classes/PathfindingGrid'
import gameConfig from '../../config/gameConfig'

jest.mock('../mapGeneration/MapGenerator')
jest.mock('../../classes/LandManager')
jest.mock('../../classes/PathfindingGrid')

describe('GameInitializer', () => {
  let gameInitializer
  let mockMapGenerator
  let mockLandManager
  let mockPathfindingGrid
  
  beforeEach(() => {
    // Create mock instances
    mockMapGenerator = {
      seed: 'test-seed-123',
      generateMap: jest.fn().mockReturnValue({
        seed: 'test-seed-123',
        worldSize: { width: 4800, height: 3200 },
        terrain: [
          { x: 0, y: 0, type: 'grassland', walkable: true, fertility: 0.8 },
          { x: 40, y: 0, type: 'forest', walkable: true, fertility: 0.6 },
          { x: 80, y: 0, type: 'water', walkable: false, fertility: 0 }
        ],
        terrainMap: new Map([
          ['0,0', { x: 0, y: 0, type: 'grassland', walkable: true }],
          ['40,0', { x: 40, y: 0, type: 'forest', walkable: true }],
          ['80,0', { x: 80, y: 0, type: 'water', walkable: false }]
        ]),
        resources: [
          { id: 'res1', type: 'tree', x: 40, y: 0, amount: 100, maxAmount: 100 }
        ],
        resourceMap: new Map([
          ['40,0', { id: 'res1', type: 'tree', x: 40, y: 0 }]
        ]),
        spawnPoints: [
          { id: 'spawn_0', x: 100, y: 100, tileX: 80, tileY: 80, quality: 0.9 }
        ],
        buildingLocations: [],
        validation: { isValid: true, issues: [] }
      })
    }
    
    mockLandManager = {
      addPlot: jest.fn()
    }
    
    mockPathfindingGrid = {
      setCost: jest.fn(),
      setWalkable: jest.fn()
    }
    
    // Reset constructor mocks
    MapGenerator.mockClear()
    LandManager.mockClear()
    PathfindingGrid.mockClear()
    
    gameInitializer = new GameInitializer({
      mapGenerator: mockMapGenerator,
      landManager: mockLandManager,
      pathfindingGrid: mockPathfindingGrid
    })
  })
  
  describe('initializeNewGame', () => {
    it('should generate a new game with all required components', async () => {
      const result = await gameInitializer.initializeNewGame()
      
      // Verify map generation was called
      expect(mockMapGenerator.generateMap).toHaveBeenCalledWith(gameConfig.map)
      
      // Verify pathfinding grid was initialized
      expect(mockPathfindingGrid.setCost).toHaveBeenCalled()
      expect(mockPathfindingGrid.setWalkable).toHaveBeenCalled()
      
      // Verify land plots were registered
      expect(mockLandManager.addPlot).toHaveBeenCalled()
      
      // Verify game state structure
      expect(result).toMatchObject({
        terrain: expect.any(Array),
        terrainMap: expect.any(Map),
        resources: expect.any(Array),
        resourceMap: expect.any(Map),
        spawnPoints: expect.any(Array),
        buildings: [],
        villagers: expect.any(Array),
        beliefPoints: gameConfig.startingBeliefPoints,
        population: expect.any(Number),
        mapSeed: 'test-seed-123',
        gameTime: 0,
        isPaused: false
      })
      
      // Verify villagers were created
      expect(result.villagers.length).toBeGreaterThan(0)
      expect(result.population).toBe(result.villagers.length)
    })
    
    it('should initialize pathfinding grid with correct terrain costs', async () => {
      await gameInitializer.initializeNewGame()
      
      // Verify grassland tile (walkable)
      expect(mockPathfindingGrid.setCost).toHaveBeenCalledWith(0, 0, 1)
      
      // Verify water tile (not walkable)
      expect(mockPathfindingGrid.setWalkable).toHaveBeenCalledWith(2, 0, false)
    })
    
    it('should create villagers at spawn points', async () => {
      const result = await gameInitializer.initializeNewGame()
      
      expect(result.villagers.length).toBe(gameConfig.startingVillagers)
      
      // Check villager properties
      const villager = result.villagers[0]
      expect(villager).toMatchObject({
        id: expect.stringContaining('villager_'),
        x: expect.any(Number),
        y: expect.any(Number),
        state: 'idle',
        health: 100,
        skills: {
          farming: expect.any(Number),
          building: expect.any(Number),
          combat: expect.any(Number)
        }
      })
      
      // Verify villager is near spawn point
      const spawn = result.spawnPoints[0]
      const distance = Math.sqrt(
        Math.pow(villager.x - spawn.x, 2) + 
        Math.pow(villager.y - spawn.y, 2)
      )
      expect(distance).toBeLessThan(50) // Within reasonable distance
    })
  })
  
  describe('loadGame', () => {
    it('should restore game state from saved data', async () => {
      const savedData = {
        terrain: [{ x: 0, y: 0, type: 'grassland' }],
        buildings: [{ x: 100, y: 100, width: 2, height: 2 }],
        landPlots: [{
          id: 'plot_0_0',
          tiles: [{ x: 0, y: 0 }],
          baseCost: 100,
          owner: 'player1',
          buildings: []
        }]
      }
      
      const result = await gameInitializer.loadGame(savedData)
      
      // Verify pathfinding grid was updated with buildings
      expect(mockPathfindingGrid.setWalkable).toHaveBeenCalled()
      
      // Verify land plots were restored
      expect(mockLandManager.addPlot).toHaveBeenCalled()
      
      expect(result).toBe(savedData)
    })
  })
})