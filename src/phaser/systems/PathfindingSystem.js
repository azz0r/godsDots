/**
 * Layer 3: Pathfinding System
 *
 * A* pathfinding algorithm optimized for terrain-based navigation.
 * Respects biome movement costs, height differences, and obstacles.
 */

/**
 * Node class for A* algorithm
 */
class PathNode {
  constructor(x, y, g = 0, h = 0, parent = null) {
    this.x = x;
    this.y = y;
    this.g = g; // Cost from start
    this.h = h; // Heuristic cost to goal
    this.f = g + h; // Total cost
    this.parent = parent;
  }

  equals(other) {
    return this.x === other.x && this.y === other.y;
  }
}

/**
 * PathfindingSystem - A* pathfinding for terrain navigation
 */
export default class PathfindingSystem {
  /**
   * Create a new pathfinding system
   * @param {Array<Array<BiomeType>>} terrainData - 2D array of biome objects
   * @param {Object} options - Configuration options
   */
  constructor(terrainData, options = {}) {
    // Validate terrain data
    if (!terrainData || !Array.isArray(terrainData) || terrainData.length === 0) {
      throw new Error('PathfindingSystem requires valid terrain data');
    }

    if (!terrainData[0] || terrainData[0].length === 0) {
      throw new Error('PathfindingSystem requires non-empty terrain data');
    }

    this.terrainData = terrainData;
    this.height = terrainData.length;
    this.width = terrainData[0].length;

    // Options
    this.allowDiagonal = options.allowDiagonal !== undefined ? options.allowDiagonal : true;
    this.dontCrossCorners = options.dontCrossCorners !== undefined ? options.dontCrossCorners : true;
    this.respectHeight = options.respectHeight !== undefined ? options.respectHeight : false;
    this.maxHeightDiff = options.maxHeightDiff !== undefined ? options.maxHeightDiff : 1;
  }

  /**
   * Find a path from start to goal using A* algorithm
   * @param {number} startX - Starting X coordinate
   * @param {number} startY - Starting Y coordinate
   * @param {number} goalX - Goal X coordinate
   * @param {number} goalY - Goal Y coordinate
   * @returns {Array<{x, y}>|null} Path as array of coordinates, or null if no path found
   */
  findPath(startX, startY, goalX, goalY) {
    // Validate coordinates
    if (!this.isInBounds(startX, startY) || !this.isInBounds(goalX, goalY)) {
      return null;
    }

    // Same start and goal
    if (startX === goalX && startY === goalY) {
      return null;
    }

    // Check if start or goal is passable
    if (!this.isPassable(startX, startY) || !this.isPassable(goalX, goalY)) {
      return null;
    }

    const openList = [];
    const closedSet = new Set();

    // Create start node
    const startNode = new PathNode(
      startX,
      startY,
      0,
      this.heuristic(startX, startY, goalX, goalY)
    );

    openList.push(startNode);

    while (openList.length > 0) {
      // Get node with lowest f score
      let currentIndex = 0;
      for (let i = 1; i < openList.length; i++) {
        if (openList[i].f < openList[currentIndex].f) {
          currentIndex = i;
        }
      }

      const current = openList[currentIndex];

      // Found the goal
      if (current.x === goalX && current.y === goalY) {
        return this.reconstructPath(current);
      }

      // Move current from open to closed
      openList.splice(currentIndex, 1);
      closedSet.add(`${current.x},${current.y}`);

      // Check all neighbors
      const neighbors = this.getNeighbors(current.x, current.y);

      for (const neighbor of neighbors) {
        const { x, y } = neighbor;

        // Skip if in closed set
        if (closedSet.has(`${x},${y}`)) {
          continue;
        }

        // Skip if not passable
        if (!this.isPassable(x, y)) {
          continue;
        }

        // Skip if height difference too large
        if (this.respectHeight && !this.canTraverse(current.x, current.y, x, y)) {
          continue;
        }

        // Calculate g score (cost from start)
        const movementCost = this.getMovementCost(x, y);
        const isDiagonal = current.x !== x && current.y !== y;
        const distance = isDiagonal ? 1.414 : 1.0; // √2 for diagonal
        const g = current.g + (distance * movementCost);

        // Check if this node is in open list
        let openNode = openList.find(node => node.x === x && node.y === y);

        if (!openNode) {
          // Add new node to open list
          const h = this.heuristic(x, y, goalX, goalY);
          openNode = new PathNode(x, y, g, h, current);
          openList.push(openNode);
        } else if (g < openNode.g) {
          // Found better path to this node
          openNode.g = g;
          openNode.f = g + openNode.h;
          openNode.parent = current;
        }
      }
    }

    // No path found
    return null;
  }

