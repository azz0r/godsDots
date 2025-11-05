/**
 * Sleep System Tests
 * Villagers sleep during darkness and wake during day
 */

import { SleepSystem } from '../SleepSystem'
import { WorldClock } from '../WorldClock'

describe('SleepSystem', () => {
  let sleepSystem
  let clock

  beforeEach(() => {
    clock = new WorldClock()
    sleepSystem = new SleepSystem(clock)
  })

  describe('Initialization', () => {
    test('should initialize with WorldClock reference', () => {
      expect(sleepSystem.clock).toBe(clock)
    })

    test('should have default sleep configuration', () => {
      expect(sleepSystem.config.sleepRestoreRate).toBeGreaterThan(0)
      expect(sleepSystem.config.sleepDeprivationRate).toBeGreaterThan(0)
    })
  })

  describe('Sleep State Management', () => {
    test('should mark villager as asleep', () => {
      const villager = { id: 'v1', state: 'idle', needs: { rest: 50 } }
      sleepSystem.putToSleep(villager)

      expect(villager.state).toBe('sleeping')
      expect(villager.isSleeping).toBe(true)
    })

    test('should mark villager as awake', () => {
      const villager = { id: 'v1', state: 'sleeping', isSleeping: true, needs: { rest: 90 } }
      sleepSystem.wakeUp(villager)

      expect(villager.state).not.toBe('sleeping')
      expect(villager.isSleeping).toBe(false)
    })

    test('should track sleep start time', () => {
      const villager = { id: 'v1', state: 'idle', needs: { rest: 50 } }
      sleepSystem.putToSleep(villager)

      expect(villager.sleepStartTime).toBeDefined()
    })

    test('should track total sleep duration', () => {
      const villager = { id: 'v1', state: 'sleeping', isSleeping: true, sleepStartTime: Date.now() - 5000 }
      sleepSystem.wakeUp(villager)

      expect(villager.totalSleepTime).toBeGreaterThan(0)
    })
  })

  describe('Automatic Sleep Based on Darkness', () => {
    test('should put tired villagers to sleep at night', () => {
      clock.setTime(23, 0) // Night
      const villager = {
        id: 'v1',
        state: 'idle',
        needs: { rest: 30 }, // Tired
        isSleeping: false
      }

      sleepSystem.update([villager], 1000)

      expect(villager.state).toBe('sleeping')
      expect(villager.isSleeping).toBe(true)
    })

    test('should NOT force sleep during day even if tired', () => {
      clock.setTime(12, 0) // Afternoon
      const villager = {
        id: 'v1',
        state: 'idle',
        needs: { rest: 30 }, // Tired
        isSleeping: false
      }

      sleepSystem.update([villager], 1000)

      // Should seek rest but not forced sleep
      expect(villager.state).not.toBe('sleeping')
    })

    test('should wake villagers at dawn', () => {
      clock.setTime(6, 0) // Dawn
      const villager = {
        id: 'v1',
        state: 'sleeping',
        isSleeping: true,
        needs: { rest: 80 }, // Well rested
        sleepStartTime: Date.now() - 10000
      }

      sleepSystem.update([villager], 1000)

      expect(villager.isSleeping).toBe(false)
      expect(villager.state).toBe('idle')
    })

    test('should let exhausted villagers sleep past dawn', () => {
      clock.setTime(6, 0) // Dawn
      const villager = {
        id: 'v1',
        state: 'sleeping',
        isSleeping: true,
        needs: { rest: 20 }, // Still exhausted
        sleepStartTime: Date.now() - 3000
      }

      sleepSystem.update([villager], 1000)

      // Still too tired, continue sleeping
      expect(villager.isSleeping).toBe(true)
    })
  })

  describe('Rest Restoration During Sleep', () => {
    test('should restore rest while sleeping', () => {
      clock.setTime(23, 0)
      const villager = {
        id: 'v1',
        state: 'sleeping',
        isSleeping: true,
        needs: { rest: 40 },
        sleepStartTime: Date.now() - 1000
      }

      const initialRest = villager.needs.rest
      sleepSystem.update([villager], 1000)

      expect(villager.needs.rest).toBeGreaterThan(initialRest)
    })

    test('should restore rest faster in a house', () => {
      clock.setTime(23, 0)
      const villager1 = {
        id: 'v1',
        state: 'sleeping',
        isSleeping: true,
        needs: { rest: 40 },
        sleepStartTime: Date.now() - 1000,
        sleepingLocation: null
      }
      const villager2 = {
        id: 'v2',
        state: 'sleeping',
        isSleeping: true,
        needs: { rest: 40 },
        sleepStartTime: Date.now() - 1000,
        sleepingLocation: { type: 'house', restQuality: 1.5 }
      }

      sleepSystem.update([villager1, villager2], 1000)

      expect(villager2.needs.rest).toBeGreaterThan(villager1.needs.rest)
    })

    test('should cap rest at maximum (100)', () => {
      clock.setTime(23, 0)
      const villager = {
        id: 'v1',
        state: 'sleeping',
        isSleeping: true,
        needs: { rest: 98 },
        sleepStartTime: Date.now() - 1000
      }

      sleepSystem.update([villager], 5000)

      expect(villager.needs.rest).toBeLessThanOrEqual(100)
    })
  })

  describe('Sleep Deprivation', () => {
    test('should track consecutive hours without sleep', () => {
      clock.setTime(23, 0)
      const villager = {
        id: 'v1',
        state: 'working',
        isSleeping: false,
        needs: { rest: 30 },
        hoursWithoutSleep: 15
      }

      sleepSystem.update([villager], 1000)

      expect(villager.hoursWithoutSleep).toBeGreaterThan(15)
    })

    test('should reset hours without sleep after sleeping', () => {
      clock.setTime(23, 0)
      const villager = {
        id: 'v1',
        state: 'sleeping',
        isSleeping: true,
        needs: { rest: 50 },
        hoursWithoutSleep: 20,
        sleepStartTime: Date.now() - 5000
      }

      sleepSystem.update([villager], 2000)

      expect(villager.hoursWithoutSleep).toBe(0)
    })

    test('should cause collapse after 24 hours without sleep', () => {
      clock.setTime(14, 0) // Day
      const villager = {
        id: 'v1',
        state: 'working',
        isSleeping: false,
        needs: { rest: 5 },
        hoursWithoutSleep: 24
      }

      sleepSystem.update([villager], 1000)

      expect(villager.state).toBe('collapsed')
      expect(villager.health).toBeDefined()
    })
  })

  describe('Sleep Location Management', () => {
    test('should find nearest house for sleeping', () => {
      const villager = { id: 'v1', x: 100, y: 100, playerId: 'p1' }
      const buildings = [
        { type: 'house', x: 90, y: 90, playerId: 'p1', residents: 2, maxResidents: 4 },
        { type: 'house', x: 200, y: 200, playerId: 'p1', residents: 4, maxResidents: 4 }
      ]

      const sleepLocation = sleepSystem.findSleepLocation(villager, buildings)

      expect(sleepLocation).toBeDefined()
      expect(sleepLocation.type).toBe('house')
      expect(sleepLocation.x).toBe(90)
    })

    test('should fallback to sleeping outdoors if no house available', () => {
      const villager = { id: 'v1', x: 100, y: 100, playerId: 'p1' }
      const buildings = []

      const sleepLocation = sleepSystem.findSleepLocation(villager, buildings)

      expect(sleepLocation).toBeNull() // Will sleep at current location
    })
  })

  describe('Sleep Quality', () => {
    test('should calculate sleep quality based on location', () => {
      const houseQuality = sleepSystem.getSleepQuality({ type: 'house' })
      const outdoorQuality = sleepSystem.getSleepQuality(null)

      expect(houseQuality).toBeGreaterThan(outdoorQuality)
    })

    test('should give better quality for upgraded buildings', () => {
      const basicHouse = sleepSystem.getSleepQuality({ type: 'house', level: 1 })
      const manor = sleepSystem.getSleepQuality({ type: 'house', level: 3, specialization: 'manor' })

      expect(manor).toBeGreaterThan(basicHouse)
    })
  })

  describe('Sleep Statistics', () => {
    test('should track average sleep quality', () => {
      const villager = {
        id: 'v1',
        sleepSessions: [
          { quality: 1.0, duration: 8 },
          { quality: 1.5, duration: 7 },
          { quality: 0.8, duration: 6 }
        ]
      }

      const avgQuality = sleepSystem.getAverageSleepQuality(villager)

      expect(avgQuality).toBeCloseTo(1.1, 1)
    })

    test('should track total sleep over multiple days', () => {
      const villager = {
        id: 'v1',
        totalSleepTime: 28800000 // 8 hours in ms
      }

      const hours = sleepSystem.getTotalSleepHours(villager)

      expect(hours).toBe(8)
    })
  })
})
