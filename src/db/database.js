import db from './db.js'

// Database service functions
export const dbService = {
  // Game management
  async createGame(gameData = {}) {
    const defaultGame = {
      name: 'Divine Realm',
      worldSeed: Math.random().toString(36).substring(7),
      createdAt: new Date(),
      lastPlayedAt: new Date(),
      totalPlayTime: 0,
      currentLevel: 1,
      gameVersion: '1.0.0',
      settings: {
        difficulty: 'NORMAL',
        autoSave: true,
        soundEnabled: true,
        musicEnabled: true,
        particleEffects: true,
        cameraSmoothing: true
      },
      ...gameData
    }
    
    console.log('Creating game in database:', defaultGame)
    const gameId = await db.Game.add(defaultGame)
    console.log('Game created with ID:', gameId)
    return gameId
  },

  async getGame(gameId = 1) {
    console.log('Getting game from database, ID:', gameId)
    const game = await db.Game.get(gameId)
    console.log('Retrieved game:', game)
    return game
  },

  async updateGame(gameId, updates) {
    return await db.Game.update(gameId, {
      ...updates,
      lastPlayedAt: new Date()
    })
  },

  // Level management
  async createLevel(gameId, levelData = {}) {
    const defaultLevel = {
      gameId,
      levelNumber: 1,
      name: 'The First Realm',
      worldSize: { width: 7200, height: 4800 },
      terrainSeed: Math.random().toString(36).substring(7),
      isActive: true,
      completedAt: null,
      objectives: [],
      statistics: {
        totalPlayers: 0,
        totalVillagers: 0,
        totalBuildings: 0,
        maxBeliefReached: 0,
        miraclesCast: 0,
        playTime: 0
      },
      ...levelData
    }
    
    return await db.Level.add(defaultLevel)
  },

  async getActiveLevel(gameId) {
    return await db.Level.where({ gameId, isActive: true }).first()
  },

  // Player management
  async savePlayer(playerData) {
    const dbPlayer = {
      levelId: playerData.levelId,
      name: playerData.name || 'Divine Being',
      type: playerData.type,
      color: playerData.color,
      isHuman: playerData.type === 'human',
      position: playerData.territory?.center || { x: 0, y: 0 },
      beliefPoints: playerData.beliefPoints || 0,
      totalBeliefGenerated: playerData.stats?.totalBeliefGenerated || 0,
      isActive: true,
      aiPersonality: playerData.aiPersonality || null,
      statistics: {
        miraclesCast: playerData.stats?.powersCast || 0,
        buildingsBuilt: playerData.stats?.buildingsBuilt || 0,
        villagersHealed: playerData.stats?.villagersHealed || 0,
        territorySize: playerData.territory?.radius || 0,
        averageHappiness: 50,
        powerUsage: {},
        achievements: []
      }
    }
    
    if (playerData.id) {
      await db.Player.update(playerData.id, dbPlayer)
      return playerData.id
    } else {
      return await db.Player.add(dbPlayer)
    }
  },

  async getPlayers(levelId) {
    return await db.Player.where({ levelId }).toArray()
  },

  // Villager management
  async saveVillagers(levelId, playerId, villagers) {
    const dbVillagers = villagers.map(villager => ({
      playerId,
      levelId,
      name: villager.name || 'Villager',
      position: { x: villager.x, y: villager.y },
      velocity: { x: villager.vx || 0, y: villager.vy || 0 },
      health: villager.health,
      happiness: villager.happiness,
      age: villager.age || 25,
      state: villager.state,
      task: villager.task || 'idle',
      homeId: null,
      workplaceId: null,
      personality: villager.personality || {
        curiosity: 0.5,
        loyalty: 0.5,
        productivity: 0.5,
        sociability: 0.5,
        fearfulness: 0.5
      },
      skills: villager.skills || {
        building: 0,
        farming: 0,
        gathering: 0,
        crafting: 0,
        fighting: 0
      },
      relationships: [],
      lastUpdated: new Date()
    }))
    
    // Clear existing villagers for this player
    await db.Villager.where({ playerId }).delete()
    
    // Add new villagers
    return await db.Villager.bulkAdd(dbVillagers)
  },

  async getVillagers(playerId) {
    return await db.Villager.where({ playerId }).toArray()
  },

  // Building management
  async saveBuildings(levelId, playerId, buildings) {
    const dbBuildings = buildings.map(building => ({
      playerId,
      levelId,
      name: building.name || 'Building',
      type: building.type,
      position: { x: building.x, y: building.y },
      size: { width: building.width, height: building.height },
      health: building.health,
      level: building.level || 1,
      isUnderConstruction: building.isUnderConstruction || false,
      constructionProgress: ((300 - (building.constructionTime || 0)) / 300) * 100,
      workers: [],
      storage: {},
      production: {},
      lastProduced: null,
      capacity: {
        residents: building.residents || 0,
        workers: building.maxWorkers || 0,
        storage: {}
      },
      efficiency: 1.0
    }))
    
    // Clear existing buildings for this player
    await db.Building.where({ playerId }).delete()
    
    // Add new buildings
    return await db.Building.bulkAdd(dbBuildings)
  },

  async getBuildings(playerId) {
    return await db.Building.where({ playerId }).toArray()
  },

  // Resource management
  async saveResources(levelId, resources) {
    const dbResources = resources.map(resource => ({
      levelId,
      type: resource.type,
      position: { x: resource.x, y: resource.y },
      amount: resource.amount,
      maxAmount: resource.maxAmount,
      regenerationRate: resource.regenerationRate || 0.1,
      isBeingHarvested: resource.isBeingHarvested || false,
      harvestProgress: resource.harvestProgress || 0,
      harvesterId: null,
      lastHarvested: null
    }))
    
    // Clear existing resources for this level
    await db.Resource.where({ levelId }).delete()
    
    // Add new resources
    return await db.Resource.bulkAdd(dbResources)
  },

  async getResources(levelId) {
    return await db.Resource.where({ levelId }).toArray()
  },

  // Save game state
  async saveGameState(gameId, gameState, isAutoSave = false) {
    const saveData = {
      gameId,
      name: isAutoSave ? `Auto Save ${new Date().toLocaleString()}` : `Manual Save ${new Date().toLocaleString()}`,
      timestamp: new Date(),
      gameState: JSON.stringify(gameState),
      isAutoSave,
      description: isAutoSave ? 'Automatic save' : 'Manual save'
    }
    
    return await db.SaveGame.add(saveData)
  },

  async loadGameState(saveId) {
    const save = await db.SaveGame.get(saveId)
    if (save) {
      return JSON.parse(save.gameState)
    }
    return null
  },

  async getRecentSaves(gameId, limit = 10) {
    return await db.SaveGame
      .where({ gameId })
      .orderBy('timestamp')
      .reverse()
      .limit(limit)
      .toArray()
  },

  // Complete game save/load
  async saveCompleteGameState(gameId, levelId, playerSystem, resourceSystem) {
    const transaction = db.transaction('rw', 
      db.Level, db.Player, db.Villager, db.Building, db.Resource, db.SaveGame, 
      async () => {
        // Update level statistics
        const totalVillagers = playerSystem.players.reduce((sum, p) => sum + p.villagers.length, 0)
        const totalBuildings = playerSystem.players.reduce((sum, p) => sum + p.buildings.length, 0)
        
        await db.Level.update(levelId, {
          statistics: {
            totalPlayers: playerSystem.players.length,
            totalVillagers,
            totalBuildings,
            maxBeliefReached: Math.max(...playerSystem.players.map(p => p.beliefPoints)),
            miraclesCast: playerSystem.players.reduce((sum, p) => sum + (p.stats?.powersCast || 0), 0),
            playTime: Date.now()
          }
        })

        // Save all players
        for (const player of playerSystem.players) {
          const playerId = await this.savePlayer({ ...player, levelId })
          
          // Save villagers
          if (player.villagers.length > 0) {
            await this.saveVillagers(levelId, playerId, player.villagers)
          }
          
          // Save buildings
          if (player.buildings.length > 0) {
            await this.saveBuildings(levelId, playerId, player.buildings)
          }
        }

        // Save resources
        if (resourceSystem.resources.length > 0) {
          await this.saveResources(levelId, resourceSystem.resources)
        }

        // Create save game entry
        const saveId = await this.saveGameState(gameId, {
          levelId,
          timestamp: new Date(),
          playerCount: playerSystem.players.length,
          totalVillagers,
          totalBuildings
        }, true)

        return saveId
      }
    )

    return transaction
  },

  async loadCompleteGameState(levelId) {
    const level = await db.Level.get(levelId)
    if (!level) return null

    const players = await this.getPlayers(levelId)
    const resources = await this.getResources(levelId)
    
    // Load villagers and buildings for each player
    for (const player of players) {
      player.villagers = await this.getVillagers(player.id)
      player.buildings = await this.getBuildings(player.id)
    }

    return {
      level,
      players,
      resources
    }
  }
}

export default db