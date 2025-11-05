/**
 * WorldClock System Tests
 * Centralized time management that all systems follow
 */

import { WorldClock } from '../WorldClock'

describe('WorldClock', () => {
  let clock

  beforeEach(() => {
    clock = new WorldClock()
  })

  describe('Initialization', () => {
    test('should start at 6:00 AM by default', () => {
      expect(clock.getCurrentHour()).toBe(6)
      expect(clock.getCurrentMinute()).toBe(0)
    })

    test('should start at day 1', () => {
      expect(clock.getCurrentDay()).toBe(1)
    })

    test('should allow custom start time', () => {
      const customClock = new WorldClock({ startHour: 12, startMinute: 30 })
      expect(customClock.getCurrentHour()).toBe(12)
      expect(customClock.getCurrentMinute()).toBe(30)
    })
  })

  describe('Time Progression', () => {
    test('should advance time with delta', () => {
      const initialTime = clock.getCurrentTime()
      clock.update(1000) // 1 second
      expect(clock.getCurrentTime()).toBeGreaterThan(initialTime)
    })

    test('should handle hour wraparound at midnight', () => {
      const nightClock = new WorldClock({ startHour: 23, startMinute: 59 })
      nightClock.update(2000) // Advance past midnight
      expect(nightClock.getCurrentHour()).toBeLessThan(23)
      expect(nightClock.getCurrentDay()).toBe(2)
    })

    test('should emit period change events', () => {
      const callback = jest.fn()
      clock.onPeriodChange(callback)

      // Advance to next period
      clock.setTime(7, 0) // Dawn -> Morning
      expect(callback).toHaveBeenCalledWith('MORNING', expect.any(Object))
    })
  })

  describe('Time Periods', () => {
    test('should correctly identify DAWN (5-7 AM)', () => {
      clock.setTime(6, 0)
      expect(clock.getCurrentPeriod()).toBe('DAWN')
    })

    test('should correctly identify MORNING (7-12 PM)', () => {
      clock.setTime(9, 30)
      expect(clock.getCurrentPeriod()).toBe('MORNING')
    })

    test('should correctly identify AFTERNOON (12-5 PM)', () => {
      clock.setTime(14, 0)
      expect(clock.getCurrentPeriod()).toBe('AFTERNOON')
    })

    test('should correctly identify DUSK (5-7 PM)', () => {
      clock.setTime(18, 0)
      expect(clock.getCurrentPeriod()).toBe('DUSK')
    })

    test('should correctly identify NIGHT (7 PM-5 AM)', () => {
      clock.setTime(22, 0)
      expect(clock.getCurrentPeriod()).toBe('NIGHT')
    })
  })

  describe('Lighting and Darkness', () => {
    test('should return full brightness during afternoon', () => {
      clock.setTime(14, 0)
      expect(clock.getLightLevel()).toBeCloseTo(1.0, 1)
    })

    test('should return low brightness at night', () => {
      clock.setTime(23, 0)
      expect(clock.getLightLevel()).toBeLessThan(0.3)
    })

    test('should return true for isDark during night', () => {
      clock.setTime(23, 0)
      expect(clock.isDark()).toBe(true)
    })

    test('should return false for isDark during day', () => {
      clock.setTime(12, 0)
      expect(clock.isDark()).toBe(false)
    })

    test('should have gradual transition at dawn', () => {
      clock.setTime(5, 30)
      const dawnLight = clock.getLightLevel()
      clock.setTime(6, 30)
      const laterDawnLight = clock.getLightLevel()
      expect(laterDawnLight).toBeGreaterThan(dawnLight)
    })
  })

  describe('Time Synchronization', () => {
    test('should allow systems to subscribe to time updates', () => {
      const subscriber = jest.fn()
      clock.subscribe(subscriber)

      clock.update(1000)
      expect(subscriber).toHaveBeenCalledWith({
        hour: expect.any(Number),
        minute: expect.any(Number),
        day: expect.any(Number),
        period: expect.any(String),
        lightLevel: expect.any(Number)
      })
    })

    test('should allow systems to unsubscribe', () => {
      const subscriber = jest.fn()
      const unsubscribe = clock.subscribe(subscriber)

      unsubscribe()
      clock.update(1000)
      expect(subscriber).not.toHaveBeenCalled()
    })

    test('should notify all subscribers on update', () => {
      const sub1 = jest.fn()
      const sub2 = jest.fn()
      clock.subscribe(sub1)
      clock.subscribe(sub2)

      clock.update(1000)
      expect(sub1).toHaveBeenCalled()
      expect(sub2).toHaveBeenCalled()
    })
  })

  describe('Time Control', () => {
    test('should support pause', () => {
      clock.pause()
      const time = clock.getCurrentTime()
      clock.update(1000)
      expect(clock.getCurrentTime()).toBe(time)
    })

    test('should support resume', () => {
      clock.pause()
      clock.resume()
      const time = clock.getCurrentTime()
      clock.update(1000)
      expect(clock.getCurrentTime()).toBeGreaterThan(time)
    })

    test('should support time speed multiplier', () => {
      clock.setTimeScale(2.0) // Double speed
      const time1 = clock.getCurrentTime()
      clock.update(1000)
      const time2 = clock.getCurrentTime()
      const elapsed = time2 - time1

      // At 2x speed, should advance roughly twice as much
      expect(elapsed).toBeGreaterThan(0.07) // Normal would be ~0.04
    })
  })

  describe('Schedule Queries', () => {
    test('should tell if it is sleep time (NIGHT period)', () => {
      clock.setTime(23, 0)
      expect(clock.isSleepTime()).toBe(true)
    })

    test('should tell if it is work time (MORNING/AFTERNOON)', () => {
      clock.setTime(10, 0)
      expect(clock.isWorkTime()).toBe(true)
    })

    test('should tell if it is rest time (DUSK)', () => {
      clock.setTime(18, 30)
      expect(clock.isRestTime()).toBe(true)
    })
  })
})
