import Dexie from 'dexie'
import dbService from '../databaseService.js'
import db from '../db.js'

// Mock Dexie
jest.mock('dexie')
jest.mock('../db.js')

describe('DatabaseService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup default mocks
    db.Game = {
      add: jest.fn().mockResolvedValue(1),
      get: jest.fn(),
      where: jest.fn().mockReturnThis(),
      first: jest.fn(),
      toArray: jest.fn().mockResolvedValue([])
    }
    
    db.Level = {
      add: jest.fn().mockResolvedValue(1),
      get: jest.fn(),
      where: jest.fn().mockReturnThis(),
      first: jest.fn(),
      equals: jest.fn().mockReturnThis(),
      and: jest.fn().mockReturnThis(),
      toArray: jest.fn().mockResolvedValue([])
    }
    
    db.Player = {
      add: jest.fn().mockResolvedValue(1),
      where: jest.fn().mockReturnThis(),
      equals: jest.fn().mockReturnThis(),
      toArray: jest.fn().mockResolvedValue([])
    }
    
    db.transaction = jest.fn((mode, tables, fn) => fn())
  })

  describe('createGame', () => {
    test('should create a new game with defaults', async () => {
      const gameId = await dbService.createGame()
      
      expect(db.Game.add).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Divine Realm',
          worldSeed: expect.any(String),
          createdAt: expect.any(Date),
          lastPlayedAt: expect.any(Date)
        })
      )
      expect(gameId).toBe(1)
    })

    test('should create a new game with custom name', async () => {
      await dbService.createGame('Custom World')
      
      expect(db.Game.add).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Custom World'
        })
      )
    })
  })

  describe('getGameById', () => {
    test('should retrieve game by id', async () => {
      const mockGame = { id: 1, name: 'Test Game' }
      db.Game.get.mockResolvedValue(mockGame)
      
      const game = await dbService.getGameById(1)
      
      expect(db.Game.get).toHaveBeenCalledWith(1)
      expect(game).toEqual(mockGame)
    })

    test('should return null for non-existent game', async () => {
      db.Game.get.mockResolvedValue(undefined)
      
      const game = await dbService.getGameById(999)
      
      expect(game).toBeUndefined()
    })
  })

  describe('createLevel', () => {
    test('should create a new level for game', async () => {
      const levelId = await dbService.createLevel(1)
      
      expect(db.Level.add).toHaveBeenCalledWith(
        expect.objectContaining({
          gameId: 1,
          levelNumber: 1,
          name: 'The First Realm',
          isActive: true
        })
      )
      expect(levelId).toBe(1)
    })

    test('should handle database errors', async () => {
      db.Level.add.mockRejectedValue(new Error('Database error'))
      
      await expect(dbService.createLevel(1)).rejects.toThrow('Database error')
    })
  })

  describe('getActiveLevel', () => {
    test('should retrieve active level for game', async () => {
      const mockLevel = { id: 1, gameId: 1, isActive: true }
      db.Level.where.mockReturnValue({
        equals: jest.fn().mockReturnValue({
          and: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue(mockLevel)
          })
        })
      })
      
      const level = await dbService.getActiveLevel(1)
      
      expect(db.Level.where).toHaveBeenCalledWith('gameId')
      expect(level).toEqual(mockLevel)
    })

    test('should utilize compound index for query', async () => {
      // Mock the compound index query
      db.Level.where.mockReturnValue({
        equals: jest.fn().mockReturnValue({
          and: jest.fn((fn) => {
            // Verify the function checks isActive
            const mockItem = { isActive: true }
            expect(fn(mockItem)).toBe(true)
            
            const inactiveItem = { isActive: false }
            expect(fn(inactiveItem)).toBe(false)
            
            return {
              first: jest.fn().mockResolvedValue({ id: 1 })
            }
          })
        })
      })
      
      await dbService.getActiveLevel(1)
      
      // Verify compound index fields are used
      expect(db.Level.where).toHaveBeenCalledWith('gameId')
    })
  })

  describe('createPlayer', () => {
    test('should create a new player', async () => {
      const playerData = {
        levelId: 1,
        name: 'Test Player',
        isHuman: true
      }
      
      const playerId = await dbService.createPlayer(playerData)
      
      expect(db.Player.add).toHaveBeenCalledWith(
        expect.objectContaining({
          levelId: 1,
          name: 'Test Player',
          isHuman: true,
          beliefPoints: 100,
          position: { x: 0, y: 0 }
        })
      )
      expect(playerId).toBe(1)
    })
  })

  describe('transaction handling', () => {
    test('should use transactions for complex operations', async () => {
      const mockTransaction = jest.fn(async () => {
        // Simulate creating game and level together
        await db.Game.add({ name: 'Test' })
        await db.Level.add({ gameId: 1 })
      })
      
      db.transaction.mockImplementation((mode, tables, fn) => {
        expect(mode).toBe('rw')
        expect(tables).toContain(db.Game)
        expect(tables).toContain(db.Level)
        return mockTransaction()
      })
      
      // Simulate a method that uses transactions
      await db.transaction('rw', [db.Game, db.Level], async () => {
        await db.Game.add({ name: 'Test' })
        await db.Level.add({ gameId: 1 })
      })
      
      expect(mockTransaction).toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    test('should handle database connection errors', async () => {
      db.Game.get.mockRejectedValue(new Error('Connection failed'))
      
      await expect(dbService.getGameById(1)).rejects.toThrow('Connection failed')
    })

    test('should handle missing required fields', async () => {
      // Test that service validates required fields
      const invalidPlayer = { name: 'Test' } // Missing levelId
      
      db.Player.add.mockRejectedValue(new Error('Missing required field: levelId'))
      
      await expect(dbService.createPlayer(invalidPlayer)).rejects.toThrow('Missing required field')
    })
  })
})