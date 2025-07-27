import { ScalingSystem } from '../ScalingSystem'

// Mock canvas and context
const createMockCanvas = () => ({
  width: 800,
  height: 600,
  style: {
    width: '800px',
    height: '600px'
  },
  getBoundingClientRect: jest.fn().mockReturnValue({
    width: 800,
    height: 600,
    left: 0,
    top: 0
  }),
  getContext: jest.fn().mockReturnValue(createMockContext())
})

const createMockContext = () => ({
  save: jest.fn(),
  restore: jest.fn(),
  scale: jest.fn(),
  translate: jest.fn(),
  clearRect: jest.fn(),
  imageSmoothingEnabled: true,
  imageSmoothingQuality: 'high',
  setTransform: jest.fn(),
  getTransform: jest.fn().mockReturnValue({
    a: 1, b: 0, c: 0, d: 1, e: 0, f: 0
  }),
})

// Mock window properties
global.devicePixelRatio = 1

describe('ScalingSystem', () => {
  let scalingSystem
  let canvas
  let ctx

  beforeEach(() => {
    jest.clearAllMocks()
    canvas = createMockCanvas()
    ctx = canvas.getContext()
    scalingSystem = new ScalingSystem(canvas)
  })

  describe('Responsive Canvas Scaling', () => {
    it('should initialize with default scale', () => {
      expect(scalingSystem.getScale()).toBe(1)
      expect(scalingSystem.getViewport()).toEqual({
        x: 0,
        y: 0,
        width: 800,
        height: 600
      })
    })

    it('should handle window resize events', () => {
      // Change canvas size
      canvas.getBoundingClientRect.mockReturnValue({
        width: 1200,
        height: 800,
        left: 0,
        top: 0
      })

      scalingSystem.handleResize()

      const viewport = scalingSystem.getViewport()
      expect(viewport.width).toBe(1200)
      expect(viewport.height).toBe(800)
    })

    it('should maintain aspect ratio when resizing', () => {
      const initialAspectRatio = 800 / 600  // 1.333...

      // Resize to different aspect ratio (wider window)
      canvas.getBoundingClientRect.mockReturnValue({
        width: 1000,
        height: 600,  // Keep height same to make math clearer
        left: 0,
        top: 0
      })

      scalingSystem.handleResize({ maintainAspectRatio: true })

      const viewport = scalingSystem.getViewport()
      const newAspectRatio = viewport.width / viewport.height

      // Should maintain the 4:3 aspect ratio
      // With height=600 and aspect=4/3, width should be 800
      expect(viewport.width).toBe(800)
      expect(viewport.height).toBe(600)
      expect(newAspectRatio).toBeCloseTo(initialAspectRatio, 2)
    })

    it('should handle high DPI displays', () => {
      global.devicePixelRatio = 2

      const hdpiSystem = new ScalingSystem(canvas)
      
      expect(canvas.width).toBe(1600) // 800 * 2
      expect(canvas.height).toBe(1200) // 600 * 2
      expect(canvas.style.width).toBe('800px')
      expect(canvas.style.height).toBe('600px')
    })

    it('should apply device pixel ratio to context scaling', () => {
      global.devicePixelRatio = 2
      
      const hdpiSystem = new ScalingSystem(canvas)
      hdpiSystem.applyScale(ctx)

      expect(ctx.scale).toHaveBeenCalledWith(2, 2)
    })
  })

  describe('UI Element Scaling', () => {
    it('should scale UI elements based on zoom level', () => {
      const uiElement = {
        baseSize: 32,
        minSize: 16,
        maxSize: 64
      }

      // Test different zoom levels
      const zoomLevels = [0.5, 1, 2, 4]
      const expectedSizes = [16, 32, 64, 64] // Clamped to max

      zoomLevels.forEach((zoom, index) => {
        scalingSystem.setScale(zoom)
        const scaledSize = scalingSystem.scaleUIElement(uiElement)
        expect(scaledSize).toBe(expectedSizes[index])
      })
    })

    it('should scale fonts appropriately', () => {
      const baseFontSize = 14

      scalingSystem.setScale(0.5)
      expect(scalingSystem.scaleFontSize(baseFontSize)).toBe(12) // Min font size

      scalingSystem.setScale(2)
      expect(scalingSystem.scaleFontSize(baseFontSize)).toBe(28)

      scalingSystem.setScale(4)
      expect(scalingSystem.scaleFontSize(baseFontSize)).toBe(48) // Max reasonable size
    })

    it('should provide consistent UI scaling across elements', () => {
      const uiConfig = {
        button: { width: 100, height: 40 },
        icon: { size: 24 },
        margin: 8,
        padding: 4
      }

      scalingSystem.setScale(1.5)

      const scaledUI = scalingSystem.scaleUIConfig(uiConfig)

      expect(scaledUI.button.width).toBe(150)
      expect(scaledUI.button.height).toBe(60)
      expect(scaledUI.icon.size).toBe(36)
      expect(scaledUI.margin).toBe(12)
      expect(scaledUI.padding).toBe(6)
    })

    it('should handle responsive breakpoints', () => {
      const breakpoints = scalingSystem.getUIBreakpoints()

      expect(breakpoints).toEqual({
        small: { maxWidth: 768, scale: 0.8 },
        medium: { maxWidth: 1024, scale: 1 },
        large: { maxWidth: 1440, scale: 1.2 },
        xlarge: { minWidth: 1440, scale: 1.5 }
      })
    })
  })

  describe('Zoom Level Transitions', () => {
    it('should smoothly interpolate zoom changes', () => {
      scalingSystem.setScale(1)
      
      const frames = []
      scalingSystem.smoothZoom(2, 500, (currentScale) => {
        frames.push(currentScale)
      })

      // Simulate animation frames
      const startTime = Date.now()
      while (Date.now() - startTime < 600) {
        scalingSystem.update(16)
      }

      expect(frames.length).toBeGreaterThan(10)
      expect(frames[0]).toBeCloseTo(1, 1)
      expect(frames[frames.length - 1]).toBeCloseTo(2, 1)

      // Check smooth progression
      for (let i = 1; i < frames.length; i++) {
        expect(frames[i]).toBeGreaterThanOrEqual(frames[i - 1])
      }
    })

    it('should handle zoom limits', () => {
      scalingSystem.setZoomLimits(0.5, 4)

      scalingSystem.setScale(0.1)
      expect(scalingSystem.getScale()).toBe(0.5)

      scalingSystem.setScale(10)
      expect(scalingSystem.getScale()).toBe(4)
    })

    it('should center zoom on specific point', () => {
      const zoomPoint = { x: 400, y: 300 }
      
      scalingSystem.zoomToPoint(zoomPoint, 2)

      const viewport = scalingSystem.getViewport()
      
      // The zoom point should remain at the same screen position
      const worldPoint = scalingSystem.screenToWorld(zoomPoint)
      const backToScreen = scalingSystem.worldToScreen(worldPoint)

      expect(backToScreen.x).toBeCloseTo(zoomPoint.x, 1)
      expect(backToScreen.y).toBeCloseTo(zoomPoint.y, 1)
    })

    it('should support preset zoom levels', () => {
      const presets = scalingSystem.getZoomPresets()

      expect(presets).toEqual({
        fit: 'fit',
        '50%': 0.5,
        '100%': 1,
        '200%': 2,
        '400%': 4
      })

      scalingSystem.setZoomPreset('200%')
      expect(scalingSystem.getScale()).toBe(2)
    })
  })

  describe('Pixel-Perfect Rendering', () => {
    it('should snap positions to pixel boundaries', () => {
      const positions = [
        { x: 10.3, y: 20.7 },
        { x: 15.5, y: 25.5 },
        { x: 20.1, y: 30.9 }
      ]

      positions.forEach(pos => {
        const snapped = scalingSystem.snapToPixel(pos)
        expect(snapped.x).toBe(Math.round(pos.x))
        expect(snapped.y).toBe(Math.round(pos.y))
      })
    })

    it('should handle subpixel rendering when appropriate', () => {
      scalingSystem.setRenderMode('smooth')

      const pos = { x: 10.5, y: 20.5 }
      const rendered = scalingSystem.getRenderPosition(pos)

      expect(rendered.x).toBe(10.5)
      expect(rendered.y).toBe(20.5)

      scalingSystem.setRenderMode('crisp')
      const snapped = scalingSystem.getRenderPosition(pos)

      expect(snapped.x).toBe(11)
      expect(snapped.y).toBe(21)
    })

    it('should configure context for pixel-perfect rendering', () => {
      scalingSystem.configureContextForPixelArt(ctx)

      expect(ctx.imageSmoothingEnabled).toBe(false)
      expect(ctx.imageSmoothingQuality).toBe('low')
    })

    it('should align grid-based elements correctly', () => {
      const gridSize = 40
      const positions = [
        { x: 45, y: 85 },
        { x: 120, y: 160 },
        { x: 199, y: 239 }
      ]

      positions.forEach(pos => {
        const aligned = scalingSystem.alignToGrid(pos, gridSize)
        expect(aligned.x % gridSize).toBe(0)
        expect(aligned.y % gridSize).toBe(0)
      })
    })
  })

  describe('Coordinate Transformations', () => {
    it('should convert screen to world coordinates', () => {
      scalingSystem.setScale(2)
      scalingSystem.setOffset({ x: 100, y: 50 })

      const screenPos = { x: 400, y: 300 }
      const worldPos = scalingSystem.screenToWorld(screenPos)

      expect(worldPos.x).toBe(150) // (400 - 100) / 2
      expect(worldPos.y).toBe(125) // (300 - 50) / 2
    })

    it('should convert world to screen coordinates', () => {
      scalingSystem.setScale(2)
      scalingSystem.setOffset({ x: 100, y: 50 })

      const worldPos = { x: 150, y: 125 }
      const screenPos = scalingSystem.worldToScreen(worldPos)

      expect(screenPos.x).toBe(400) // 150 * 2 + 100
      expect(screenPos.y).toBe(300) // 125 * 2 + 50
    })

    it('should handle mouse position scaling', () => {
      scalingSystem.setScale(1.5)

      const mouseEvent = {
        clientX: 600,
        clientY: 400
      }

      canvas.getBoundingClientRect.mockReturnValue({
        left: 50,
        top: 100,
        width: 800,
        height: 600
      })

      const worldPos = scalingSystem.getMouseWorldPosition(mouseEvent)

      expect(worldPos.x).toBeCloseTo(366.67, 1) // (600 - 50) / 1.5
      expect(worldPos.y).toBeCloseTo(200, 1) // (400 - 100) / 1.5
    })
  })

  describe('Performance Optimizations', () => {
    it('should cache transformation matrices', () => {
      const transform1 = scalingSystem.getTransformMatrix()
      const transform2 = scalingSystem.getTransformMatrix()

      expect(transform1).toBe(transform2) // Same reference

      scalingSystem.setScale(2)
      const transform3 = scalingSystem.getTransformMatrix()

      expect(transform3).not.toBe(transform1) // New matrix after change
    })

    it('should batch transform updates', () => {
      scalingSystem.beginBatchUpdate()

      scalingSystem.setScale(2)
      scalingSystem.setOffset({ x: 100, y: 100 })
      scalingSystem.rotate(45)

      expect(ctx.setTransform).not.toHaveBeenCalled()

      scalingSystem.endBatchUpdate(ctx)

      expect(ctx.setTransform).toHaveBeenCalledTimes(1)
    })

    it('should provide viewport culling helpers', () => {
      scalingSystem.setViewport({ x: 100, y: 100, width: 800, height: 600 })
      scalingSystem.setScale(1) // Ensure scale is 1

      const objects = [
        { x: 50, y: 50, width: 40, height: 40 },    // Outside (ends at 90,90)
        { x: 150, y: 150, width: 40, height: 40 },  // Inside
        { x: 920, y: 720, width: 40, height: 40 },  // Outside (starts at 920,720)
        { x: 90, y: 90, width: 40, height: 40 },    // Partially visible (overlaps viewport)
      ]

      const visible = objects.filter(obj => 
        scalingSystem.isInViewport(obj)
      )

      expect(visible).toHaveLength(2) // Should be Inside and Partially visible
    })

    it('should optimize rendering based on scale', () => {
      const lodConfig = scalingSystem.getLODConfig()

      scalingSystem.setScale(0.25)
      expect(scalingSystem.getCurrentLOD()).toBe('low')

      scalingSystem.setScale(1)
      expect(scalingSystem.getCurrentLOD()).toBe('medium')

      scalingSystem.setScale(2)
      expect(scalingSystem.getCurrentLOD()).toBe('high')
    })
  })

  describe('Integration with Game Systems', () => {
    it('should provide game-specific scaling utilities', () => {
      const tileSize = 40
      const worldSize = { width: 4000, height: 4000 }

      scalingSystem.configureForTileBasedGame({
        tileSize,
        worldSize,
        minZoom: 0.25,
        maxZoom: 4
      })

      expect(scalingSystem.getTileSize()).toBe(tileSize)
      expect(scalingSystem.getWorldBounds()).toEqual(worldSize)
    })

    it('should handle camera following', () => {
      const target = { x: 500, y: 400 }
      
      // Method should exist despite property name collision
      // The property overwrites the method, so we need to call it differently
      
      scalingSystem.followTarget(target, {
        smoothing: 0.1,
        offset: { x: 0, y: -50 }
      })

      // Update many times to allow smooth follow to converge
      for (let i = 0; i < 50; i++) {
        scalingSystem.update(16)
      }

      const viewport = scalingSystem.getViewport()
      
      // Calculate world center of viewport
      const worldCenter = scalingSystem.screenToWorld({
        x: viewport.width / 2,
        y: viewport.height / 2
      })

      // Camera should be centered near the target (within reasonable distance)
      expect(Math.abs(worldCenter.x - target.x)).toBeLessThan(50)
      expect(Math.abs(worldCenter.y - (target.y - 50))).toBeLessThan(50)
    })

    it('should support minimap scaling', () => {
      const minimapSize = { width: 200, height: 150 }
      const worldSize = { width: 4000, height: 3000 }

      const minimapScale = scalingSystem.getMinimapScale(
        minimapSize,
        worldSize
      )

      expect(minimapScale).toBe(0.05) // 200/4000
    })
  })
})