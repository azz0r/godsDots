/**
 * Building System
 *
 * Manages non-temple buildings: Farm, House, Wall.
 * Handles placement, rendering, and building logic.
 */

import { TERRAIN_CONFIG } from '../config/terrainConfig';

const TILE_SIZE = TERRAIN_CONFIG.TILE_SIZE;

export const BUILDING_TYPES = {
  farm: {
    name: 'Farm',
    size: 2, // 2x2 tiles
    cost: 30,
    color: 0x8B4513, // Brown
    accentColor: 0x228B22, // Green crops
    description: 'Generates food when worked',
  },
  house: {
    name: 'House',
    size: 2,
    cost: 20,
    color: 0xD2B48C, // Tan
    accentColor: 0x8B0000, // Dark red roof
    popBonus: 5,
    description: 'Increases population cap by 5',
  },
  wall: {
    name: 'Wall',
    size: 1,
    cost: 5,
    color: 0x808080, // Gray
    accentColor: 0x606060,
    description: 'Blocks pathfinding',
  },
};

export default class BuildingSystem {
  constructor(scene) {
    this.scene = scene;
    this.buildings = [];
    this.nextId = 1;

    // Placement mode
    this.placementMode = false;
    this.selectedType = null;
    this.ghostPreview = null;

    // References
    this.playerSystem = null;
    this.pathfindingSystem = null;

    // Occupied tiles lookup (for collision)
    this.occupiedTiles = new Set();
  }

  /**
   * Enter building placement mode
   */
  startPlacement(typeId) {
    if (!BUILDING_TYPES[typeId]) return false;

    // Check cost
    if (this.playerSystem) {
      const human = this.playerSystem.getHumanPlayer();
      if (!human || human.beliefPoints < BUILDING_TYPES[typeId].cost) {
        return false;
      }
    }

    this.placementMode = true;
    this.selectedType = typeId;
    this.showGhostPreview();
    return true;
  }

  /**
   * Cancel placement mode
   */
  cancelPlacement() {
    this.placementMode = false;
    this.selectedType = null;
    this.hideGhostPreview();
  }

  /**
   * Try to place a building at world coordinates
   */
  placeAtWorld(worldX, worldY) {
    if (!this.placementMode || !this.selectedType) return false;

    const type = BUILDING_TYPES[this.selectedType];
    const tileX = Math.floor(worldX / TILE_SIZE);
    const tileY = Math.floor(worldY / TILE_SIZE);

    // Validate placement
    if (!this.canPlace(tileX, tileY, type.size)) {
      return false;
    }

    // Spend belief
    if (this.playerSystem) {
      const human = this.playerSystem.getHumanPlayer();
      if (!human || !this.playerSystem.spendBeliefPoints(human.id, type.cost)) {
        return false;
      }
    }

    // Create building
    const building = this.createBuilding(this.selectedType, tileX, tileY);

    // Exit placement mode
    this.cancelPlacement();

    return building;
  }

