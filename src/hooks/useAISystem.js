import { useRef, useCallback } from 'react'

export const useAISystem = (playerSystem, terrainSystem) => {
  const aiPlayersRef = useRef([])

  const updateAIPlayers = useCallback((gameTime, allPlayers) => {
    const aiPlayers = allPlayers.filter(p => p.type === 'ai')
    
    aiPlayers.forEach(aiPlayer => {
      if (aiPlayer.ai.actionCooldown > 0) {
        aiPlayer.ai.actionCooldown--
        return
      }
      
      // AI decision making based on strategy and current situation
      const decision = makeAIDecision(aiPlayer, allPlayers, gameTime)
      executeAIDecision(aiPlayer, decision, gameTime)
      
      // Set cooldown based on action taken
      aiPlayer.ai.actionCooldown = decision.cooldown || 180 // 3 seconds default
    })
  }, [])

  const makeAIDecision = (aiPlayer, allPlayers, gameTime) => {
    const { ai, beliefPoints, population, territory } = aiPlayer
    
    // Evaluate current situation
    const nearbyEnemies = findNearbyEnemies(aiPlayer, allPlayers)
    const populationRatio = population / Math.max(1, getAveragePopulation(allPlayers))
    const beliefRatio = beliefPoints / 100 // Normalized belief
    
    // Decision priorities based on AI personality
    const priorities = {
      expand: ai.expansionDesire * (1 - populationRatio * 0.5),
      defend: ai.defensiveness * (nearbyEnemies.length * 0.3),
      attack: ai.aggressiveness * (populationRatio * 0.5),
      develop: (1 - ai.aggressiveness) * beliefRatio
    }
    
    // Find highest priority action
    const topPriority = Object.keys(priorities).reduce((a, b) => 
      priorities[a] > priorities[b] ? a : b
    )
    
    switch (topPriority) {
      case 'expand':
        return planExpansion(aiPlayer, beliefPoints)
      case 'defend':
        return planDefense(aiPlayer, nearbyEnemies)
      case 'attack':
        return planAttack(aiPlayer, nearbyEnemies, beliefPoints)
      case 'develop':
        return planDevelopment(aiPlayer, beliefPoints)
      default:
        return { action: 'wait', cooldown: 120 }
    }
  }

  const findNearbyEnemies = (aiPlayer, allPlayers) => {
    return allPlayers.filter(player => {
      if (player.id === aiPlayer.id) return false
      
      const distance = Math.sqrt(
        (player.territory.center.x - aiPlayer.territory.center.x) ** 2 +
        (player.territory.center.y - aiPlayer.territory.center.y) ** 2
      )
      
      return distance < (aiPlayer.territory.radius + player.territory.radius + 200)
    })
  }

  const getAveragePopulation = (allPlayers) => {
    const total = allPlayers.reduce((sum, p) => sum + p.population, 0)
    return total / allPlayers.length
  }

  const planExpansion = (aiPlayer, beliefPoints) => {
    if (beliefPoints >= 100) {
      // Try to build a new house
      const buildLocation = findBuildLocation(aiPlayer)
      if (buildLocation) {
        return {
          action: 'build',
          target: buildLocation,
          buildingType: 'house',
          cooldown: 300
        }
      }
    }
    
    return { action: 'wait', cooldown: 240 }
  }

  const planDefense = (aiPlayer, enemies) => {
    if (aiPlayer.beliefPoints >= 20) {
      // Heal wounded villagers
      const woundedVillagers = aiPlayer.villagers.filter(v => v.health < 70)
      if (woundedVillagers.length > 0) {
        const target = woundedVillagers[0]
        return {
          action: 'heal',
          target: { x: target.x, y: target.y },
          cooldown: 200
        }
      }
    }
    
    return { action: 'wait', cooldown: 180 }
  }

  const planAttack = (aiPlayer, enemies, beliefPoints) => {
    if (enemies.length === 0 || beliefPoints < 50) {
      return { action: 'wait', cooldown: 300 }
    }
    
    // Target nearest enemy's territory edge
    const nearestEnemy = enemies.reduce((closest, enemy) => {
      const distance = Math.sqrt(
        (enemy.territory.center.x - aiPlayer.territory.center.x) ** 2 +
        (enemy.territory.center.y - aiPlayer.territory.center.y) ** 2
      )
      return !closest || distance < closest.distance 
        ? { player: enemy, distance }
        : closest
    }, null)
    
    if (nearestEnemy && aiPlayer.beliefPoints >= 50) {
      // Cast storm at enemy territory
      const targetX = nearestEnemy.player.territory.center.x + (Math.random() - 0.5) * 100
      const targetY = nearestEnemy.player.territory.center.y + (Math.random() - 0.5) * 100
      
      return {
        action: 'storm',
        target: { x: targetX, y: targetY },
        cooldown: 600
      }
    }
    
    return { action: 'wait', cooldown: 240 }
  }

  const planDevelopment = (aiPlayer, beliefPoints) => {
    if (beliefPoints >= 15 && aiPlayer.villagers.length > 0) {
      // Bless villagers with food
      const randomVillager = aiPlayer.villagers[Math.floor(Math.random() * aiPlayer.villagers.length)]
      return {
        action: 'food',
        target: { x: randomVillager.x, y: randomVillager.y },
        cooldown: 180
      }
    }
    
    return { action: 'wait', cooldown: 200 }
  }

  const findBuildLocation = (aiPlayer) => {
    const { center, radius } = aiPlayer.territory
    const attempts = 10
    
    for (let i = 0; i < attempts; i++) {
      const angle = Math.random() * Math.PI * 2
      const distance = Math.random() * (radius * 0.8)
      const x = center.x + Math.cos(angle) * distance
      const y = center.y + Math.sin(angle) * distance
      
      // Check if location is valid (walkable, not too close to other buildings)
      if (terrainSystem.isWalkable(x, y)) {
        const tooClose = aiPlayer.buildings.some(building => {
          const dist = Math.sqrt((building.x - x) ** 2 + (building.y - y) ** 2)
          return dist < 60
        })
        
        if (!tooClose) {
          return { x, y }
        }
      }
    }
    
    return null
  }

  const executeAIDecision = (aiPlayer, decision, gameTime) => {
    if (!decision || !decision.action || decision.action === 'wait') {
      return
    }

    const { action, target } = decision
    
    // Update AI stats
    aiPlayer.ai.lastAction = gameTime
    
    switch (action) {
      case 'build':
        if (aiPlayer.beliefPoints >= 100) {
          aiPlayer.beliefPoints -= 100
          
          const newBuilding = {
            id: `ai_house_${aiPlayer.id}_${Date.now()}`,
            x: target.x - 15,
            y: target.y - 15,
            width: 30,
            height: 30,
            type: 'house',
            health: 80,
            level: 1,
            playerId: aiPlayer.id,
            workers: 0,
            maxWorkers: 2,
            residents: Math.floor(Math.random() * 3) + 1,
            isUnderConstruction: true,
            constructionTime: 0
          }
          
          aiPlayer.buildings.push(newBuilding)
          aiPlayer.stats.buildingsBuilt++
        }
        break
        
      case 'heal':
        if (aiPlayer.beliefPoints >= 20) {
          aiPlayer.beliefPoints -= 20
          
          // Heal nearby villagers
          aiPlayer.villagers.forEach(villager => {
            const distance = Math.sqrt(
              (villager.x - target.x) ** 2 + (villager.y - target.y) ** 2
            )
            if (distance < 100) {
              villager.health = Math.min(100, villager.health + 30)
              villager.happiness += 10
              aiPlayer.stats.villagersHealed++
            }
          })
          
          aiPlayer.stats.powersCast++
        }
        break
        
      case 'storm':
        if (aiPlayer.beliefPoints >= 50) {
          aiPlayer.beliefPoints -= 50
          aiPlayer.stats.powersCast++
          // Storm effects will be handled by the main game engine
        }
        break
        
      case 'food':
        if (aiPlayer.beliefPoints >= 15) {
          aiPlayer.beliefPoints -= 15
          
          // Bless nearby villagers with food
          aiPlayer.villagers.forEach(villager => {
            const distance = Math.sqrt(
              (villager.x - target.x) ** 2 + (villager.y - target.y) ** 2
            )
            if (distance < 80) {
              villager.happiness += 15
              villager.health = Math.min(100, villager.health + 5)
            }
          })
          
          aiPlayer.stats.powersCast++
        }
        break
    }
  }

  return {
    updateAIPlayers,
    makeAIDecision,
    executeAIDecision
  }
}