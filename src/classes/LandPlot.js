export class LandPlot {
  constructor(id, x, y, width, height, type = 'buildable') {
    this.id = id
    this.x = x
    this.y = y
    this.width = width
    this.height = height
    this.type = type // 'buildable', 'water', 'road', 'forest', 'restricted'
    this.owner = null
    this.ownerId = null
    this.building = null
    this.buildingId = null
    
    // Building restrictions
    this.restrictions = {
      maxHeight: type === 'buildable' ? 3 : 0,
      allowedBuildingTypes: this.getAllowedBuildingTypes(type),
      minDistanceFromBorder: 5,
      requiresPermit: false
    }
    
    // Border rendering data
    this.borderStyle = {
      color: this.getBorderColor(type),
      width: 2,
      dashPattern: type === 'road' ? [5, 5] : [],
      glowColor: null,
      selected: false
    }
    
    // Neighboring plots
    this.neighbors = {
      north: null,
      south: null,
      east: null,
      west: null
    }
    
    // Additional metadata
    this.developmentLevel = 0
    this.lastModified = Date.now()
    this.locked = false
  }
  
  getAllowedBuildingTypes(type) {
    switch(type) {
      case 'buildable':
        return ['house', 'temple', 'workshop', 'market', 'storage']
      case 'water':
        return ['dock', 'bridge']
      case 'road':
        return ['checkpoint', 'sign']
      case 'forest':
        return ['lumbermill', 'outpost']
      case 'restricted':
        return []
      default:
        return []
    }
  }
  
  getBorderColor(type) {
    const colors = {
      buildable: '#4a5568',
      water: '#2b6cb4',
      road: '#718096',
      forest: '#2d4a3a',
      restricted: '#e53e3e'
    }
    return colors[type] || '#4a5568'
  }
  
  setOwner(owner, ownerId) {
    if (this.locked) return false
    
    this.owner = owner
    this.ownerId = ownerId
    this.lastModified = Date.now()
    
    // Update border color for owned plots
    if (owner) {
      this.borderStyle.color = '#48bb78' // Green for owned
      this.borderStyle.width = 3
    } else {
      this.borderStyle.color = this.getBorderColor(this.type)
      this.borderStyle.width = 2
    }
    
    return true
  }
  
  setBuilding(building, buildingId) {
    if (!this.canBuild(building?.type)) return false
    
    this.building = building
    this.buildingId = buildingId
    this.lastModified = Date.now()
    
    if (building) {
      this.developmentLevel = Math.min(this.developmentLevel + 1, 5)
    }
    
    return true
  }
  
  addBuilding(building) {
    return this.setBuilding(building, building.id)
  }
  
  removeBuilding(buildingId) {
    if (this.buildingId === buildingId) {
      this.building = null
      this.buildingId = null
      this.lastModified = Date.now()
      return true
    }
    return false
  }
  
  canPlaceBuilding(buildingType) {
    return this.canBuild(buildingType)
  }
  
  canBuild(buildingType) {
    if (this.locked || this.building) return false
    if (!buildingType) return false
    
    return this.restrictions.allowedBuildingTypes.includes(buildingType)
  }
  
  setType(newType) {
    if (this.locked || this.building) return false
    
    this.type = newType
    this.restrictions.allowedBuildingTypes = this.getAllowedBuildingTypes(newType)
    this.restrictions.maxHeight = newType === 'buildable' ? 3 : 0
    this.borderStyle.color = this.getBorderColor(newType)
    this.lastModified = Date.now()
    
    return true
  }
  
  setNeighbor(direction, plotId) {
    if (['north', 'south', 'east', 'west'].includes(direction)) {
      this.neighbors[direction] = plotId
    }
  }
  
  getCenter() {
    return {
      x: this.x + this.width / 2,
      y: this.y + this.height / 2
    }
  }
  
  contains(x, y) {
    return x >= this.x && x < this.x + this.width &&
           y >= this.y && y < this.y + this.height
  }
  
  intersects(otherPlot) {
    return !(this.x >= otherPlot.x + otherPlot.width ||
             this.x + this.width <= otherPlot.x ||
             this.y >= otherPlot.y + otherPlot.height ||
             this.y + this.height <= otherPlot.y)
  }
  
  select() {
    this.borderStyle.selected = true
    this.borderStyle.glowColor = '#ffd700'
    this.borderStyle.width = 4
  }
  
  deselect() {
    this.borderStyle.selected = false
    this.borderStyle.glowColor = null
    this.borderStyle.width = this.owner ? 3 : 2
  }
  
  toJSON() {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      type: this.type,
      owner: this.owner,
      ownerId: this.ownerId,
      buildingId: this.buildingId,
      developmentLevel: this.developmentLevel,
      locked: this.locked,
      neighbors: this.neighbors
    }
  }
  
  static fromJSON(data) {
    const plot = new LandPlot(data.id, data.x, data.y, data.width, data.height, data.type)
    plot.owner = data.owner
    plot.ownerId = data.ownerId
    plot.buildingId = data.buildingId
    plot.developmentLevel = data.developmentLevel
    plot.locked = data.locked
    plot.neighbors = data.neighbors
    return plot
  }
}