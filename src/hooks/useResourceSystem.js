import { useRef, useCallback } from 'react'

export const useResourceSystem = (worldSize, terrainSystem) => {
  const resourcesRef = useRef([])
  const resourceIdCounter = useRef(0)

  const generateResources = useCallback(() => {
    resourcesRef.current = []
    
    // Generate trees on forest terrain
    for (let x = 0; x < worldSize.width; x += 80) {
      for (let y = 0; y < worldSize.height; y += 80) {
        const terrain = terrainSystem.getTerrainAt(x + 40, y + 40)
        
        if (terrain && (terrain.type === 'forest' || (terrain.type === 'grass' && Math.random() < 0.1))) {
          // Add some randomness to tree placement
          const treeX = x + 20 + Math.random() * 40
          const treeY = y + 20 + Math.random() * 40
          
          if (terrainSystem.isWalkable(treeX, treeY)) {
            resourcesRef.current.push({
              id: resourceIdCounter.current++,
              type: 'tree',
              x: treeX,
              y: treeY,
              amount: 50 + Math.random() * 50, // 50-100 wood
              maxAmount: 100,
              regeneration: 0.1, // Slowly regrows
              selected: false,
              beingHarvested: false,
              harvestProgress: 0
            })
          }
        }
        
        // Add berry bushes on grass terrain
        if (terrain && terrain.type === 'grass' && Math.random() < 0.05) {
          const bushX = x + 20 + Math.random() * 40
          const bushY = y + 20 + Math.random() * 40
          
          if (terrainSystem.isWalkable(bushX, bushY)) {
            resourcesRef.current.push({
              id: resourceIdCounter.current++,
              type: 'berries',
              x: bushX,
              y: bushY,
              amount: 20 + Math.random() * 30, // 20-50 food
              maxAmount: 50,
              regeneration: 0.2, // Faster regrowth
              selected: false,
              beingHarvested: false,
              harvestProgress: 0
            })
          }
        }
      }
    }
  }, [worldSize, terrainSystem])

  const updateResources = useCallback((gameTime) => {
    resourcesRef.current.forEach(resource => {
      // Regenerate resources slowly over time
      if (resource.amount < resource.maxAmount && gameTime % 600 === 0) { // Every 10 seconds
        resource.amount = Math.min(resource.maxAmount, resource.amount + resource.regeneration)
      }
      
      // Reset harvest progress if no one is harvesting
      if (!resource.beingHarvested && resource.harvestProgress > 0) {
        resource.harvestProgress = Math.max(0, resource.harvestProgress - 1)
      }
    })
  }, [])

  const getResourceAt = useCallback((x, y, radius = 30) => {
    return resourcesRef.current.find(resource => {
      const distance = Math.sqrt((resource.x - x) ** 2 + (resource.y - y) ** 2)
      return distance <= radius && resource.amount > 0
    })
  }, [])

  const harvestResource = useCallback((resourceId, amount = 1) => {
    const resource = resourcesRef.current.find(r => r.id === resourceId)
    if (resource && resource.amount > 0) {
      const harvested = Math.min(amount, resource.amount)
      resource.amount -= harvested
      return { type: resource.type, amount: harvested }
    }
    return null
  }, [])

  const selectResource = useCallback((x, y) => {
    // Deselect all resources first
    resourcesRef.current.forEach(r => r.selected = false)
    
    // Select resource at position
    const resource = getResourceAt(x, y)
    if (resource) {
      resource.selected = true
      return resource
    }
    return null
  }, [getResourceAt])

  const renderResources = useCallback((ctx) => {
    resourcesRef.current.forEach(resource => {
      if (resource.amount <= 0) return
      
      // Position resources at center of tile
      const centerX = resource.x + 20
      const centerY = resource.y + 20
      
      switch (resource.type) {
        case 'tree':
          renderTree(ctx, { ...resource, x: centerX, y: centerY })
          break
        case 'berries':
        case 'berryBush':
          renderBerryBush(ctx, { ...resource, x: centerX, y: centerY })
          break
        case 'stone':
          renderStone(ctx, { ...resource, x: centerX, y: centerY })
          break
        case 'ironOre':
          renderIronOre(ctx, { ...resource, x: centerX, y: centerY })
          break
        case 'goldOre':
          renderGoldOre(ctx, { ...resource, x: centerX, y: centerY })
          break
        case 'wheat':
          renderWheat(ctx, { ...resource, x: centerX, y: centerY })
          break
        case 'fish':
          renderFish(ctx, { ...resource, x: centerX, y: centerY })
          break
        case 'clay':
          renderClay(ctx, { ...resource, x: centerX, y: centerY })
          break
      }
      
      // Render selection indicator
      if (resource.selected) {
        ctx.strokeStyle = '#ffff00'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(centerX, centerY, 25, 0, Math.PI * 2)
        ctx.stroke()
      }
      
      // Render harvest progress
      if (resource.beingHarvested && resource.harvestProgress > 0) {
        const progress = resource.harvestProgress / 100
        ctx.fillStyle = 'rgba(255, 255, 0, 0.7)'
        ctx.fillRect(centerX - 15, centerY - 35, 30 * progress, 4)
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
        ctx.lineWidth = 1
        ctx.strokeRect(centerX - 15, centerY - 35, 30, 4)
      }
    })
  }, [])

  const renderTree = (ctx, tree) => {
    const size = Math.max(8, (tree.amount / tree.maxAmount) * 15)
    
    // Tree trunk
    ctx.fillStyle = '#8B4513'
    ctx.fillRect(tree.x - 2, tree.y + size - 5, 4, 8)
    
    // Tree canopy
    ctx.fillStyle = tree.amount > 50 ? '#228B22' : '#6B8E23' // Darker when depleted
    ctx.beginPath()
    ctx.arc(tree.x, tree.y, size, 0, Math.PI * 2)
    ctx.fill()
    
    // Lighter center
    ctx.fillStyle = tree.amount > 50 ? '#32CD32' : '#9ACD32'
    ctx.beginPath()
    ctx.arc(tree.x, tree.y, size * 0.6, 0, Math.PI * 2)
    ctx.fill()
  }

  const renderBerryBush = (ctx, bush) => {
    const size = Math.max(6, (bush.amount / bush.maxAmount) * 10)
    
    // Bush base
    ctx.fillStyle = '#556B2F'
    ctx.beginPath()
    ctx.arc(bush.x, bush.y, size, 0, Math.PI * 2)
    ctx.fill()
    
    // Berries (if available)
    if (bush.amount > 10) {
      ctx.fillStyle = '#DC143C'
      for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2
        const berryX = bush.x + Math.cos(angle) * (size * 0.7)
        const berryY = bush.y + Math.sin(angle) * (size * 0.7)
        ctx.beginPath()
        ctx.arc(berryX, berryY, 2, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  const renderStone = (ctx, stone) => {
    const size = Math.max(8, (stone.amount / stone.maxAmount) * 12)
    
    // Stone shape
    ctx.fillStyle = '#696969'
    ctx.beginPath()
    ctx.moveTo(stone.x - size, stone.y + size/2)
    ctx.lineTo(stone.x - size/2, stone.y - size)
    ctx.lineTo(stone.x + size/2, stone.y - size)
    ctx.lineTo(stone.x + size, stone.y + size/2)
    ctx.lineTo(stone.x, stone.y + size)
    ctx.closePath()
    ctx.fill()
    
    // Highlight
    ctx.fillStyle = '#A9A9A9'
    ctx.beginPath()
    ctx.moveTo(stone.x - size/2, stone.y - size)
    ctx.lineTo(stone.x, stone.y - size/2)
    ctx.lineTo(stone.x + size/2, stone.y - size)
    ctx.closePath()
    ctx.fill()
  }

  const renderIronOre = (ctx, ore) => {
    const size = Math.max(6, (ore.amount / ore.maxAmount) * 10)
    
    // Dark ore base
    ctx.fillStyle = '#4B4B4D'
    ctx.fillRect(ore.x - size, ore.y - size, size * 2, size * 2)
    
    // Iron streaks
    ctx.fillStyle = '#8B4513'
    ctx.fillRect(ore.x - size/2, ore.y - size, size, 2)
    ctx.fillRect(ore.x - size, ore.y, 2, size)
    ctx.fillRect(ore.x + size/2, ore.y - size/2, 2, size)
  }

  const renderGoldOre = (ctx, ore) => {
    const size = Math.max(5, (ore.amount / ore.maxAmount) * 8)
    
    // Gold ore
    ctx.fillStyle = '#B8860B'
    ctx.fillRect(ore.x - size, ore.y - size, size * 2, size * 2)
    
    // Gold sparkles
    ctx.fillStyle = '#FFD700'
    for (let i = 0; i < 3; i++) {
      const sparkX = ore.x - size + Math.random() * size * 2
      const sparkY = ore.y - size + Math.random() * size * 2
      ctx.fillRect(sparkX, sparkY, 2, 2)
    }
  }

  const renderWheat = (ctx, wheat) => {
    const amount = wheat.amount / wheat.maxAmount
    
    // Wheat stalks
    ctx.strokeStyle = amount > 0.5 ? '#DAA520' : '#8B7355'
    ctx.lineWidth = 1
    
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2
      const stalkX = wheat.x + Math.cos(angle) * 8
      const stalkY = wheat.y + Math.sin(angle) * 8
      
      ctx.beginPath()
      ctx.moveTo(stalkX, stalkY + 10)
      ctx.lineTo(stalkX, stalkY - 10)
      ctx.stroke()
      
      // Wheat head
      ctx.fillStyle = amount > 0.5 ? '#F4A460' : '#DEB887'
      ctx.fillRect(stalkX - 2, stalkY - 10, 4, 6)
    }
  }

  const renderFish = (ctx, fish) => {
    const size = Math.max(6, (fish.amount / fish.maxAmount) * 10)
    
    // Simple fish shape
    ctx.fillStyle = '#4682B4'
    ctx.beginPath()
    ctx.ellipse(fish.x, fish.y, size, size/2, 0, 0, Math.PI * 2)
    ctx.fill()
    
    // Tail
    ctx.beginPath()
    ctx.moveTo(fish.x + size, fish.y)
    ctx.lineTo(fish.x + size + 4, fish.y - 3)
    ctx.lineTo(fish.x + size + 4, fish.y + 3)
    ctx.closePath()
    ctx.fill()
  }

  const renderClay = (ctx, clay) => {
    const size = Math.max(8, (clay.amount / clay.maxAmount) * 10)
    
    // Clay mound
    ctx.fillStyle = '#CD853F'
    ctx.beginPath()
    ctx.arc(clay.x, clay.y, size, 0, Math.PI * 2)
    ctx.fill()
    
    // Wet clay highlight
    ctx.fillStyle = '#DEB887'
    ctx.beginPath()
    ctx.arc(clay.x - size/3, clay.y - size/3, size/3, 0, Math.PI * 2)
    ctx.fill()
  }

  const setResources = useCallback((newResources) => {
    resourcesRef.current = newResources
  }, [])

  return {
    generateResources,
    updateResources,
    getResourceAt,
    harvestResource,
    selectResource,
    renderResources,
    setResources,
    resources: resourcesRef.current
  }
}