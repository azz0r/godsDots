import { describe, it, expect, beforeEach, jest } from '@jest/globals'

describe('Path Rendering System', () => {
  let mockCtx
  let pathSystem
  
  beforeEach(() => {
    // Mock canvas context
    mockCtx = {
      strokeStyle: '',
      lineWidth: 1,
      globalAlpha: 1,
      save: jest.fn(),
      restore: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      setLineDash: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      fillStyle: ''
    }
    
    // Mock path system data
    pathSystem = {
      paths: [
        {
          start: { x: 100, y: 100 },
          end: { x: 200, y: 100 },
          type: 'road',
          usage: 5
        },
        {
          start: { x: 200, y: 100 },
          end: { x: 200, y: 200 },
          type: 'path',
          usage: 2
        }
      ],
      renderPaths: function(ctx, showPaths) {
        if (!showPaths) return
        
        ctx.save()
        
        this.paths.forEach(path => {
          ctx.strokeStyle = path.type === 'road' ? '#8B7355' : '#A0522D'
          ctx.lineWidth = path.type === 'road' ? 3 : 2
          ctx.globalAlpha = 0.6
          
          ctx.beginPath()
          ctx.moveTo(path.start.x, path.start.y)
          ctx.lineTo(path.end.x, path.end.y)
          ctx.stroke()
        })
        
        ctx.restore()
      }
    }
  })
  
  describe('Path Visibility', () => {
    it('should render paths when showPaths is true', () => {
      pathSystem.renderPaths(mockCtx, true)
      
      expect(mockCtx.save).toHaveBeenCalled()
      expect(mockCtx.beginPath).toHaveBeenCalledTimes(2)
      expect(mockCtx.moveTo).toHaveBeenCalledTimes(2)
      expect(mockCtx.lineTo).toHaveBeenCalledTimes(2)
      expect(mockCtx.stroke).toHaveBeenCalledTimes(2)
      expect(mockCtx.restore).toHaveBeenCalled()
    })
    
    it('should not render paths when showPaths is false', () => {
      pathSystem.renderPaths(mockCtx, false)
      
      expect(mockCtx.save).not.toHaveBeenCalled()
      expect(mockCtx.beginPath).not.toHaveBeenCalled()
      expect(mockCtx.stroke).not.toHaveBeenCalled()
    })
    
    it('should use different styles for road vs path', () => {
      let strokeStyles = []
      let lineWidths = []
      
      mockCtx.strokeStyle = ''
      mockCtx.lineWidth = 1
      
      // Override setters to capture values
      Object.defineProperty(mockCtx, 'strokeStyle', {
        get: function() { return this._strokeStyle },
        set: function(val) { 
          this._strokeStyle = val
          strokeStyles.push(val)
        }
      })
      
      Object.defineProperty(mockCtx, 'lineWidth', {
        get: function() { return this._lineWidth },
        set: function(val) { 
          this._lineWidth = val
          lineWidths.push(val)
        }
      })
      
      pathSystem.renderPaths(mockCtx, true)
      
      expect(strokeStyles).toContain('#8B7355') // road color
      expect(strokeStyles).toContain('#A0522D') // path color
      expect(lineWidths).toContain(3) // road width
      expect(lineWidths).toContain(2) // path width
    })
  })
  
  describe('Path Node Rendering', () => {
    it('should render path nodes when visible', () => {
      pathSystem.nodes = [
        { x: 100, y: 100, connections: 2 },
        { x: 200, y: 100, connections: 3 }
      ]
      
      pathSystem.renderNodes = function(ctx, showPaths) {
        if (!showPaths) return
        
        this.nodes.forEach(node => {
          ctx.fillStyle = '#654321'
          ctx.beginPath()
          ctx.arc(node.x, node.y, 3, 0, Math.PI * 2)
          ctx.fill()
        })
      }
      
      pathSystem.renderNodes(mockCtx, true)
      
      expect(mockCtx.beginPath).toHaveBeenCalledTimes(2)
      expect(mockCtx.arc).toHaveBeenCalledTimes(2)
      expect(mockCtx.fill).toHaveBeenCalledTimes(2)
    })
  })
  
  describe('Villager Path Rendering', () => {
    it('should render villager path when selected', () => {
      const villager = {
        selected: true,
        path: [
          { x: 100, y: 100 },
          { x: 110, y: 100 },
          { x: 120, y: 100 }
        ],
        pathIndex: 0,
        x: 100,
        y: 100
      }
      
      const renderVillagerPath = (ctx, villager) => {
        if (!villager.selected || !villager.path || villager.path.length < 2) return
        
        ctx.save()
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
        ctx.lineWidth = 2
        ctx.setLineDash([5, 5])
        
        ctx.beginPath()
        ctx.moveTo(villager.x, villager.y)
        
        for (let i = villager.pathIndex; i < villager.path.length; i++) {
          const node = villager.path[i]
          ctx.lineTo(node.x, node.y)
        }
        
        ctx.stroke()
        ctx.setLineDash([])
        ctx.restore()
      }
      
      renderVillagerPath(mockCtx, villager)
      
      expect(mockCtx.save).toHaveBeenCalled()
      expect(mockCtx.setLineDash).toHaveBeenCalledWith([5, 5])
      expect(mockCtx.beginPath).toHaveBeenCalled()
      expect(mockCtx.moveTo).toHaveBeenCalledWith(100, 100)
      expect(mockCtx.lineTo).toHaveBeenCalledTimes(3)
      expect(mockCtx.stroke).toHaveBeenCalled()
      expect(mockCtx.restore).toHaveBeenCalled()
    })
  })
})