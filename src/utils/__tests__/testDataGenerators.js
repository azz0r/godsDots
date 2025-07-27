/**
 * Test data generators for visual system tests
 */

export const TestDataGenerators = {
  /**
   * Generate random terrain tiles for testing
   */
  generateTerrain: (count, options = {}) => {
    const terrainTypes = options.types || [
      'grass', 'forest', 'hills', 'water', 'sand', 'mountain'
    ]
    
    const tiles = []
    const tileSize = options.tileSize || 40
    const gridSize = Math.ceil(Math.sqrt(count))
    
    for (let i = 0; i < count; i++) {
      const x = (i % gridSize) * tileSize
      const y = Math.floor(i / gridSize) * tileSize
      const type = terrainTypes[Math.floor(Math.random() * terrainTypes.length)]
      
      tiles.push({
        x,
        y,
        width: tileSize,
        height: tileSize,
        type,
        elevation: Math.random(),
        moisture: Math.random(),
        temperature: Math.random(),
        fertility: Math.random() * 0.5 + 0.5,
        walkable: type !== 'water' && type !== 'deepWater',
        ...options.additionalProps
      })
    }
    
    return tiles
  },

  /**
   * Generate terrain map for lookups
   */
  generateTerrainMap: (terrain) => {
    const map = new Map()
    terrain.forEach(tile => {
      map.set(`${tile.x},${tile.y}`, tile)
    })
    return map
  },

  /**
   * Generate test villagers
   */
  generateVillagers: (count, options = {}) => {
    const villagers = []
    const centerX = options.centerX || 500
    const centerY = options.centerY || 500
    const spread = options.spread || 200
    
    const states = options.states || ['idle', 'wandering', 'working', 'fleeing']
    const tasks = options.tasks || ['idle', 'gather_wood', 'gather_stone', 'build', 'farm']
    
    for (let i = 0; i < count; i++) {
      villagers.push({
        id: i,
        x: centerX + (Math.random() - 0.5) * spread,
        y: centerY + (Math.random() - 0.5) * spread,
        vx: 0,
        vy: 0,
        health: Math.random() * 50 + 50,
        happiness: Math.random() * 50 + 50,
        hunger: Math.random() * 100,
        age: Math.random() * 60 + 18,
        state: states[Math.floor(Math.random() * states.length)],
        task: tasks[Math.floor(Math.random() * tasks.length)],
        target: null,
        homeBuilding: null,
        selected: false,
        pathfinding: {
          currentPath: null,
          targetNode: null,
          stuck: 0,
          lastPathUpdate: 0
        },
        movement: {
          isIdle: Math.random() > 0.7,
          idleTime: 0,
          idleDuration: Math.random() * 120 + 60,
          lastMoveTime: 0
        },
        animation: {
          frame: 0,
          frameDuration: 100,
          lastFrameTime: 0,
          currentAnimation: 'idle'
        },
        ...options.additionalProps
      })
    }
    
    return villagers
  },

  /**
   * Generate test resources
   */
  generateResources: (count, options = {}) => {
    const resources = []
    const resourceTypes = options.types || [
      'tree', 'stone', 'ironOre', 'goldOre', 'berryBush', 'wheat'
    ]
    
    const gridSize = Math.ceil(Math.sqrt(count))
    const spacing = options.spacing || 80
    
    for (let i = 0; i < count; i++) {
      const x = (i % gridSize) * spacing + Math.random() * 20
      const y = Math.floor(i / gridSize) * spacing + Math.random() * 20
      const type = resourceTypes[Math.floor(Math.random() * resourceTypes.length)]
      
      const maxAmounts = {
        tree: 100,
        stone: 200,
        ironOre: 150,
        goldOre: 100,
        berryBush: 50,
        wheat: 75
      }
      
      const maxAmount = maxAmounts[type] || 100
      
      resources.push({
        id: i,
        x: Math.floor(x / 40) * 40, // Align to tile grid
        y: Math.floor(y / 40) * 40,
        type,
        amount: Math.random() * maxAmount,
        maxAmount,
        respawnTime: 300000, // 5 minutes
        lastHarvested: null,
        ...options.additionalProps
      })
    }
    
    return resources
  },

  /**
   * Generate test buildings
   */
  generateBuildings: (count, options = {}) => {
    const buildings = []
    const buildingTypes = options.types || [
      'house', 'farm', 'storage', 'workshop', 'townCenter'
    ]
    
    const sizes = {
      house: { width: 40, height: 40 },
      farm: { width: 80, height: 80 },
      storage: { width: 60, height: 60 },
      workshop: { width: 60, height: 40 },
      townCenter: { width: 80, height: 80 }
    }
    
    for (let i = 0; i < count; i++) {
      const type = buildingTypes[Math.floor(Math.random() * buildingTypes.length)]
      const size = sizes[type]
      
      buildings.push({
        id: i,
        type,
        x: Math.floor(Math.random() * 20) * 40,
        y: Math.floor(Math.random() * 20) * 40,
        width: size.width,
        height: size.height,
        health: Math.random() * 50 + 50,
        maxHealth: 100,
        constructed: Math.random() > 0.2,
        constructionProgress: Math.random() * 100,
        owner: null,
        workers: [],
        resources: {},
        ...options.additionalProps
      })
    }
    
    return buildings
  },

  /**
   * Generate test particles for effects
   */
  generateParticles: (count, options = {}) => {
    const particles = []
    const centerX = options.x || 0
    const centerY = options.y || 0
    const spread = options.spread || 50
    const baseVelocity = options.velocity || 5
    
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5
      const velocity = baseVelocity * (0.5 + Math.random() * 0.5)
      
      particles.push({
        x: centerX + Math.random() * 10 - 5,
        y: centerY + Math.random() * 10 - 5,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        size: options.size || 2 + Math.random() * 4,
        color: options.color || '#ffffff',
        alpha: 1,
        lifetime: 0,
        maxLifetime: options.duration || 1000,
        gravity: options.gravity || 0,
        friction: options.friction || 0.98,
        ...options.additionalProps
      })
    }
    
    return particles
  },

  /**
   * Generate test path nodes
   */
  generatePathNodes: (count, options = {}) => {
    const nodes = []
    const startX = options.startX || 100
    const startY = options.startY || 100
    const spacing = options.spacing || 40
    
    // Generate a simple path
    let currentX = startX
    let currentY = startY
    
    for (let i = 0; i < count; i++) {
      nodes.push({
        id: i,
        x: currentX,
        y: currentY,
        connections: [],
        type: options.type || 'road',
        traffic: Math.random() * 10,
        condition: Math.random() * 0.5 + 0.5
      })
      
      // Move to next position
      if (Math.random() > 0.5) {
        currentX += spacing
      } else {
        currentY += spacing
      }
    }
    
    // Connect nodes
    for (let i = 0; i < nodes.length - 1; i++) {
      nodes[i].connections.push(i + 1)
      nodes[i + 1].connections.push(i)
    }
    
    return nodes
  },

  /**
   * Generate test UI elements
   */
  generateUIElements: (options = {}) => {
    return {
      buttons: [
        {
          id: 'build',
          x: 10,
          y: 10,
          width: 100,
          height: 40,
          text: 'Build',
          icon: 'hammer',
          enabled: true,
          visible: true
        },
        {
          id: 'demolish',
          x: 120,
          y: 10,
          width: 100,
          height: 40,
          text: 'Demolish',
          icon: 'wrench',
          enabled: true,
          visible: true
        }
      ],
      panels: [
        {
          id: 'resources',
          x: 10,
          y: 60,
          width: 200,
          height: 100,
          title: 'Resources',
          visible: true,
          minimized: false
        }
      ],
      tooltips: [
        {
          id: 'villager-info',
          x: 0,
          y: 0,
          width: 150,
          height: 80,
          text: 'Villager: John\nHealth: 100\nTask: Gathering',
          visible: false,
          target: null
        }
      ],
      ...options
    }
  },

  /**
   * Generate performance test data
   */
  generatePerformanceData: (options = {}) => {
    const entityCount = options.entityCount || 1000
    const effectCount = options.effectCount || 50
    
    return {
      terrain: TestDataGenerators.generateTerrain(
        Math.ceil(entityCount / 10),
        { types: ['grass', 'forest', 'water'] }
      ),
      villagers: TestDataGenerators.generateVillagers(
        Math.ceil(entityCount / 4),
        { spread: 1000 }
      ),
      buildings: TestDataGenerators.generateBuildings(
        Math.ceil(entityCount / 20),
        { types: ['house', 'farm'] }
      ),
      resources: TestDataGenerators.generateResources(
        Math.ceil(entityCount / 10),
        { spacing: 120 }
      ),
      effects: Array(effectCount).fill(null).map(() => ({
        particles: TestDataGenerators.generateParticles(20, {
          x: Math.random() * 1000,
          y: Math.random() * 1000
        })
      }))
    }
  },

  /**
   * Generate mock canvas rendering calls
   */
  generateRenderCalls: (count, ctx) => {
    const calls = []
    
    for (let i = 0; i < count; i++) {
      const callType = Math.random()
      
      if (callType < 0.3) {
        // Rectangle
        calls.push(() => {
          ctx.fillStyle = '#' + Math.floor(Math.random()*16777215).toString(16)
          ctx.fillRect(
            Math.random() * 800,
            Math.random() * 600,
            20 + Math.random() * 40,
            20 + Math.random() * 40
          )
        })
      } else if (callType < 0.6) {
        // Circle
        calls.push(() => {
          ctx.fillStyle = '#' + Math.floor(Math.random()*16777215).toString(16)
          ctx.beginPath()
          ctx.arc(
            Math.random() * 800,
            Math.random() * 600,
            5 + Math.random() * 20,
            0,
            Math.PI * 2
          )
          ctx.fill()
        })
      } else {
        // Line
        calls.push(() => {
          ctx.strokeStyle = '#' + Math.floor(Math.random()*16777215).toString(16)
          ctx.beginPath()
          ctx.moveTo(Math.random() * 800, Math.random() * 600)
          ctx.lineTo(Math.random() * 800, Math.random() * 600)
          ctx.stroke()
        })
      }
    }
    
    return calls
  }
}

export default TestDataGenerators