/**
 * EntityCullingSystem Tests
 * Culls off-screen entities to improve performance
 */

import { EntityCullingSystem } from '../EntityCullingSystem'

describe('EntityCullingSystem', () => {
  let culling
  let camera

  beforeEach(() => {
    camera = {
      x: 0,
      y: 0,
      zoom: 1,
      width: 1000,
      height: 600
    }
    culling = new EntityCullingSystem()
  })

  describe('Initialization', () => {
    test('should initialize with default buffer', () => {
      expect(culling.buffer).toBeGreaterThan(0)
    })

    test('should allow custom buffer size', () => {
      const custom = new EntityCullingSystem({ buffer: 200 })
      expect(custom.buffer).toBe(200)
    })
  })

  describe('Visibility Testing', () => {
    test('should mark entity as visible when in view', () => {
      const entity = { x: 500, y: 300 }
      const isVisible = culling.isVisible(entity, camera)

      expect(isVisible).toBe(true)
    })

    test('should mark entity as not visible when off-screen left', () => {
      const entity = { x: -200, y: 300 }
      const isVisible = culling.isVisible(entity, camera)

      expect(isVisible).toBe(false)
    })

    test('should mark entity as not visible when off-screen right', () => {
      const entity = { x: 1200, y: 300 }
      const isVisible = culling.isVisible(entity, camera)

      expect(isVisible).toBe(false)
    })

    test('should mark entity as not visible when off-screen top', () => {
      const entity = { x: 500, y: -200 }
      const isVisible = culling.isVisible(entity, camera)

      expect(isVisible).toBe(false)
    })

    test('should mark entity as not visible when off-screen bottom', () => {
      const entity = { x: 500, y: 800 }
      const isVisible = culling.isVisible(entity, camera)

      expect(isVisible).toBe(false)
    })

    test('should include buffer zone in visibility check', () => {
      // Entity just outside view but within buffer
      const entity = { x: camera.width + 50, y: 300 }
      const isVisible = culling.isVisible(entity, camera)

      expect(isVisible).toBe(true) // Within buffer
    })
  })

  describe('Batch Culling', () => {
    test('should cull array of entities', () => {
      const entities = [
        { id: 1, x: 500, y: 300 },     // Visible
        { id: 2, x: -500, y: 300 },    // Not visible
        { id: 3, x: 800, y: 400 },     // Visible
        { id: 4, x: 2000, y: 300 }     // Not visible
      ]

      const visible = culling.cullEntities(entities, camera)

      expect(visible.length).toBe(2)
      expect(visible.map(e => e.id)).toEqual([1, 3])
    })

    test('should mark entities with isVisible flag', () => {
      const entities = [
        { id: 1, x: 500, y: 300 },
        { id: 2, x: -500, y: 300 }
      ]

      culling.updateVisibility(entities, camera)

      expect(entities[0].isVisible).toBe(true)
      expect(entities[1].isVisible).toBe(false)
    })

    test('should return empty array when no entities visible', () => {
      const entities = [
        { id: 1, x: -500, y: -500 },
        { id: 2, x: 2000, y: 2000 }
      ]

      const visible = culling.cullEntities(entities, camera)

      expect(visible.length).toBe(0)
    })
  })

  describe('Zoom Compensation', () => {
    test('should adjust for camera zoom', () => {
      camera.zoom = 2 // Zoomed in (sees less of the world)
      const entity = { x: 400, y: 250 } // Entity well within zoomed view

      const isVisible = culling.isVisible(entity, camera)

      expect(isVisible).toBe(true)
    })

    test('should adjust buffer for zoom level', () => {
      camera.zoom = 0.5 // Zoomed out
      const entity = { x: camera.width + 200, y: 300 }

      const isVisible = culling.isVisible(entity, camera)

      // Further away but still visible due to zoom
      expect(isVisible).toBe(true)
    })
  })

  describe('Bounds Entities', () => {
    test('should check entity with width and height', () => {
      const entity = { x: 990, y: 300, width: 50, height: 50 }

      const isVisible = culling.isVisible(entity, camera)

      // Entity starts at 990, extends to 1040, partially visible
      expect(isVisible).toBe(true)
    })

    test('should handle circular entities with radius', () => {
      const entity = { x: camera.width + 50, y: 300, radius: 100 }

      const isVisible = culling.isVisible(entity, camera)

      // Center is off-screen but radius extends into view
      expect(isVisible).toBe(true)
    })
  })

  describe('Performance Tracking', () => {
    test('should track culling statistics', () => {
      const entities = [
        { id: 1, x: 500, y: 300 },
        { id: 2, x: -500, y: 300 },
        { id: 3, x: 800, y: 400 }
      ]

      culling.cullEntities(entities, camera)

      const stats = culling.getStats()

      expect(stats.totalEntities).toBe(3)
      expect(stats.visibleEntities).toBe(2)
      expect(stats.culledEntities).toBe(1)
      expect(stats.cullPercentage).toBeCloseTo(33.3, 1)
    })

    test('should reset statistics', () => {
      const entities = [{ id: 1, x: 500, y: 300 }]
      culling.cullEntities(entities, camera)

      culling.resetStats()

      const stats = culling.getStats()
      expect(stats.totalEntities).toBe(0)
    })
  })

  describe('Frustum Culling', () => {
    test('should perform frustum culling with multiple cameras', () => {
      const entities = [
        { id: 1, x: 500, y: 300 },
        { id: 2, x: 1500, y: 300 }
      ]

      const camera1 = { x: 0, y: 0, width: 1000, height: 600, zoom: 1 }
      const camera2 = { x: 1000, y: 0, width: 1000, height: 600, zoom: 1 }

      const visible1 = culling.cullEntities(entities, camera1)
      const visible2 = culling.cullEntities(entities, camera2)

      expect(visible1.map(e => e.id)).toEqual([1])
      expect(visible2.map(e => e.id)).toEqual([2])
    })
  })

  describe('Update Throttling', () => {
    test('should support update throttling for slow-moving cameras', () => {
      const entities = [{ id: 1, x: 500, y: 300 }]

      const result1 = culling.shouldUpdateCulling(camera, performance.now())
      expect(result1).toBe(true)

      // Immediate second call should be throttled
      const result2 = culling.shouldUpdateCulling(camera, performance.now() + 10)
      expect(result2).toBe(false)
    })

    test('should force update when camera moves significantly', () => {
      const entities = [{ id: 1, x: 500, y: 300 }]

      culling.shouldUpdateCulling(camera, performance.now())

      // Move camera significantly
      camera.x += 500

      const result = culling.shouldUpdateCulling(camera, performance.now() + 10)
      expect(result).toBe(true)
    })
  })

  describe('Priority Levels', () => {
    test('should never cull important entities', () => {
      const entities = [
        { id: 1, x: -500, y: 300, priority: 'critical' },
        { id: 2, x: -500, y: 400 }
      ]

      const visible = culling.cullEntities(entities, camera, { respectPriority: true })

      // Critical entity always visible
      expect(visible.map(e => e.id)).toEqual([1])
    })

    test('should cull low-priority entities more aggressively', () => {
      const entities = [
        { id: 1, x: camera.width + 150, y: 300, priority: 'low' },
        { id: 2, x: camera.width + 150, y: 400, priority: 'normal' }
      ]

      const visible = culling.cullEntities(entities, camera, { aggressiveCulling: true })

      // Low priority culled more aggressively
      expect(visible.length).toBeLessThan(entities.length)
    })
  })

  describe('Spatial Partitioning Integration', () => {
    test('should work with quadtree for faster culling', () => {
      // Create many entities
      const entities = []
      for (let i = 0; i < 1000; i++) {
        entities.push({
          id: i,
          x: Math.random() * 5000,
          y: Math.random() * 5000
        })
      }

      const startTime = performance.now()
      const visible = culling.cullEntities(entities, camera)
      const endTime = performance.now()

      // Should complete quickly even with 1000 entities
      expect(endTime - startTime).toBeLessThan(10) // Under 10ms
      expect(visible.length).toBeGreaterThan(0)
      expect(visible.length).toBeLessThan(entities.length)
    })
  })
})
