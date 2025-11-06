import React, { useState, useMemo } from 'react'
import { useEntities } from '../contexts/EntityContext'
import styles from '../styles/EntityBrowser.module.css'

/**
 * EntityBrowser - Server browser style panel showing all game entities
 * Click to navigate to entity on map
 */
const EntityBrowser = ({ visible, onClose }) => {
  const {
    filterType,
    searchQuery,
    sortBy,
    selectedEntity,
    getFilteredEntities,
    navigateToEntity,
    getEntityStats,
    setFilterType,
    setSearchQuery,
    setSortBy
  } = useEntities()

  const [expandedGroups, setExpandedGroups] = useState({
    players: true,
    villagers: false,
    buildings: false,
    resources: false
  })

  const filteredEntities = useMemo(() => getFilteredEntities(), [getFilteredEntities])
  const stats = useMemo(() => getEntityStats(), [getEntityStats])

  // Group entities by type
  const groupedEntities = useMemo(() => {
    const groups = {
      players: [],
      villagers: [],
      buildings: [],
      resources: []
    }

    filteredEntities.forEach(entity => {
      switch (entity.type) {
        case 'player':
          groups.players.push(entity)
          break
        case 'villager':
          groups.villagers.push(entity)
          break
        case 'building':
          groups.buildings.push(entity)
          break
        case 'resource':
          groups.resources.push(entity)
          break
      }
    })

    return groups
  }, [filteredEntities])

  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }))
  }

  const handleEntityClick = (entityId) => {
    navigateToEntity(entityId)
  }

  const getEntityIcon = (entity) => {
    switch (entity.type) {
      case 'player':
        return entity.playerType === 'human' ? '👤' : '🤖'
      case 'villager':
        return entity.isPreacher ? '✝' : '🧑'
      case 'building':
        return entity.buildingType === 'temple' ? '⛪' : '🏠'
      case 'resource':
        return entity.resourceType === 'tree' ? '🌲' : '🫐'
      default:
        return '●'
    }
  }

  const getEntityStateColor = (entity) => {
    if (entity.type === 'villager') {
      if (entity.health < 30) return '#ff4444'
      if (entity.state === 'fleeing') return '#ff8844'
      if (entity.state === 'working') return '#44ff44'
      if (entity.happiness > 80) return '#88ff88'
    }
    if (entity.type === 'building' && entity.isUnderConstruction) return '#ffaa00'
    return '#ffffff'
  }

  if (!visible) return null

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Entity Browser</h2>
        <button className={styles.closeButton} onClick={onClose}>✕</button>
      </div>

      <div className={styles.stats}>
        <div className={styles.statItem}>
          <span>Total:</span> <strong>{stats.total}</strong>
        </div>
        <div className={styles.statItem}>
          <span>Players:</span> <strong>{stats.totalPlayers}</strong>
        </div>
        <div className={styles.statItem}>
          <span>Villagers:</span> <strong>{stats.totalVillagers}</strong>
        </div>
        <div className={styles.statItem}>
          <span>Buildings:</span> <strong>{stats.totalBuildings}</strong>
        </div>
        <div className={styles.statItem}>
          <span>Resources:</span> <strong>{stats.totalResources}</strong>
        </div>
      </div>

      <div className={styles.controls}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search entities..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <div className={styles.filters}>
          <select
            className={styles.filterSelect}
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="players">Players</option>
            <option value="villagers">Villagers</option>
            <option value="buildings">Buildings</option>
            <option value="resources">Resources</option>
          </select>

          <select
            className={styles.sortSelect}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="type">Sort by Type</option>
            <option value="name">Sort by Name</option>
            <option value="state">Sort by State</option>
            <option value="health">Sort by Health</option>
          </select>
        </div>
      </div>

      <div className={styles.entityList}>
        {/* Players Group */}
        {groupedEntities.players.length > 0 && (
          <div className={styles.group}>
            <div
              className={styles.groupHeader}
              onClick={() => toggleGroup('players')}
            >
              <span className={styles.groupToggle}>
                {expandedGroups.players ? '▼' : '▶'}
              </span>
              <span className={styles.groupTitle}>
                Players ({groupedEntities.players.length})
              </span>
            </div>
            {expandedGroups.players && (
              <div className={styles.groupContent}>
                {groupedEntities.players.map(entity => (
                  <div
                    key={entity.id}
                    className={`${styles.entityItem} ${selectedEntity?.id === entity.id ? styles.selected : ''}`}
                    onClick={() => handleEntityClick(entity.id)}
                    style={{ borderLeftColor: entity.color }}
                  >
                    <span className={styles.entityIcon}>{getEntityIcon(entity)}</span>
                    <div className={styles.entityInfo}>
                      <div className={styles.entityName}>{entity.name}</div>
                      <div className={styles.entityDetails}>
                        {entity.playerType} | Pop: {entity.population} | Belief: {Math.floor(entity.beliefPoints)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Villagers Group */}
        {groupedEntities.villagers.length > 0 && (
          <div className={styles.group}>
            <div
              className={styles.groupHeader}
              onClick={() => toggleGroup('villagers')}
            >
              <span className={styles.groupToggle}>
                {expandedGroups.villagers ? '▼' : '▶'}
              </span>
              <span className={styles.groupTitle}>
                Villagers ({groupedEntities.villagers.length})
              </span>
            </div>
            {expandedGroups.villagers && (
              <div className={styles.groupContent}>
                {groupedEntities.villagers.map(entity => (
                  <div
                    key={entity.id}
                    className={`${styles.entityItem} ${selectedEntity?.id === entity.id ? styles.selected : ''}`}
                    onClick={() => handleEntityClick(entity.id)}
                    style={{ borderLeftColor: entity.playerColor }}
                  >
                    <span className={styles.entityIcon}>{getEntityIcon(entity)}</span>
                    <div className={styles.entityInfo}>
                      <div
                        className={styles.entityName}
                        style={{ color: getEntityStateColor(entity) }}
                      >
                        {entity.name}
                      </div>
                      <div className={styles.entityDetails}>
                        {entity.state} | HP: {Math.floor(entity.health)} | Happy: {Math.floor(entity.happiness)}
                      </div>
                      {entity.profession && (
                        <div className={styles.entitySubDetails}>
                          {entity.profession} | {entity.playerName}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Buildings Group */}
        {groupedEntities.buildings.length > 0 && (
          <div className={styles.group}>
            <div
              className={styles.groupHeader}
              onClick={() => toggleGroup('buildings')}
            >
              <span className={styles.groupToggle}>
                {expandedGroups.buildings ? '▼' : '▶'}
              </span>
              <span className={styles.groupTitle}>
                Buildings ({groupedEntities.buildings.length})
              </span>
            </div>
            {expandedGroups.buildings && (
              <div className={styles.groupContent}>
                {groupedEntities.buildings.map(entity => (
                  <div
                    key={entity.id}
                    className={`${styles.entityItem} ${selectedEntity?.id === entity.id ? styles.selected : ''}`}
                    onClick={() => handleEntityClick(entity.id)}
                    style={{ borderLeftColor: entity.playerColor }}
                  >
                    <span className={styles.entityIcon}>{getEntityIcon(entity)}</span>
                    <div className={styles.entityInfo}>
                      <div className={styles.entityName}>{entity.name}</div>
                      <div className={styles.entityDetails}>
                        Lvl {entity.level} | HP: {Math.floor(entity.health)}
                        {entity.isUnderConstruction && ' | 🔨 Building...'}
                      </div>
                      <div className={styles.entitySubDetails}>
                        Workers: {entity.workers}/{entity.maxWorkers} | {entity.playerName}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Resources Group */}
        {groupedEntities.resources.length > 0 && (
          <div className={styles.group}>
            <div
              className={styles.groupHeader}
              onClick={() => toggleGroup('resources')}
            >
              <span className={styles.groupToggle}>
                {expandedGroups.resources ? '▼' : '▶'}
              </span>
              <span className={styles.groupTitle}>
                Resources ({groupedEntities.resources.length})
              </span>
            </div>
            {expandedGroups.resources && (
              <div className={styles.groupContent}>
                {groupedEntities.resources.map(entity => (
                  <div
                    key={entity.id}
                    className={`${styles.entityItem} ${selectedEntity?.id === entity.id ? styles.selected : ''}`}
                    onClick={() => handleEntityClick(entity.id)}
                  >
                    <span className={styles.entityIcon}>{getEntityIcon(entity)}</span>
                    <div className={styles.entityInfo}>
                      <div className={styles.entityName}>{entity.name}</div>
                      <div className={styles.entityDetails}>
                        {entity.resourceType}
                        {entity.beingHarvested && ' | ⛏ Harvesting...'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default EntityBrowser
