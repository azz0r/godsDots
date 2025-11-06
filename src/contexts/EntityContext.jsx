import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'

const EntityContext = createContext(null)

/**
 * EntityContext provides centralized entity management and tracking
 * Enables entity browser, selection, and navigation features
 */
export const EntityProvider = ({ children }) => {
  const [entities, setEntities] = useState({
    villagers: [],
    buildings: [],
    resources: [],
    players: []
  })

  const [selectedEntity, setSelectedEntity] = useState(null)
  const [filterType, setFilterType] = useState('all') // 'all' | 'villagers' | 'buildings' | 'resources' | 'players'
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('type') // 'type' | 'name' | 'state' | 'health' | 'distance'

  // Refs for performance (avoid re-renders)
  const entitiesRefCache = useRef(new Map())
  const onNavigateCallbackRef = useRef(null)

  /**
   * Register navigation callback (e.g., camera pan to entity)
   */
  const registerNavigateCallback = useCallback((callback) => {
    onNavigateCallbackRef.current = callback
  }, [])

  /**
   * Update all entities from game state
   * Called by game loop or when needed
   */
  const updateEntities = useCallback((playerSystem, resourceSystem, buildingSystem) => {
    const allVillagers = []
    const allBuildings = []
    const allPlayers = []

    // Collect from all players
    if (playerSystem && playerSystem.players) {
      playerSystem.players.forEach(player => {
        // Add player entity
        allPlayers.push({
          id: player.id,
          type: 'player',
          name: player.name || `Player ${player.id}`,
          playerType: player.type, // 'human' | 'ai'
          color: player.color,
          beliefPoints: player.beliefPoints,
          population: player.population,
          position: player.territory?.center || { x: 0, y: 0 },
          territory: player.territory,
          stats: player.stats
        })

        // Add villagers
        player.villagers?.forEach(villager => {
          allVillagers.push({
            id: villager.id,
            type: 'villager',
            name: villager.name || `Villager ${villager.id.slice(-4)}`,
            playerId: player.id,
            playerName: player.name,
            playerColor: player.color,
            state: villager.state || 'wandering',
            position: { x: villager.x, y: villager.y },
            health: villager.health,
            happiness: villager.happiness,
            hunger: villager.hunger,
            energy: villager.energy,
            profession: villager.profession,
            task: villager.task,
            age: villager.age,
            isPreacher: villager.isPreacher || false,
            selected: villager.selected || false
          })
        })

        // Add buildings
        player.buildings?.forEach(building => {
          allBuildings.push({
            id: building.id,
            type: 'building',
            buildingType: building.type,
            name: building.name || building.type,
            playerId: player.id,
            playerName: player.name,
            playerColor: player.color,
            position: { x: building.x, y: building.y },
            size: { width: building.width, height: building.height },
            health: building.health,
            level: building.level,
            isUnderConstruction: building.isUnderConstruction,
            workers: building.workers,
            maxWorkers: building.maxWorkers,
            residents: building.residents
          })
        })
      })
    }

    // Add resources
    const allResources = []
    if (resourceSystem && resourceSystem.resources) {
      resourceSystem.resources.forEach(resource => {
        allResources.push({
          id: resource.id,
          type: 'resource',
          resourceType: resource.type,
          name: `${resource.type} (${Math.floor(resource.amount)}/${resource.maxAmount})`,
          position: { x: resource.x, y: resource.y },
          amount: resource.amount,
          maxAmount: resource.maxAmount,
          beingHarvested: resource.beingHarvested
        })
      })
    }

    setEntities({
      villagers: allVillagers,
      buildings: allBuildings,
      resources: allResources,
      players: allPlayers
    })

    // Update cache
    const newCache = new Map()
    ;[...allVillagers, ...allBuildings, ...allResources, ...allPlayers].forEach(entity => {
      newCache.set(entity.id, entity)
    })
    entitiesRefCache.current = newCache
  }, [])

  /**
   * Get all entities matching current filters
   */
  const getFilteredEntities = useCallback(() => {
    let filtered = []

    switch (filterType) {
      case 'villagers':
        filtered = entities.villagers
        break
      case 'buildings':
        filtered = entities.buildings
        break
      case 'resources':
        filtered = entities.resources
        break
      case 'players':
        filtered = entities.players
        break
      case 'all':
      default:
        filtered = [
          ...entities.players,
          ...entities.villagers,
          ...entities.buildings,
          ...entities.resources
        ]
        break
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(entity =>
        entity.name?.toLowerCase().includes(query) ||
        entity.type?.toLowerCase().includes(query) ||
        entity.state?.toLowerCase().includes(query) ||
        entity.buildingType?.toLowerCase().includes(query) ||
        entity.resourceType?.toLowerCase().includes(query)
      )
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '')
        case 'state':
          return (a.state || '').localeCompare(b.state || '')
        case 'health':
          return (b.health || 0) - (a.health || 0)
        case 'type':
        default:
          return (a.type || '').localeCompare(b.type || '')
      }
    })

    return filtered
  }, [entities, filterType, searchQuery, sortBy])

  /**
   * Navigate to entity (pan camera to entity position)
   */
  const navigateToEntity = useCallback((entityId) => {
    const entity = entitiesRefCache.current.get(entityId)
    if (!entity) {
      console.warn(`Entity ${entityId} not found`)
      return
    }

    setSelectedEntity(entity)

    // Call registered navigation callback (camera pan)
    if (onNavigateCallbackRef.current && entity.position) {
      onNavigateCallbackRef.current(entity.position.x, entity.position.y)
    }
  }, [])

  /**
   * Get entity by ID
   */
  const getEntityById = useCallback((entityId) => {
    return entitiesRefCache.current.get(entityId)
  }, [])

  /**
   * Get entity statistics
   */
  const getEntityStats = useCallback(() => {
    return {
      totalVillagers: entities.villagers.length,
      totalBuildings: entities.buildings.length,
      totalResources: entities.resources.length,
      totalPlayers: entities.players.length,
      total: entities.villagers.length + entities.buildings.length +
             entities.resources.length + entities.players.length,
      byType: {
        villagers: entities.villagers.length,
        buildings: entities.buildings.length,
        resources: entities.resources.length,
        players: entities.players.length
      },
      byState: entities.villagers.reduce((acc, v) => {
        acc[v.state] = (acc[v.state] || 0) + 1
        return acc
      }, {}),
      byBuildingType: entities.buildings.reduce((acc, b) => {
        acc[b.buildingType] = (acc[b.buildingType] || 0) + 1
        return acc
      }, {})
    }
  }, [entities])

  const value = {
    entities,
    selectedEntity,
    filterType,
    searchQuery,
    sortBy,
    updateEntities,
    getFilteredEntities,
    navigateToEntity,
    getEntityById,
    getEntityStats,
    registerNavigateCallback,
    setFilterType,
    setSearchQuery,
    setSortBy,
    setSelectedEntity
  }

  return (
    <EntityContext.Provider value={value}>
      {children}
    </EntityContext.Provider>
  )
}

export const useEntities = () => {
  const context = useContext(EntityContext)
  if (!context) {
    throw new Error('useEntities must be used within an EntityProvider')
  }
  return context
}
