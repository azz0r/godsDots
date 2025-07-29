// God Dots - DexieJS Database Schema
export const version = 4

export const name = `GodDots001`
const lightStandard = '++id, name'
const basicFields = `${lightStandard}, desc, image`
const basicDefaultObj = {
  name: '',
  desc: '',
  image: null,
}
const standardFields = `${basicFields}, color, backgroundColor`
const standardStyle = {
  color: '#fff',
  backgroundColor: '#999',
}

export const Groups = [
  {
    group: 'Game',
    imports: [],
    params: '++id, name, worldSeed, createdAt, lastPlayedAt, totalPlayTime, currentLevel, gameVersion',
    defaultFields: {
      id: 1,
      name: 'Divine Realm',
      worldSeed: Math.random().toString(36).substring(7),
      createdAt: new Date(),
      lastPlayedAt: new Date(),
      totalPlayTime: 0, // seconds
      currentLevel: 1,
      gameVersion: '1.0.0',
      settings: {
        difficulty: 'NORMAL',
        autoSave: true,
        soundEnabled: true,
        musicEnabled: true,
        particleEffects: true,
        cameraSmoothing: true
      }
    },
  },
  {
    group: 'Level',
    imports: [],
    params: '++id, gameId, levelNumber, name, terrainSeed, isActive, completedAt, [gameId+isActive]',
    defaultFields: {
      gameId: 1,
      levelNumber: 1,
      name: 'The First Realm',
      worldSize: { width: 4800, height: 3200 },
      terrainSeed: null,
      isActive: false,
      completedAt: null,
      objectives: [],
      statistics: {
        totalPlayers: 0,
        totalVillagers: 0,
        totalBuildings: 0,
        maxBeliefReached: 0,
        miraclesCast: 0,
        playTime: 0
      }
    },
  },
  {
    group: 'Player',
    imports: [],
    params: '++id, levelId, name, type, color, isHuman, beliefPoints, totalBeliefGenerated, isActive',
    defaultFields: {
      levelId: null,
      name: 'Divine Being',
      type: 'human', // 'human' | 'ai'
      color: '#ffd700',
      isHuman: true,
      position: { x: 0, y: 0 },
      beliefPoints: 100,
      totalBeliefGenerated: 0,
      isActive: true,
      aiPersonality: null, // Only for AI players
      statistics: {
        miraclesCast: 0,
        buildingsBuilt: 0,
        villagersHealed: 0,
        territorySize: 0,
        averageHappiness: 50,
        powerUsage: {},
        achievements: []
      }
    },
  },
  {
    group: 'AIPersonality',
    imports: [],
    params: '++id, playerId, aggressiveness, expansionDesire, defensiveness, strategy, lastAction, actionCooldown, targetPlayerId',
    defaultFields: {
      playerId: null,
      aggressiveness: 0.5, // 0.0 to 1.0
      expansionDesire: 0.5,
      defensiveness: 0.5,
      strategy: 'balanced', // 'aggressive' | 'defensive' | 'balanced' | 'expansionist'
      lastAction: 0,
      actionCooldown: 0,
      targetPlayerId: null
    },
  },
  {
    group: 'Territory',
    imports: [],
    params: '++id, playerId, radius, strength, lastUpdated',
    defaultFields: {
      playerId: null,
      center: { x: 0, y: 0 },
      radius: 400,
      strength: 1.0,
      influencePoints: [], // Array of {x, y, strength} for complex shapes
      lastUpdated: new Date()
    },
  },
  {
    group: 'Villager',
    imports: [],
    params: '++id, playerId, levelId, name, health, happiness, age, state, task, homeId, workplaceId, lastUpdated',
    defaultFields: {
      playerId: null,
      levelId: null,
      name: 'Villager',
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      health: 100,
      happiness: 50,
      age: 25,
      state: 'wandering', // 'wandering' | 'working' | 'fleeing' | 'returning_home' | 'praying' | 'resting'
      task: 'idle', // 'idle' | 'building' | 'farming' | 'gathering' | 'praying' | 'socializing'
      homeId: null,
      workplaceId: null,
      personality: {
        curiosity: 0.5,
        loyalty: 0.5,
        productivity: 0.5,
        sociability: 0.5,
        fearfulness: 0.5
      },
      skills: {
        building: 0,
        farming: 0,
        gathering: 0,
        crafting: 0,
        fighting: 0
      },
      relationships: [], // Array of {villagerId, relationship: 'friend'|'enemy'|'family', strength}
      lastUpdated: new Date()
    },
  },
  {
    group: 'Building',
    imports: [],
    params: '++id, playerId, levelId, name, type, health, level, isUnderConstruction, constructionProgress, lastProduced, efficiency',
    defaultFields: {
      playerId: null,
      levelId: null,
      name: 'Building',
      type: 'house', // 'house' | 'temple' | 'barn' | 'granary' | 'workshop' | 'farm' | 'wall' | 'tower'
      position: { x: 0, y: 0 },
      size: { width: 30, height: 30 },
      health: 100,
      level: 1,
      isUnderConstruction: false,
      constructionProgress: 0, // 0-100
      workers: [], // Array of villager IDs
      storage: {}, // Resource storage {food: 50, wood: 20, stone: 10}
      production: {}, // What this building produces per cycle
      lastProduced: null,
      capacity: {
        residents: 0, // For houses
        workers: 0,   // For work buildings
        storage: {}   // Storage limits per resource
      },
      efficiency: 1.0 // Production/capacity multiplier
    },
  },
  {
    group: 'Resource',
    imports: [],
    params: '++id, levelId, type, amount, maxAmount, regenerationRate, isBeingHarvested, harvestProgress, harvesterId, lastHarvested',
    defaultFields: {
      levelId: null,
      type: 'tree', // 'tree' | 'berries' | 'stone_deposit' | 'water' | 'fertile_soil'
      position: { x: 0, y: 0 },
      amount: 100,
      maxAmount: 100,
      regenerationRate: 0.1, // Amount per game tick
      isBeingHarvested: false,
      harvestProgress: 0,
      harvesterId: null,
      lastHarvested: null
    },
  },
  {
    group: 'TerrainTile',
    imports: [],
    params: '++id, levelId, type, fertility, walkable, waterLevel, temperature',
    defaultFields: {
      levelId: null,
      position: { x: 0, y: 0 },
      type: 'grass', // 'grass' | 'forest' | 'hills' | 'water' | 'desert' | 'mountain'
      fertility: 1.0,
      walkable: true,
      waterLevel: 0, // 0-100, for irrigation/flooding
      temperature: 20 // Celsius, affects growth rates
    },
  },
  {
    group: 'Path',
    imports: [],
    params: '++id, levelId, playerId, name, pathType, usage, lastUsed, isActive',
    defaultFields: {
      levelId: null,
      playerId: null,
      name: 'Path',
      pathType: 'main', // 'main' | 'circular' | 'inter-building' | 'resource'
      nodes: [], // Array of {x, y, connections: [nodeId]}
      usage: 0, // How often this path is used
      lastUsed: null,
      isActive: true
    },
  },
  {
    group: 'Miracle',
    imports: [],
    params: '++id, levelId, playerId, type, power, cost, castTime, duration, isActive',
    defaultFields: {
      levelId: null,
      playerId: null,
      type: 'heal', // 'heal' | 'storm' | 'food' | 'build' | 'lightning' | 'growth' | 'shield'
      position: { x: 0, y: 0 },
      power: 1.0, // Miracle strength multiplier
      cost: 20, // Belief points cost
      castTime: new Date(),
      effects: [], // Array of effect objects
      duration: 0, // How long effects last (0 = instant)
      isActive: false // For ongoing miracles
    },
  },
  {
    group: 'Effect',
    imports: [],
    params: '++id, miracleId, targetType, targetId, effectType, magnitude, duration, remainingTime, isExpired',
    defaultFields: {
      miracleId: null,
      targetType: 'villager', // 'villager' | 'building' | 'resource' | 'terrain'
      targetId: null, // ID of the affected entity
      effectType: 'heal', // 'heal' | 'damage' | 'happiness' | 'speed' | 'productivity'
      magnitude: 10, // Effect strength
      duration: 60, // Game ticks
      remainingTime: 60,
      isExpired: false
    },
  },
  {
    group: 'Event',
    imports: [],
    params: '++id, levelId, type, timestamp, severity, isResolved',
    defaultFields: {
      levelId: null,
      type: 'villager_born', // 'villager_born' | 'building_completed' | 'resource_depleted' | 'territory_expanded' | 'conflict'
      timestamp: new Date(),
      data: {}, // Event-specific data
      severity: 'info', // 'info' | 'warning' | 'critical'
      isResolved: false,
      affectedEntities: [] // Array of {type, id} references
    },
  },
  {
    group: 'Objective',
    imports: [],
    params: '++id, levelId, name, description, type, targetValue, currentValue, isCompleted, completedAt',
    defaultFields: {
      levelId: null,
      name: 'Divine Objective',
      description: 'Complete this divine task',
      type: 'population', // 'population' | 'buildings' | 'belief' | 'territory' | 'happiness' | 'custom'
      targetValue: 50,
      currentValue: 0,
      isCompleted: false,
      completedAt: null,
      reward: {
        beliefPoints: 100,
        unlocks: []
      }
    },
  },
  {
    group: 'PlayerResources',
    imports: [],
    params: '++id, playerId, resourceType, amount, maxCapacity, generationRate, lastUpdated',
    defaultFields: {
      playerId: null,
      resourceType: 'food', // 'food' | 'wood' | 'stone' | 'belief'
      amount: 0,
      maxCapacity: 1000,
      generationRate: 0, // Per game tick
      lastUpdated: new Date()
    },
  },
  {
    group: 'SaveGame',
    imports: [],
    params: '++id, gameId, name, timestamp, isAutoSave, description',
    defaultFields: {
      gameId: null,
      name: 'Divine Save',
      timestamp: new Date(),
      gameState: {}, // Serialized complete game state
      isAutoSave: false,
      description: ''
    },
  },
  {
    group: 'Achievement',
    imports: [],
    params: '++id, name, description, type, requirement, isUnlocked, unlockedAt, icon, rarity',
    defaultFields: {
      name: 'Divine Achievement',
      description: 'A divine accomplishment',
      type: 'milestone', // 'milestone' | 'challenge' | 'secret' | 'progression'
      requirement: {}, // Achievement condition data
      isUnlocked: false,
      unlockedAt: null,
      icon: '🏆',
      rarity: 'common' // 'common' | 'rare' | 'epic' | 'legendary'
    },
  },
  {
    group: 'Interaction',
    imports: [],
    params: '++id, levelId, playerId, type, timestamp, sourceType, sourceId, targetType, targetId',
    defaultFields: {
      levelId: null,
      playerId: null,
      type: 'select', // 'select' | 'move' | 'cast_miracle' | 'build' | 'assign_task'
      timestamp: new Date(),
      sourceType: 'player', // 'player' | 'villager' | 'building' | 'ai'
      sourceId: null,
      targetType: 'villager', // 'villager' | 'building' | 'resource' | 'terrain' | 'position'
      targetId: null,
      data: {} // Interaction-specific data
    },
  },
]

