import { clearOldDatabase, checkAndClearIfNeeded } from '../clearDatabase.js'

// Mock Dexie
const mockDexieInstance = {
  version: jest.fn().mockReturnThis(),
  stores: jest.fn().mockReturnThis(),
  open: jest.fn().mockResolvedValue(true),
  delete: jest.fn().mockResolvedValue(true)
}

const mockDexie = jest.fn(() => mockDexieInstance)
mockDexie.delete = jest.fn()

jest.mock('dexie', () => ({
  __esModule: true,
  default: mockDexie
}))

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn()
}
global.localStorage = localStorageMock

describe('clearDatabase', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    mockDexie.delete.mockClear()
    mockDexieInstance.delete.mockClear()
    mockDexieInstance.open.mockClear()
  })

  describe('clearOldDatabase', () => {
    test('should successfully delete old database', async () => {
      mockDexie.delete.mockResolvedValue(true)
      
      const result = await clearOldDatabase()
      
      expect(result).toBe(true)
      expect(mockDexie.delete).toHaveBeenCalledWith('GodDots001')
    })

    test('should handle deletion failure and try alternative method', async () => {
      mockDexie.delete.mockRejectedValue(new Error('Delete failed'))
      mockDexieInstance.open.mockResolvedValue(true)
      mockDexieInstance.delete.mockResolvedValue(true)
      
      const result = await clearOldDatabase()
      
      expect(result).toBe(true)
      expect(mockDexieInstance.delete).toHaveBeenCalled()
    })

    test('should return false if both methods fail', async () => {
      mockDexie.delete.mockRejectedValue(new Error('Delete failed'))
      mockDexieInstance.open.mockRejectedValue(new Error('Open failed'))
      
      const result = await clearOldDatabase()
      
      expect(result).toBe(false)
    })
  })

  describe('checkAndClearIfNeeded', () => {
    test('should skip clearing if already cleared', async () => {
      localStorageMock.getItem.mockReturnValue('true')
      
      await checkAndClearIfNeeded()
      
      expect(mockDexie.delete).not.toHaveBeenCalled()
    })

    test('should clear database and set flag on success', async () => {
      localStorageMock.getItem.mockReturnValue(null)
      mockDexie.delete.mockResolvedValue(true)
      
      await checkAndClearIfNeeded()
      
      expect(mockDexie.delete).toHaveBeenCalledWith('GodDots001')
      expect(localStorageMock.setItem).toHaveBeenCalledWith('godDots_db_v3_cleared', 'true')
    })

    test('should not set flag on failure', async () => {
      localStorageMock.getItem.mockReturnValue(null)
      mockDexie.delete.mockRejectedValue(new Error('Delete failed'))
      mockDexieInstance.open.mockRejectedValue(new Error('Open failed'))
      
      await checkAndClearIfNeeded()
      
      expect(localStorageMock.setItem).not.toHaveBeenCalled()
    })
  })
})