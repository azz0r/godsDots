/**
 * PerformanceMonitor Tests
 * Track FPS, frame times, and performance metrics
 */

import { PerformanceMonitor } from '../PerformanceMonitor'

describe('PerformanceMonitor', () => {
  let monitor

  beforeEach(() => {
    monitor = new PerformanceMonitor()
  })

  describe('Initialization', () => {
    test('should initialize with default values', () => {
      expect(monitor.getFPS()).toBe(60)
      expect(monitor.getAverageFrameTime()).toBe(0)
      expect(monitor.getFrameCount()).toBe(0)
    })

    test('should track start time', () => {
      expect(monitor.startTime).toBeDefined()
    })
  })

  describe('Frame Tracking', () => {
    test('should record frame', () => {
      monitor.recordFrame(16.67) // 60 FPS
      expect(monitor.getFrameCount()).toBe(1)
    })

    test('should calculate FPS from frame times', () => {
      // Simulate 60 FPS (16.67ms per frame)
      for (let i = 0; i < 60; i++) {
        monitor.recordFrame(16.67)
      }

      expect(monitor.getFPS()).toBeCloseTo(60, 0)
    })

    test('should calculate FPS from 30 FPS frames', () => {
      // Simulate 30 FPS (33.33ms per frame)
      for (let i = 0; i < 30; i++) {
        monitor.recordFrame(33.33)
      }

      expect(monitor.getFPS()).toBeCloseTo(30, 0)
    })

    test('should track average frame time', () => {
      monitor.recordFrame(16)
      monitor.recordFrame(17)
      monitor.recordFrame(18)

      expect(monitor.getAverageFrameTime()).toBeCloseTo(17, 0)
    })

    test('should limit frame history to last 60 frames', () => {
      for (let i = 0; i < 100; i++) {
        monitor.recordFrame(16.67)
      }

      expect(monitor.frameHistory.length).toBeLessThanOrEqual(60)
    })
  })

  describe('Performance Metrics', () => {
    test('should calculate min frame time', () => {
      monitor.recordFrame(10)
      monitor.recordFrame(20)
      monitor.recordFrame(15)

      expect(monitor.getMinFrameTime()).toBe(10)
    })

    test('should calculate max frame time', () => {
      monitor.recordFrame(10)
      monitor.recordFrame(20)
      monitor.recordFrame(15)

      expect(monitor.getMaxFrameTime()).toBe(20)
    })

    test('should detect frame drops', () => {
      monitor.recordFrame(16.67)
      monitor.recordFrame(16.67)
      monitor.recordFrame(50) // Frame drop!

      expect(monitor.getFrameDrops()).toBeGreaterThan(0)
    })

    test('should calculate 95th percentile frame time', () => {
      // Add 60 frames (the history limit) with mostly good frames
      for (let i = 0; i < 57; i++) {
        monitor.recordFrame(16)
      }
      monitor.recordFrame(17)
      monitor.recordFrame(18)
      monitor.recordFrame(100) // One outlier at the end

      const p95 = monitor.getPercentile(95)
      // 95th percentile should pick index 56 (95% of 60), which is one of the good frames
      expect(p95).toBeLessThan(20)
    })
  })

  describe('Performance Warnings', () => {
    test('should detect low FPS warning', () => {
      // Simulate 20 FPS (critical level - under 50% of target)
      for (let i = 0; i < 20; i++) {
        monitor.recordFrame(50)
      }

      expect(monitor.hasPerformanceWarning()).toBe(true)
      expect(monitor.getWarningLevel()).toBe('critical')
    })

    test('should detect stuttering', () => {
      // Good frames then sudden spike
      for (let i = 0; i < 30; i++) {
        monitor.recordFrame(16.67)
      }
      monitor.recordFrame(100) // Big stutter

      expect(monitor.hasStuttering()).toBe(true)
    })

    test('should not warn on good performance', () => {
      // Simulate smooth 60 FPS
      for (let i = 0; i < 60; i++) {
        monitor.recordFrame(16.67)
      }

      expect(monitor.hasPerformanceWarning()).toBe(false)
    })
  })

  describe('Update Budget Tracking', () => {
    test('should track system update times', () => {
      monitor.startSystemUpdate('terrain')
      // Simulate work
      monitor.endSystemUpdate('terrain')

      const stats = monitor.getSystemStats('terrain')
      expect(stats.averageTime).toBeGreaterThan(0)
    })

    test('should identify slow systems', () => {
      monitor.startSystemUpdate('rendering')
      // Simulate slow system
      monitor.endSystemUpdate('rendering', 30) // 30ms - too slow!

      const slowSystems = monitor.getSlowSystems()
      expect(slowSystems).toContain('rendering')
    })

    test('should calculate total update budget used', () => {
      monitor.recordSystemTime('physics', 5)
      monitor.recordSystemTime('rendering', 8)
      monitor.recordSystemTime('ai', 3)

      const totalBudget = monitor.getTotalUpdateBudget()
      expect(totalBudget).toBe(16)
    })

    test('should warn when budget exceeded', () => {
      monitor.recordSystemTime('rendering', 20) // Over 16.67ms budget for 60fps

      expect(monitor.isBudgetExceeded()).toBe(true)
    })
  })

  describe('Memory Tracking', () => {
    test('should track entity count', () => {
      monitor.recordEntityCount('villagers', 100)
      monitor.recordEntityCount('animals', 25)

      expect(monitor.getEntityCount('villagers')).toBe(100)
      expect(monitor.getTotalEntityCount()).toBe(125)
    })

    test('should warn on high entity count', () => {
      monitor.recordEntityCount('villagers', 1000)

      expect(monitor.hasMemoryWarning()).toBe(true)
    })
  })

  describe('Statistics Export', () => {
    test('should export performance summary', () => {
      for (let i = 0; i < 60; i++) {
        monitor.recordFrame(16.67)
      }

      const summary = monitor.getSummary()

      expect(summary.fps).toBeDefined()
      expect(summary.averageFrameTime).toBeDefined()
      expect(summary.minFrameTime).toBeDefined()
      expect(summary.maxFrameTime).toBeDefined()
      expect(summary.frameDrops).toBeDefined()
    })

    test('should format for display', () => {
      for (let i = 0; i < 60; i++) {
        monitor.recordFrame(16.67)
      }

      const display = monitor.getDisplayText()

      expect(display).toContain('FPS')
      expect(typeof display).toBe('string')
    })

    test('should export detailed report', () => {
      monitor.recordFrame(16.67)
      monitor.recordSystemTime('rendering', 10)
      monitor.recordEntityCount('villagers', 50)

      const report = monitor.getDetailedReport()

      expect(report.performance).toBeDefined()
      expect(report.systems).toBeDefined()
      expect(report.entities).toBeDefined()
    })
  })

  describe('Reset and Clear', () => {
    test('should reset statistics', () => {
      for (let i = 0; i < 60; i++) {
        monitor.recordFrame(16.67)
      }

      monitor.reset()

      expect(monitor.getFrameCount()).toBe(0)
      expect(monitor.frameHistory.length).toBe(0)
    })

    test('should preserve configuration on reset', () => {
      const targetFPS = monitor.targetFPS
      monitor.reset()

      expect(monitor.targetFPS).toBe(targetFPS)
    })
  })

  describe('Performance Suggestions', () => {
    test('should suggest reducing entity count when high', () => {
      monitor.recordEntityCount('villagers', 1000)

      const suggestions = monitor.getSuggestions()

      expect(suggestions.some(s => s.includes('entity') || s.includes('Reduce'))).toBe(true)
    })

    test('should suggest optimizing slow systems', () => {
      monitor.recordSystemTime('pathfinding', 25)

      const suggestions = monitor.getSuggestions()

      expect(suggestions.some(s => s.includes('pathfinding'))).toBe(true)
    })

    test('should return empty suggestions when performance is good', () => {
      for (let i = 0; i < 60; i++) {
        monitor.recordFrame(16.67)
      }
      monitor.recordEntityCount('villagers', 50)

      const suggestions = monitor.getSuggestions()

      expect(suggestions.length).toBe(0)
    })
  })

  describe('Real-time Monitoring', () => {
    test('should support performance callbacks', () => {
      const callback = jest.fn()
      monitor.onPerformanceIssue(callback)

      // Trigger performance issue
      monitor.recordFrame(100) // Bad frame

      expect(callback).toHaveBeenCalled()
    })

    test('should throttle performance callbacks', () => {
      const callback = jest.fn()
      monitor.onPerformanceIssue(callback)

      // Multiple bad frames
      monitor.recordFrame(100)
      monitor.recordFrame(100)
      monitor.recordFrame(100)

      // Should only call once due to throttling
      expect(callback.mock.calls.length).toBeLessThanOrEqual(2)
    })
  })

  describe('Target FPS Configuration', () => {
    test('should allow custom target FPS', () => {
      const customMonitor = new PerformanceMonitor({ targetFPS: 30 })

      expect(customMonitor.targetFPS).toBe(30)
      expect(customMonitor.targetFrameTime).toBeCloseTo(33.33, 1)
    })

    test('should adjust warnings based on target FPS', () => {
      const monitor30 = new PerformanceMonitor({ targetFPS: 30 })

      // 30 FPS should not warn for 30fps target
      for (let i = 0; i < 30; i++) {
        monitor30.recordFrame(33.33)
      }

      expect(monitor30.hasPerformanceWarning()).toBe(false)
    })
  })
})
