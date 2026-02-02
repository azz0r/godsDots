/**
 * Layer 4: Villager Management System
 *
 * Manages all villagers, spawning, updating, pathfinding, and worship.
 * Uses individual Phaser circle game objects for rendering.
 */

import Villager from '../entities/Villager';
import { TERRAIN_CONFIG } from '../config/terrainConfig';

const MAX_VILLAGERS = 1400;
const VILLAGER_RADIUS = 10;
const WORSHIP_CHANCE = 0.4; // 40% chance to worship when idle near temple
const WORSHIP_RANGE = 15; // Tiles - how close to temple to trigger worship
const BELIEF_PER_SECOND = 1; // Belief points generated per worshipping villager per second

export default class VillagerSystem {
  constructor(scene, pathfindingSystem) {
    this.scene = scene;
    this.pathfindingSystem = pathfindingSystem;

    this.villagers = [];
    this.nextId = 1;
    this.isPaused = false;

    this.mapWidth = 250;
    this.mapHeight = 250;

    this.autoAssignDestinations = true;
    this.biomeMap = null;

    // Night state tracking
    this.isNight = false;

    // References set by MainScene after initialization
    this.templeSystem = null;
    this.playerSystem = null;
  }

  setMapBounds(width, height) {
    this.mapWidth = width;
    this.mapHeight = height;
  }

  setTerrainData(biomeMap) {
    this.biomeMap = biomeMap;
  }

  spawnVillager(x, y) {
    if (!this.scene) return null;
    if (this.villagers.length >= MAX_VILLAGERS) return null;

    const villager = new Villager(this.nextId++, x, y);
    villager.origin = { x, y };

    if (this.scene.add) {
      const TILE_SIZE = TERRAIN_CONFIG.TILE_SIZE;
      const pixelX = x * TILE_SIZE + TILE_SIZE / 2;
      const pixelY = y * TILE_SIZE + TILE_SIZE / 2;

      const circle = this.scene.add.circle(pixelX, pixelY, VILLAGER_RADIUS, 0xff0000);
      circle.setDepth(100);
      circle.setStrokeStyle(1, 0xFFFFFF, 0.7);
      villager._circle = circle;
    }

    this.villagers.push(villager);
    return villager;
  }

  removeVillager(id) {
    const index = this.villagers.findIndex(v => v.id === id);
    if (index !== -1) {
      const villager = this.villagers[index];
      if (villager._circle) villager._circle.destroy();
      villager.destroy();
      this.villagers.splice(index, 1);
    }
  }

  clearAll() {
    this.villagers.forEach(villager => {
      if (villager._circle) villager._circle.destroy();
      villager.destroy();
    });
    this.villagers = [];
  }

  /**
   * Find the nearest temple owned by the same player
   */
  findNearestTemple(villager) {
    if (!this.templeSystem) return null;

    let nearest = null;
    let nearestDist = Infinity;

    for (const temple of this.templeSystem.temples) {
      if (temple.playerId !== villager.playerId) continue;

      const dx = temple.position.x - villager.x;
      const dy = temple.position.y - villager.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = temple;
      }
    }