  /**
   * Check if a building can be placed at tile coordinates
   */
  canPlace(tileX, tileY, size) {
    const biomeMap = this.scene.biomeMap;
    if (!biomeMap) return false;

    for (let dy = 0; dy < size; dy++) {
      for (let dx = 0; dx < size; dx++) {
        const tx = tileX + dx;
        const ty = tileY + dy;

        // Bounds check
        if (ty < 0 || ty >= biomeMap.length || tx < 0 || tx >= biomeMap[0].length) {
          return false;
        }

        // Must be passable terrain
        if (!biomeMap[ty][tx].passable) {
          return false;
        }

        // Must not overlap existing building
        const key = `${tx},${ty}`;
        if (this.occupiedTiles.has(key)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Create a building entity and render it
   */
  createBuilding(typeId, tileX, tileY) {
    const type = BUILDING_TYPES[typeId];
    const building = {
      id: `building_${this.nextId++}`,
      type: typeId,
      tileX,
      tileY,
      size: type.size,
      playerId: this.playerSystem?.getHumanPlayer()?.id || null,
      _gameObjects: [],
    };

    // Mark tiles as occupied
    for (let dy = 0; dy < type.size; dy++) {
      for (let dx = 0; dx < type.size; dx++) {
        this.occupiedTiles.add(`${tileX + dx},${tileY + dy}`);
      }
    }

    // Render building
    if (this.scene && this.scene.add) {
      const pixelX = tileX * TILE_SIZE + (type.size * TILE_SIZE) / 2;
      const pixelY = tileY * TILE_SIZE + (type.size * TILE_SIZE) / 2;
      const pixelSize = type.size * TILE_SIZE;

      // Main body
      const body = this.scene.add.rectangle(pixelX, pixelY, pixelSize, pixelSize, type.color);
      body.setDepth(40);
      body.setStrokeStyle(1, 0xFFFFFF, 0.5);
      building._gameObjects.push(body);

      // Accent (crops for farm, roof for house)
      if (typeId === 'farm') {
        // Green crop dots
        const cropSize = TILE_SIZE;
        for (let i = 0; i < 4; i++) {
          const cx = pixelX + ((i % 2) - 0.5) * TILE_SIZE;
          const cy = pixelY + (Math.floor(i / 2) - 0.5) * TILE_SIZE;
          const crop = this.scene.add.circle(cx, cy, cropSize / 2, type.accentColor);
          crop.setDepth(41);
          building._gameObjects.push(crop);
        }
      } else if (typeId === 'house') {
        // Roof triangle-ish accent
        const roof = this.scene.add.rectangle(pixelX, pixelY - pixelSize * 0.15, pixelSize * 0.8, pixelSize * 0.3, type.accentColor);
        roof.setDepth(41);
        building._gameObjects.push(roof);
      }
    }

    // Update pathfinding to block tiles (for walls)
    if (typeId === 'wall' && this.pathfindingSystem) {
      // Mark tile as impassable (walls block movement)
      // Note: This is a visual-only effect for now
    }

    this.buildings.push(building);
    console.log(`[BuildingSystem] Placed ${type.name} at (${tileX}, ${tileY})`);

    return building;
  }

  /**
   * Remove a building
   */
  removeBuilding(buildingId) {
    const index = this.buildings.findIndex(b => b.id === buildingId);
    if (index === -1) return;

    const building = this.buildings[index];
    const type = BUILDING_TYPES[building.type];

    // Free tiles
    for (let dy = 0; dy < type.size; dy++) {
      for (let dx = 0; dx < type.size; dx++) {
        this.occupiedTiles.delete(`${building.tileX + dx},${building.tileY + dy}`);
      }
    }

    // Destroy game objects
    building._gameObjects.forEach(obj => obj.destroy());

    this.buildings.splice(index, 1);
  }

  /**
   * Get buildings owned by a player
   */
  getPlayerBuildings(playerId) {
    return this.buildings.filter(b => b.playerId === playerId);
  }

  /**
   * Get total population bonus from houses
   */
  getPopulationBonus(playerId) {
    return this.buildings
      .filter(b => b.playerId === playerId && b.type === 'house')
      .reduce((sum, b) => sum + (BUILDING_TYPES.house.popBonus || 0), 0);
  }

  /**
   * Show ghost preview of building at cursor
   */
  showGhostPreview() {
    this.hideGhostPreview();
    if (!this.selectedType || !this.scene) return;

    const type = BUILDING_TYPES[this.selectedType];
    const pixelSize = type.size * TILE_SIZE;

    this.ghostPreview = this.scene.add.rectangle(0, 0, pixelSize, pixelSize, type.color, 0.4);
    this.ghostPreview.setDepth(150);
    this.ghostPreview.setStrokeStyle(2, 0xFFFFFF, 0.6);
  }

  /**
   * Hide ghost preview
   */
  hideGhostPreview() {
    if (this.ghostPreview) {
      this.ghostPreview.destroy();
      this.ghostPreview = null;
    }
  }

  /**
   * Update ghost preview position and check validity
   */
  update(delta) {
    if (!this.placementMode || !this.ghostPreview || !this.selectedType) return;

    const pointer = this.scene.input.mousePointer;
    const camera = this.scene.cameras.main;
    const worldX = pointer.x / camera.zoom + camera.scrollX;
    const worldY = pointer.y / camera.zoom + camera.scrollY;

    const type = BUILDING_TYPES[this.selectedType];
    const tileX = Math.floor(worldX / TILE_SIZE);
    const tileY = Math.floor(worldY / TILE_SIZE);

    // Snap to tile grid
    const snapX = tileX * TILE_SIZE + (type.size * TILE_SIZE) / 2;
    const snapY = tileY * TILE_SIZE + (type.size * TILE_SIZE) / 2;
    this.ghostPreview.setPosition(snapX, snapY);

    // Color based on validity
    const valid = this.canPlace(tileX, tileY, type.size);
    this.ghostPreview.setFillStyle(valid ? type.color : 0xFF0000, 0.4);
    this.ghostPreview.setStrokeStyle(2, valid ? 0xFFFFFF : 0xFF0000, 0.6);
  }

  getCount() {
    return this.buildings.length;
  }

  clearAll() {
    this.buildings.forEach(b => {
      b._gameObjects.forEach(obj => obj.destroy());
    });
    this.buildings = [];
    this.occupiedTiles.clear();
  }

  destroy() {
    this.cancelPlacement();
    this.clearAll();
  }
}