  /**
   * Get neighbors for a given position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {Array<{x, y}>} Array of neighbor coordinates
   */
  getNeighbors(x, y) {
    const neighbors = [];

    // Cardinal directions (always checked)
    const cardinalDirections = [
      { x: x, y: y - 1 },     // North
      { x: x + 1, y: y },     // East
      { x: x, y: y + 1 },     // South
      { x: x - 1, y: y }      // West
    ];

    // Diagonal directions
    const diagonalDirections = [
      { x: x - 1, y: y - 1 }, // Northwest
      { x: x + 1, y: y - 1 }, // Northeast
      { x: x + 1, y: y + 1 }, // Southeast
      { x: x - 1, y: y + 1 }  // Southwest
    ];

    // Add cardinal neighbors
    for (const dir of cardinalDirections) {
      if (this.isInBounds(dir.x, dir.y)) {
        neighbors.push(dir);
      }
    }

    // Add diagonal neighbors if allowed
    if (this.allowDiagonal) {
      for (let i = 0; i < diagonalDirections.length; i++) {
        const dir = diagonalDirections[i];

        if (!this.isInBounds(dir.x, dir.y)) {
          continue;
        }

        // Check corner crossing if enabled
        if (this.dontCrossCorners) {
          // For each diagonal, check both adjacent cardinal tiles
          // For example, for NW, check N and W
          const cardinal1 = cardinalDirections[i];
          const cardinal2 = cardinalDirections[(i + 3) % 4];

          // Skip diagonal if either cardinal is blocked
          if (!this.isPassable(cardinal1.x, cardinal1.y) ||
              !this.isPassable(cardinal2.x, cardinal2.y)) {
            continue;
          }
        }

        neighbors.push(dir);
      }
    }

    return neighbors;
  }

  /**
   * Check if coordinates are within bounds
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {boolean} True if in bounds
   */
  isInBounds(x, y) {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  /**
   * Check if a tile is passable
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {boolean} True if passable
   */
  isPassable(x, y) {
    if (!this.isInBounds(x, y)) {
      return false;
    }

    const biome = this.terrainData[y][x];
    return biome.passable === true;
  }

  /**
   * Check if can traverse from one tile to another based on height
   * @param {number} fromX - From X coordinate
   * @param {number} fromY - From Y coordinate
   * @param {number} toX - To X coordinate
   * @param {number} toY - To Y coordinate
   * @returns {boolean} True if traversable
   */
  canTraverse(fromX, fromY, toX, toY) {
    const fromBiome = this.terrainData[fromY][fromX];
    const toBiome = this.terrainData[toY][toX];

    const heightDiff = Math.abs(fromBiome.height - toBiome.height);
    return heightDiff <= this.maxHeightDiff;
  }

  /**
   * Get movement cost for a tile
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {number} Movement cost multiplier
   */
  getMovementCost(x, y) {
    if (!this.isInBounds(x, y)) {
      return Infinity;
    }

    const biome = this.terrainData[y][x];
    return biome.movementCost || 1.0;
  }

  /**
   * Heuristic function (Manhattan distance with movement cost estimate)
   * @param {number} x1 - Start X
   * @param {number} y1 - Start Y
   * @param {number} x2 - Goal X
   * @param {number} y2 - Goal Y
   * @returns {number} Heuristic cost
   */
  heuristic(x1, y1, x2, y2) {
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);

    if (this.allowDiagonal) {
      // Octile distance (allows diagonal movement)
      const D = 1.0;  // Cost of cardinal move
      const D2 = 1.414; // Cost of diagonal move (√2)
      return D * (dx + dy) + (D2 - 2 * D) * Math.min(dx, dy);
    } else {
      // Manhattan distance (only cardinal movement)
      return dx + dy;
    }
  }

  /**
   * Reconstruct path from goal node
   * @param {PathNode} goalNode - The goal node
   * @returns {Array<{x, y}>} Path as array of coordinates
   */
  reconstructPath(goalNode) {
    const path = [];
    let current = goalNode;

    while (current !== null) {
      path.unshift({ x: current.x, y: current.y });
      current = current.parent;
    }

    return path;
  }

  /**
   * Calculate total cost of a path
   * @param {Array<{x, y}>} path - Path to calculate cost for
   * @returns {number} Total path cost
   */
  getPathCost(path) {
    if (!path || path.length === 0) {
      return 0;
    }

    let totalCost = 0;

    // Start from index 1 (don't count starting tile)
    for (let i = 1; i < path.length; i++) {
      const node = path[i];
      const movementCost = this.getMovementCost(node.x, node.y);
      totalCost += movementCost;
    }

    return totalCost;
  }
}
