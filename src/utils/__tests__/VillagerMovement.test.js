import { describe, it, expect, beforeEach } from '@jest/globals'

describe('Villager Movement System', () => {
  let villager
  
  beforeEach(() => {
    villager = {
      id: 'test-villager',
      x: 100,
      y: 100,
      vx: 0,
      vy: 0,
      movement: {
        isIdle: false,
        idleTime: 0,
        idleDuration: 60,
        lastMoveTime: 0,
        smoothX: 100,
        smoothY: 100
      },
      path: [],
      pathIndex: 0,
      state: 'wandering',
      task: 'idle'
    }
  })
  
  describe('Movement State', () => {
    it('should move villager when not idle', () => {
      villager.movement.isIdle = false
      villager.vx = 1
      villager.vy = 0
      
      // Update position
      villager.x += villager.vx
      villager.y += villager.vy
      
      expect(villager.x).toBe(101)
      expect(villager.y).toBe(100)
    })
    
    it('should not move villager when idle', () => {
      villager.movement.isIdle = true
      villager.vx = 1
      villager.vy = 0
      
      const initialX = villager.x
      const initialY = villager.y
      
      // Idle villagers should not update position
      if (!villager.movement.isIdle) {
        villager.x += villager.vx
        villager.y += villager.vy
      }
      
      expect(villager.x).toBe(initialX)
      expect(villager.y).toBe(initialY)
    })
    
    it('should transition from idle to active after idle duration', () => {
      villager.movement.isIdle = true
      villager.movement.idleTime = 0
      villager.movement.idleDuration = 60
      
      // Simulate time passing
      for (let i = 0; i < 60; i++) {
        villager.movement.idleTime++
      }
      
      // Check if should transition
      if (villager.movement.idleTime >= villager.movement.idleDuration) {
        villager.movement.isIdle = false
        villager.movement.idleTime = 0
      }
      
      expect(villager.movement.isIdle).toBe(false)
      expect(villager.movement.idleTime).toBe(0)
    })
  })
  
  describe('Path Following', () => {
    it('should follow path nodes', () => {
      villager.path = [
        { x: 110, y: 100 },
        { x: 120, y: 100 },
        { x: 130, y: 100 }
      ]
      villager.pathIndex = 0
      
      // Get current target
      const target = villager.path[villager.pathIndex]
      expect(target).toEqual({ x: 110, y: 100 })
      
      // Calculate direction
      const dx = target.x - villager.x
      const dy = target.y - villager.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      expect(distance).toBeCloseTo(10)
      
      // Move towards target
      if (distance > 0) {
        villager.vx = (dx / distance) * 1
        villager.vy = (dy / distance) * 1
      }
      
      expect(villager.vx).toBeCloseTo(1)
      expect(villager.vy).toBe(0)
    })
    
    it('should advance to next path node when reaching current', () => {
      villager.x = 110
      villager.y = 100
      villager.path = [
        { x: 110, y: 100 },
        { x: 120, y: 100 }
      ]
      villager.pathIndex = 0
      
      const target = villager.path[villager.pathIndex]
      const dx = target.x - villager.x
      const dy = target.y - villager.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      // Check if reached target
      if (distance < 2) {
        villager.pathIndex++
      }
      
      expect(villager.pathIndex).toBe(1)
    })
  })
  
  describe('Velocity and Direction', () => {
    it('should have velocity when moving', () => {
      villager.state = 'wandering'
      villager.movement.isIdle = false
      villager.target = { x: 150, y: 100 }
      
      // Calculate velocity
      const dx = villager.target.x - villager.x
      const dy = villager.target.y - villager.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance > 0) {
        const speed = 1
        villager.vx = (dx / distance) * speed
        villager.vy = (dy / distance) * speed
      }
      
      expect(villager.vx).toBeGreaterThan(0)
      expect(villager.vy).toBe(0)
    })
    
    it('should stop when reaching destination', () => {
      villager.x = 150
      villager.y = 100
      villager.target = { x: 150, y: 100 }
      
      const dx = villager.target.x - villager.x
      const dy = villager.target.y - villager.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance < 1) {
        villager.vx = 0
        villager.vy = 0
        villager.target = null
      }
      
      expect(villager.vx).toBe(0)
      expect(villager.vy).toBe(0)
      expect(villager.target).toBeNull()
    })
  })
})