    return nearest;
  }

  /**
   * Assign villager to worship at their nearest temple
   */
  assignWorship(villager) {
    if (!this.pathfindingSystem) return false;

    const temple = this.findNearestTemple(villager);
    if (!temple) return false;

    const startX = Math.floor(villager.x);
    const startY = Math.floor(villager.y);
    const path = this.pathfindingSystem.findPath(
      startX, startY,
      temple.position.x, temple.position.y
    );

    if (path) {
      villager.setPath(path);
      villager.goingToWorship = true;
      villager.worshipTempleId = temple.id;
      villager.destination = { x: temple.position.x, y: temple.position.y };
      return true;
    }
    return false;
  }

  /**
   * Assign a random passable destination to a villager
   */
  assignRandomDestination(villager, destX, destY) {
    if (!this.pathfindingSystem) return;

    let targetX, targetY;

    if (destX !== undefined && destY !== undefined) {
      targetX = destX;
      targetY = destY;
    } else if (villager.returningHome) {
      targetX = villager.origin.x;
      targetY = villager.origin.y;
    } else {
      const wanderRadius = 30;
      let found = false;

      for (let attempt = 0; attempt < 10; attempt++) {
        const tx = Math.floor(villager.origin.x + (Math.random() - 0.5) * wanderRadius * 2);
        const ty = Math.floor(villager.origin.y + (Math.random() - 0.5) * wanderRadius * 2);
        const cx = Math.max(0, Math.min(this.mapWidth - 1, tx));
        const cy = Math.max(0, Math.min(this.mapHeight - 1, ty));

        if (this.biomeMap && this.biomeMap[cy] && this.biomeMap[cy][cx] &&
            this.biomeMap[cy][cx].passable) {
          targetX = cx;
          targetY = cy;
          found = true;
          break;
        }
      }

      if (!found) {
        villager.clearPath();
        return;
      }
    }

    const startX = Math.floor(villager.x);
    const startY = Math.floor(villager.y);
    const path = this.pathfindingSystem.findPath(startX, startY, targetX, targetY);

    if (path) {
      villager.setPath(path);
      villager.destination = { x: targetX, y: targetY };
    } else {
      villager.clearPath();
    }
  }

  update(delta) {
    if (this.isPaused) return;

    // Check night state from game clock
    const gameClock = this.scene && this.scene.gameClock;
    const wasNight = this.isNight;
    this.isNight = gameClock ? gameClock.isNight() : false;

    // Night->Day transition: wake everyone up
    if (wasNight && !this.isNight) {
      for (const villager of this.villagers) {
        if (villager.state === 'sleeping') {
          villager.wakeUp();
        }
      }
    }

    const TILE_SIZE = TERRAIN_CONFIG.TILE_SIZE;

    for (const villager of this.villagers) {
      villager.update(delta);

      // Update circle position
      if (villager._circle) {
        villager._circle.x = villager.x * TILE_SIZE + TILE_SIZE / 2;
        villager._circle.y = villager.y * TILE_SIZE + TILE_SIZE / 2;

        // Set player color once
        if (villager.playerColor && !villager._colorSet) {
          villager._circle.setFillStyle(villager.playerColor);
          villager._colorSet = true;
        }

        // Visual feedback by state
        if (villager.state === 'worshipping') {
          const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 300);
          villager._circle.setAlpha(pulse);
        } else if (villager.state === 'sleeping') {
          villager._circle.setAlpha(0.4); // Dim when sleeping
        } else if (villager._circle.alpha !== 1) {
          villager._circle.setAlpha(1);
        }
      }

      // Generate belief while worshipping
      if (villager.state === 'worshipping' && this.playerSystem && villager.playerId) {
        const beliefThisFrame = (BELIEF_PER_SECOND * delta) / 1000;
        this.playerSystem.addBeliefPoints(villager.playerId, beliefThisFrame);
      }

      // Auto-assign behavior when idle and pause timer expired
      if (this.autoAssignDestinations &&
          villager.state === 'idle' &&
          villager.pauseTimer === 0) {

        // Nighttime: send villagers home to sleep
        if (this.isNight) {
          this.sendVillagerHome(villager);
          continue;
        }

        // Check if near temple and should worship
        const temple = this.findNearestTemple(villager);
        if (temple) {
          const dx = temple.position.x - villager.x;
          const dy = temple.position.y - villager.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist <= WORSHIP_RANGE && Math.random() < WORSHIP_CHANCE) {
            if (this.assignWorship(villager)) continue;
          }
        }

        // Normal wander behavior
        if (villager.returningHome) {
          villager.returningHome = false;
          this.assignRandomDestination(villager);
        } else if (villager.destination) {
          villager.returningHome = true;
          this.assignRandomDestination(villager);
        } else {
          this.assignRandomDestination(villager);
        }
      }
    }
  }

  /**
   * Send a villager back to their temple area to sleep
   */
  sendVillagerHome(villager) {
    if (!this.pathfindingSystem) {
      villager.startSleep();
      return;
    }

    const temple = this.findNearestTemple(villager);
    if (!temple) {
      villager.startSleep();
      return;
    }

    const dx = temple.position.x - villager.x;
    const dy = temple.position.y - villager.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Already near temple, just sleep
    if (dist <= 8) {
      villager.startSleep();
      return;
    }

    // Pathfind to near temple
    const startX = Math.floor(villager.x);
    const startY = Math.floor(villager.y);
    const path = this.pathfindingSystem.findPath(
      startX, startY,
      temple.position.x, temple.position.y
    );

    if (path) {
      villager.setPath(path);
      villager.goingHome = true;
    } else {
      villager.startSleep(); // Can't path, just sleep in place
    }
  }

  pauseAll() {
    this.isPaused = true;
    this.villagers.forEach(v => v.pause());
  }

  resumeAll() {
    this.isPaused = false;
    this.villagers.forEach(v => v.resume());
  }

  getCount() {
    return this.villagers.length;
  }

  getMaxVillagers() {
    return MAX_VILLAGERS;
  }

  getVillager(id) {
    return this.villagers.find(v => v.id === id) || null;
  }

  /**
   * Get count of currently worshipping villagers
   */
  getWorshippingCount() {
    return this.villagers.filter(v => v.state === 'worshipping').length;
  }

  /**
   * Get count of sleeping villagers
   */
  getSleepingCount() {
    return this.villagers.filter(v => v.state === 'sleeping').length;
  }
}
