import { PathNode } from './PathNode.js'

/**
 * A* pathfinding algorithm implementation with diagonal movement support
 */
export class AStar {
  constructor(grid) {
    this.grid = grid
    this.diagonalMovement = true
    this.heuristicType = 'euclidean' // 'manhattan' or 'euclidean'
  }

  /**
   * Find path between two points
   * @param {number} startX - Start X coordinate in grid units
   * @param {number} startY - Start Y coordinate in grid units
   * @param {number} endX - End X coordinate in grid units
   * @param {number} endY - End Y coordinate in grid units
   * @returns {Array<PathNode>} - Array of nodes forming the path, or empty array if no path found
   */
  findPath(startX, startY, endX, endY) {
    const startNode = this.grid.getNodeAt(startX, startY)
    const endNode = this.grid.getNodeAt(endX, endY)

    if (!startNode || !endNode || !startNode.isWalkable() || !endNode.isWalkable()) {
      return []
    }

    const openList = []
    const closedList = new Set()
    const openSet = new Set()

    // Reset all nodes
    this.grid.resetNodes()

    // Initialize start node
    startNode.g = 0
    startNode.h = this.heuristic(startNode, endNode)
    startNode.f = startNode.h

    openList.push(startNode)
    openSet.add(startNode)

    while (openList.length > 0) {
      // Get node with lowest f value
      let currentIndex = 0
      for (let i = 1; i < openList.length; i++) {
        if (openList[i].f < openList[currentIndex].f) {
          currentIndex = i
        }
      }

      const currentNode = openList[currentIndex]

      // Check if we reached the goal
      if (currentNode.equals(endNode)) {
        return this.reconstructPath(currentNode)
      }

      // Move current node from open to closed list
      openList.splice(currentIndex, 1)
      openSet.delete(currentNode)
      closedList.add(currentNode)

      // Check all neighbors
      const neighbors = this.getNeighbors(currentNode)

      for (const neighbor of neighbors) {
        if (closedList.has(neighbor) || !neighbor.isWalkable()) {
          continue
        }

        // Calculate tentative g score
        const movementCost = this.getMovementCost(currentNode, neighbor)
        const tentativeG = currentNode.g + movementCost

        // If this path to neighbor is better than any previous one
        if (!openSet.has(neighbor) || tentativeG < neighbor.g) {
          neighbor.parent = currentNode
          neighbor.g = tentativeG
          neighbor.h = this.heuristic(neighbor, endNode)
          neighbor.f = neighbor.g + neighbor.h

          if (!openSet.has(neighbor)) {
            openList.push(neighbor)
            openSet.add(neighbor)
          }
        }
      }
    }

    // No path found
    return []
  }

  /**
   * Get movement cost between two adjacent nodes
   * @param {PathNode} nodeA 
   * @param {PathNode} nodeB 
   * @returns {number} Movement cost
   */
  getMovementCost(nodeA, nodeB) {
    const dx = Math.abs(nodeA.x - nodeB.x)
    const dy = Math.abs(nodeA.y - nodeB.y)
    
    // Base cost is terrain cost of destination node
    let cost = nodeB.cost

    // Diagonal movement costs more (sqrt(2) ≈ 1.414)
    if (dx === 1 && dy === 1) {
      cost *= 1.414
    }

    return cost
  }

  /**
   * Get valid neighbors for a node
   * @param {PathNode} node 
   * @returns {Array<PathNode>}
   */
  getNeighbors(node) {
    const neighbors = []
    const positions = node.getNeighborPositions()

    for (const pos of positions) {
      // Skip diagonal neighbors if diagonal movement is disabled
      if (!this.diagonalMovement) {
        const dx = Math.abs(pos.x - node.x)
        const dy = Math.abs(pos.y - node.y)
        if (dx === 1 && dy === 1) continue
      }

      const neighbor = this.grid.getNodeAt(pos.x, pos.y)
      if (neighbor && neighbor.isWalkable()) {
        // For diagonal movement, ensure we can actually move diagonally
        // (both adjacent cells must be walkable)
        if (this.diagonalMovement && Math.abs(pos.x - node.x) === 1 && Math.abs(pos.y - node.y) === 1) {
          const adjacentX = this.grid.getNodeAt(pos.x, node.y)
          const adjacentY = this.grid.getNodeAt(node.x, pos.y)
          
          if (!adjacentX || !adjacentX.isWalkable() || !adjacentY || !adjacentY.isWalkable()) {
            continue
          }
        }

        neighbors.push(neighbor)
      }
    }

    return neighbors
  }

