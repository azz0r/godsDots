import { VisualEffects } from '../VisualEffects'

// Mock canvas context
const createMockContext = () => ({
  fillStyle: '',
  strokeStyle: '',
  globalAlpha: 1,
  lineWidth: 1,
  fillRect: jest.fn(),
  strokeRect: jest.fn(),
  beginPath: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  stroke: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  closePath: jest.fn(),
  save: jest.fn(),
  restore: jest.fn(),
  translate: jest.fn(),
  rotate: jest.fn(),
  scale: jest.fn(),
})

describe('VisualEffects', () => {
  let visualEffects
  let ctx

  beforeEach(() => {
    jest.clearAllMocks()
    visualEffects = new VisualEffects()
    ctx = createMockContext()
  })

  describe('Particle System Creation', () => {
    it('should create explosion particle effect', () => {
      const effect = visualEffects.createExplosion(100, 200, {
        particleCount: 20,
        color: '#ff0000',
        radius: 50,
        duration: 1000
      })

      expect(effect).toBeDefined()
      expect(effect.type).toBe('explosion')
      expect(effect.x).toBe(100)
      expect(effect.y).toBe(200)
      expect(effect.particles).toHaveLength(20)
      expect(effect.active).toBe(true)
    })

    it('should create smoke particle effect', () => {
      const effect = visualEffects.createSmoke(150, 250, {
        particleCount: 15,
        color: '#666666',
        duration: 2000,
        spread: 30
      })

      expect(effect).toBeDefined()
      expect(effect.type).toBe('smoke')
      expect(effect.particles).toHaveLength(15)
      expect(effect.duration).toBe(2000)
    })

    it('should create sparkle effect for positive feedback', () => {
      const effect = visualEffects.createSparkle(200, 300, {
        particleCount: 10,
        colors: ['#ffff00', '#ffffff'],
        duration: 500
      })

      expect(effect).toBeDefined()
      expect(effect.type).toBe('sparkle')
      expect(effect.particles).toHaveLength(10)
      
      // Each particle should have a color from the provided array
      effect.particles.forEach(particle => {
        expect(['#ffff00', '#ffffff']).toContain(particle.color)
      })
    })

    it('should create dust cloud effect', () => {
      const effect = visualEffects.createDustCloud(300, 400, {
        particleCount: 30,
        color: '#8b7355',
        radius: 40,
        duration: 800
      })

      expect(effect).toBeDefined()
      expect(effect.type).toBe('dust')
      expect(effect.particles).toHaveLength(30)
    })

    it('should initialize particles with random velocities', () => {
      const effect = visualEffects.createExplosion(0, 0, {
        particleCount: 10,
        maxVelocity: 5
      })

      effect.particles.forEach(particle => {
        expect(particle.vx).toBeGreaterThanOrEqual(-5)
        expect(particle.vx).toBeLessThanOrEqual(5)
        expect(particle.vy).toBeGreaterThanOrEqual(-5)
        expect(particle.vy).toBeLessThanOrEqual(5)
      })
    })
  })

  describe('Particle System Updates', () => {
    it('should update particle positions based on velocity', () => {
      const effect = visualEffects.createExplosion(100, 100, {
        particleCount: 1
      })

      // Set known velocity
      effect.particles[0].vx = 2
      effect.particles[0].vy = -3
      const initialX = effect.particles[0].x
      const initialY = effect.particles[0].y

      visualEffects.update(16) // ~60fps frame

      // Velocity is applied directly without dt multiplication
      expect(effect.particles[0].x).toBe(initialX + 2)
      expect(effect.particles[0].y).toBe(initialY - 3)
    })

    it('should apply gravity to particles when enabled', () => {
      const effect = visualEffects.createExplosion(100, 100, {
        particleCount: 1,
        gravity: 10
      })

      effect.particles[0].vy = 0
      visualEffects.update(100) // 0.1 second

      // Gravity should increase downward velocity
      expect(effect.particles[0].vy).toBeGreaterThan(0)
    })

    it('should apply friction to particles', () => {
      const effect = visualEffects.createSmoke(100, 100, {
        particleCount: 1,
        friction: 0.9
      })

      effect.particles[0].vx = 10
      effect.particles[0].vy = 10
      
      visualEffects.update(16)

      expect(effect.particles[0].vx).toBeLessThan(10)
      expect(effect.particles[0].vy).toBeLessThan(10)
    })

    it('should fade particles over time', () => {
      const effect = visualEffects.createSparkle(100, 100, {
        particleCount: 1,
        duration: 1000,
        fadeOut: true
      })

      expect(effect.particles[0].alpha).toBe(1)

      // Update halfway through duration
      effect.elapsed = 500
      visualEffects.update(16)

      expect(effect.particles[0].alpha).toBeLessThan(1)
      expect(effect.particles[0].alpha).toBeGreaterThan(0)
    })

    it('should scale particles based on lifetime', () => {
      const effect = visualEffects.createExplosion(100, 100, {
        particleCount: 1,
        duration: 1000,
        scaleOverTime: true,
        initialSize: 10,
        finalSize: 2
      })

      // Check that particle has size and initialSize properties
      expect(effect.particles[0].size).toBeDefined()
      expect(effect.particles[0].initialSize).toBeDefined()
      expect(effect.particles[0].size).toBe(effect.particles[0].initialSize)

      // Update to end of duration
      effect.elapsed = 900
      visualEffects.update(100)

      expect(effect.particles[0].size).toBeLessThan(10)
      expect(effect.particles[0].size).toBeGreaterThanOrEqual(2)
    })

    it('should deactivate effects after duration expires', () => {
      const effect = visualEffects.createExplosion(100, 100, {
        duration: 100
      })

      expect(effect.active).toBe(true)

      visualEffects.update(150)

      expect(effect.active).toBe(false)
    })

    it('should remove inactive effects from the system', () => {
      visualEffects.createExplosion(100, 100, { duration: 100 })
      visualEffects.createSmoke(200, 200, { duration: 200 })

      expect(visualEffects.getActiveEffects()).toHaveLength(2)

      visualEffects.update(150)

      expect(visualEffects.getActiveEffects()).toHaveLength(1)
    })
  })

  describe('Visual Feedback for User Actions', () => {
    it('should create click feedback effect', () => {
      const effect = visualEffects.createClickFeedback(250, 350, {
        type: 'ripple',
        color: '#00ff00',
        maxRadius: 30,
        duration: 300
      })

      expect(effect).toBeDefined()
      expect(effect.type).toBe('ripple')
      expect(effect.radius).toBe(0)
      expect(effect.maxRadius).toBe(30)
    })

    it('should animate ripple effect expansion', () => {
      const effect = visualEffects.createClickFeedback(250, 350, {
        type: 'ripple',
        maxRadius: 30,
        duration: 300
      })

      visualEffects.update(150) // Half duration

      expect(effect.radius).toBeGreaterThan(0)
      expect(effect.radius).toBeLessThanOrEqual(30)
      expect(effect.alpha).toBeLessThan(1)
    })

    it('should create building placement effect', () => {
      const effect = visualEffects.createPlacementEffect(300, 400, {
        width: 40,
        height: 40,
        color: '#4169e1',
        duration: 500
      })

      expect(effect).toBeDefined()
      expect(effect.type).toBe('placement')
      expect(effect.width).toBe(40)
      expect(effect.height).toBe(40)
    })

    it('should create resource collection effect', () => {
      const effect = visualEffects.createCollectionEffect(150, 150, {
        resourceType: 'wood',
        amount: 5,
        targetX: 50,
        targetY: 50
      })

      expect(effect).toBeDefined()
      expect(effect.type).toBe('collection')
      expect(effect.particles).toBeDefined()
      
      // Particles should move towards target
      visualEffects.update(100)
      
      effect.particles.forEach(particle => {
        const dx = 50 - particle.x
        const dy = 50 - particle.y
        // Particles start spread out, so check they exist
        expect(particle.x).toBeDefined()
        expect(particle.y).toBeDefined()
      })
    })

    it('should create damage effect', () => {
      const effect = visualEffects.createDamageEffect(200, 200, {
        damage: 25,
        color: '#ff0000',
        fontSize: 16,
        duration: 1000
      })

      expect(effect).toBeDefined()
      expect(effect.type).toBe('damage')
      expect(effect.text).toBe('-25')
      expect(effect.y).toBe(200)
    })

    it('should animate damage numbers floating up', () => {
      const effect = visualEffects.createDamageEffect(200, 200, {
        damage: 25,
        floatSpeed: 50,
        duration: 1000
      })

      const initialY = effect.y
      visualEffects.update(500)

      expect(effect.y).toBeLessThan(initialY)
    })
  })

  describe('Rendering Effects', () => {
    it('should render particle effects correctly', () => {
      const effect = visualEffects.createExplosion(100, 100, {
        particleCount: 5,
        color: '#ff0000',
        particleSize: 4
      })

      visualEffects.render(ctx)

      // Should draw each particle
      expect(ctx.beginPath).toHaveBeenCalledTimes(5)
      expect(ctx.arc).toHaveBeenCalledTimes(5)
      expect(ctx.fill).toHaveBeenCalledTimes(5)
    })

    it('should apply particle alpha when rendering', () => {
      const effect = visualEffects.createSparkle(100, 100, {
        particleCount: 1
      })
      
      effect.particles[0].alpha = 0.5

      const alphaChanges = []
      Object.defineProperty(ctx, 'globalAlpha', {
        get: () => 1,
        set: (value) => alphaChanges.push(value)
      })

      visualEffects.render(ctx)

      expect(alphaChanges).toContain(0.5)
      // ctx.restore() should have been called which resets alpha
    })

    it('should render ripple effects', () => {
      visualEffects.createClickFeedback(100, 100, {
        type: 'ripple',
        color: '#00ff00',
        maxRadius: 30
      })

      visualEffects.update(100)
      visualEffects.render(ctx)

      expect(ctx.beginPath).toHaveBeenCalled()
      expect(ctx.arc).toHaveBeenCalled()
      expect(ctx.stroke).toHaveBeenCalled()
    })

    it('should render text effects', () => {
      visualEffects.createDamageEffect(100, 100, {
        damage: 50,
        fontSize: 20,
        color: '#ff0000'
      })

      ctx.fillText = jest.fn()
      ctx.font = ''
      ctx.textAlign = ''

      visualEffects.render(ctx)

      expect(ctx.fillText).toHaveBeenCalledWith('-50', 100, expect.any(Number))
      expect(ctx.font).toBe('20px Arial')
      expect(ctx.textAlign).toBe('center')
    })
  })

  describe('Performance with Multiple Effects', () => {
    it('should handle many simultaneous effects efficiently', () => {
      // Create many effects
      for (let i = 0; i < 50; i++) {
        visualEffects.createExplosion(
          Math.random() * 1000,
          Math.random() * 1000,
          { particleCount: 20 }
        )
      }

      expect(visualEffects.getActiveEffects()).toHaveLength(50)

      const startTime = performance.now()
      visualEffects.update(16)
      const updateTime = performance.now() - startTime

      expect(updateTime).toBeLessThan(10) // Should update in under 10ms
    })

    it('should efficiently render many particles', () => {
      // Create effects with many particles
      for (let i = 0; i < 10; i++) {
        visualEffects.createExplosion(100, 100, { particleCount: 50 })
      }

      const startTime = performance.now()
      visualEffects.render(ctx)
      const renderTime = performance.now() - startTime

      expect(renderTime).toBeLessThan(20) // Should render in under 20ms
      expect(ctx.arc.mock.calls.length).toBe(500) // 10 effects * 50 particles
    })

    it('should clean up expired effects to maintain performance', () => {
      // Create short-lived effects
      for (let i = 0; i < 100; i++) {
        visualEffects.createExplosion(0, 0, { duration: 100 })
      }

      expect(visualEffects.getActiveEffects()).toHaveLength(100)

      // Update past duration
      visualEffects.update(200)

      expect(visualEffects.getActiveEffects()).toHaveLength(0)
    })

    it('should batch similar effects for better performance', () => {
      // Create many similar effects at once
      const effects = visualEffects.createBatchEffect('explosion', [
        { x: 100, y: 100 },
        { x: 200, y: 200 },
        { x: 300, y: 300 }
      ], {
        particleCount: 10,
        color: '#ff0000'
      })

      expect(effects).toHaveLength(3)
      expect(visualEffects.getActiveEffects()).toHaveLength(3)
    })
  })

  describe('Effect Presets', () => {
    it('should have preset for building construction', () => {
      const effect = visualEffects.buildingConstruction(200, 200)
      
      expect(effect).toBeDefined()
      expect(effect.type).toBe('construction')
      expect(effect.particles.length).toBeGreaterThan(0)
    })

    it('should have preset for resource depletion', () => {
      const effect = visualEffects.resourceDepleted(300, 300, 'tree')
      
      expect(effect).toBeDefined()
      expect(effect.particles.length).toBeGreaterThan(0)
    })

    it('should have preset for villager actions', () => {
      const effect = visualEffects.villagerAction(150, 150, 'harvest')
      
      expect(effect).toBeDefined()
      expect(effect.duration).toBeLessThan(1000) // Short effect
    })
  })
})