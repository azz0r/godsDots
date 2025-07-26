/**
 * PathNode class represents a single node in the pathfinding grid
 */
export class PathNode {
  constructor(x, y, walkable = true, terrain = 'grass') {
    this.x = x
    this.y = y
    this.worldX = x * PathNode.GRID_SIZE
    this.worldY = y * PathNode.GRID_SIZE
    this.walkable = walkable
    this.terrain = terrain
    
    // A* properties
    this.g = 0 // Cost from start to this node
    this.h = 0 // Heuristic cost from this node to end
    this.f = 0 // Total cost (g + h)
    this.parent = null
    
    // Movement cost based on terrain
    this.cost = this.getTerrainCost()
    
    // For dynamic obstacle avoidance
    this.temporaryObstacle = false
    this.obstacleTimeout = 0
  }
  
  static GRID_SIZE = 20 // Size of each grid cell in world units
  
  getTerrainCost() {
    const costs = {
      grass: 1.0,
      forest: 1.5,
      hills: 2.0,
      water: Infinity, // Not walkable
      road: 0.5, // Paths are faster
      building: Infinity // Not walkable
    }
    return costs[this.terrain] || 1.0
  }
  
  reset() {
    this.g = 0
    this.h = 0
    this.f = 0
    this.parent = null
  }
  
  setTemporaryObstacle(duration = 1000) {
    this.temporaryObstacle = true
    this.obstacleTimeout = Date.now() + duration
  }
  
  updateObstacleStatus() {
    if (this.temporaryObstacle && Date.now() > this.obstacleTimeout) {
      this.temporaryObstacle = false
    }
  }
  
  isWalkable() {
    this.updateObstacleStatus()
    return this.walkable && !this.temporaryObstacle && this.cost !== Infinity
  }
  
  equals(other) {
    return this.x === other.x && this.y === other.y
  }
  
  distanceTo(other) {
    const dx = Math.abs(this.x - other.x)
    const dy = Math.abs(this.y - other.y)
    return dx + dy // Manhattan distance for grid-based movement
  }
  
  getNeighborPositions() {
    return [
      { x: this.x, y: this.y - 1 }, // North
      { x: this.x + 1, y: this.y }, // East
      { x: this.x, y: this.y + 1 }, // South
      { x: this.x - 1, y: this.y }, // West
      // Diagonal movements (optional)
      { x: this.x + 1, y: this.y - 1 }, // NE
      { x: this.x + 1, y: this.y + 1 }, // SE
      { x: this.x - 1, y: this.y + 1 }, // SW
      { x: this.x - 1, y: this.y - 1 }  // NW
    ]
  }
}