export const GroupNames = Groups.map(group => group.group)

export const stores = Groups.reduce((acc, group) => {
  acc[group.group] = group.params
  return acc
}, {})

export const getGroupsIgnoredFields = group => {
  const groupData = Groups.find(g => g.group === group)
  return groupData?.ignoredFields || []
}

export const getGroupDefaultFields = group => {
  const groupData = Groups.find(g => g.group === group)
  return groupData?.defaultFields || {}
}

// Helper functions for common queries
export const getPlayerVillagers = (playerId) => `playerId=${playerId}`
export const getPlayerBuildings = (playerId) => `playerId=${playerId}`
export const getLevelEntities = (levelId) => `levelId=${levelId}`
export const getActiveVillagers = (playerId) => `playerId=${playerId} && state!=dead`
export const getCompletedBuildings = (playerId) => `playerId=${playerId} && isUnderConstruction=false`

// Database relationship helpers
export const relationships = {
  // One-to-many relationships
  'Player.villagers': 'Villager.playerId',
  'Player.buildings': 'Building.playerId',
  'Player.territory': 'Territory.playerId',
  'Player.resources': 'PlayerResources.playerId',
  'Level.players': 'Player.levelId',
  'Level.events': 'Event.levelId',
  'Level.objectives': 'Objective.levelId',
  'Building.workers': 'Villager.workplaceId',
  'Building.residents': 'Villager.homeId',
  
  // Many-to-many relationships (handled through junction tables or arrays)
  'Villager.relationships': 'stored as array in Villager.relationships',
  'Player.achievements': 'stored as array in Player.statistics.achievements',
}

// Index recommendations for performance
export const indexes = [
  'Player: [levelId+type], [levelId+isActive]',
  'Villager: [playerId+state], [levelId+playerId], [homeId+playerId]',
  'Building: [playerId+type], [levelId+playerId], [type+isUnderConstruction]',
  'Resource: [levelId+type], [type+amount]',
  'Event: [levelId+type], [timestamp+severity]',
  'Miracle: [levelId+playerId], [type+castTime]',
  'Effect: [targetType+targetId], [miracleId+effectType]',
  'TerrainTile: [levelId+type]',
  'Path: [levelId+playerId], [pathType+usage]',
  'PlayerResources: [playerId+resourceType]',
  'SaveGame: [gameId+timestamp]',
  'Achievement: [type+isUnlocked]',
  'Interaction: [levelId+type], [playerId+timestamp]',
]

export default {
  version,
  name,
  Groups,
  GroupNames,
  stores,
  getGroupsIgnoredFields,
  getGroupDefaultFields,
  relationships,
  indexes
}