  /**
   * Calculate heuristic distance between two nodes
   * @param {PathNode} nodeA 
   * @param {PathNode} nodeB 
   * @returns {number}
   */
  heuristic(nodeA, nodeB) {
    const dx = Math.abs(nodeA.x - nodeB.x)
    const dy = Math.abs(nodeA.y - nodeB.y)

    if (this.heuristicType === 'manhattan') {
      return dx + dy
    } else if (this.heuristicType === 'euclidean') {
      return Math.sqrt(dx * dx + dy * dy)
    } else {
      // Octile distance (good for diagonal movement)
      const F = Math.SQRT2 - 1
      return (dx < dy) ? F * dx + dy : F * dy + dx
    }
  }

  /**
   * Reconstruct path from end node to start node
   * @param {PathNode} endNode 
   * @returns {Array<PathNode>}
   */
  reconstructPath(endNode) {
    const path = []
    let current = endNode

    while (current) {
      path.unshift(current)
      current = current.parent
    }

    return path
  }

  /**
   * Smooth the path by removing unnecessary waypoints
   * @param {Array<PathNode>} path 
   * @returns {Array<PathNode>}
   */
  smoothPath(path) {
    if (path.length <= 2) return path

    const smoothed = [path[0]]
    let current = 0

    while (current < path.length - 1) {
      let farthest = current + 1

      // Find the farthest node we can reach in a straight line
      for (let i = current + 2; i < path.length; i++) {
        if (this.hasLineOfSight(path[current], path[i])) {
          farthest = i
        } else {
          break
        }
      }

      smoothed.push(path[farthest])
      current = farthest
    }

    return smoothed
  }

  /**
   * Check if there's a clear line of sight between two nodes
   * @param {PathNode} nodeA 
   * @param {PathNode} nodeB 
   * @returns {boolean}
   */
  hasLineOfSight(nodeA, nodeB) {
    const x0 = nodeA.x
    const y0 = nodeA.y
    const x1 = nodeB.x
    const y1 = nodeB.y

    const dx = Math.abs(x1 - x0)
    const dy = Math.abs(y1 - y0)
    const sx = x0 < x1 ? 1 : -1
    const sy = y0 < y1 ? 1 : -1
    let err = dx - dy

    let x = x0
    let y = y0

    while (x !== x1 || y !== y1) {
      const node = this.grid.getNodeAt(x, y)
      if (!node || !node.isWalkable()) {
        return false
      }

      const e2 = 2 * err
      if (e2 > -dy) {
        err -= dy
        x += sx
      }
      if (e2 < dx) {
        err += dx
        y += sy
      }
    }

    return true
  }

  /**
   * Find path with dynamic obstacle avoidance
   * Updates temporary obstacles and recalculates if needed
   * @param {number} startX 
   * @param {number} startY 
   * @param {number} endX 
   * @param {number} endY 
   * @param {Array<{x: number, y: number}>} dynamicObstacles 
   * @returns {Array<PathNode>}
   */
  findPathWithDynamicObstacles(startX, startY, endX, endY, dynamicObstacles = []) {
    // Mark dynamic obstacles
    for (const obstacle of dynamicObstacles) {
      const node = this.grid.getNodeAt(
        Math.floor(obstacle.x / PathNode.GRID_SIZE),
        Math.floor(obstacle.y / PathNode.GRID_SIZE)
      )
      if (node) {
        node.setTemporaryObstacle(5000) // 5 second obstacle
      }
    }

    // Find path considering temporary obstacles
    const path = this.findPath(startX, startY, endX, endY)

    return path
  }
}