/**
 * Layer 4: Villager Entity
 *
 * Represents a single villager with pathfinding and state management.
 * States: idle, moving, worshipping, sleeping
 */

export default class Villager {
  constructor(id, x, y) {
    this.id = id;
    this.x = x;
    this.y = y;

    // Movement
    this.speed = 10; // Tiles per second
    this.speedMultiplier = 1.0; // Modified by VillagerSystem (e.g. starvation penalty)
    this.currentPath = null;
    this.pathIndex = 0;

    // State management: idle | moving | worshipping | sleeping
    this.state = 'idle';
    this.isPaused = false;

    // Health
    this.health = 100;
    this.maxHealth = 100;

    // Identity
    this.name = null; // Set by VillagerSystem

    // Player ownership
    this.playerId = null;
    this.playerColor = null;

    // Return journey
    this.origin = { x, y };
    this.destination = null;
    this.returningHome = false;
    this.goingHome = false; // Going to temple area (nighttime)
    this.pauseTimer = 0;
    this.pauseDuration = 2000; // 2s pause at destination

    // Worship
    this.worshipTimer = 0;
    this.worshipDuration = 6000; // 6 seconds of worship
    this.worshipTempleId = null;
    this.goingToWorship = false; // True when moving towards temple to worship
  }

  setPath(path) {
    if (!path || path.length === 0) {
      this.clearPath();
      return;
    }
    this.currentPath = path;
    this.pathIndex = 0;
    this.state = 'moving';
  }

  clearPath() {
    this.currentPath = null;
    this.pathIndex = 0;
    this.state = 'idle';
  }

  /**
   * Enter worship state at a temple
   */
  startWorship(templeId) {
    this.state = 'worshipping';
    this.worshipTempleId = templeId;
    this.worshipTimer = this.worshipDuration;
    this.goingToWorship = false;
    this.currentPath = null;
    this.pathIndex = 0;
  }

  /**
   * End worship and return to idle
   */
  endWorship() {
    this.state = 'idle';
    this.worshipTempleId = null;
    this.worshipTimer = 0;
    this.pauseTimer = this.pauseDuration;
  }

  /**
   * Enter sleep state (nighttime)
   */
  startSleep() {
    this.state = 'sleeping';
    this.currentPath = null;
    this.pathIndex = 0;
    this.goingToWorship = false;
    this.goingHome = false;
  }

  /**
   * Wake up from sleep
   */
  wakeUp() {
    this.state = 'idle';
    this.pauseTimer = 1000; // Brief pause after waking
  }

  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
    return this.health <= 0;
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  isDead() {
    return this.health <= 0;
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    this.isPaused = false;
  }

  update(delta) {
    if (this.isPaused) return;

    // Sleeping - do nothing (woken by VillagerSystem when day comes)
    if (this.state === 'sleeping') return;

    // Handle worship timer
    if (this.state === 'worshipping') {
      this.worshipTimer -= delta;
      if (this.worshipTimer <= 0) {
        this.endWorship();
      }
      return;
    }

    // Handle pause timer at destination
    if (this.pauseTimer > 0) {
      this.pauseTimer -= delta;
      if (this.pauseTimer <= 0) {
        this.pauseTimer = 0;
      }
      return;
    }

    // Only move if in moving state
    if (this.state !== 'moving' || !this.currentPath) return;

    let remainingMovement = (this.speed * this.speedMultiplier * delta) / 1000;

    while (remainingMovement > 0 && this.pathIndex < this.currentPath.length) {
      const target = this.currentPath[this.pathIndex];
      if (!target) {
        this.clearPath();
        break;
      }

      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= remainingMovement) {
        this.x = target.x;
        this.y = target.y;
        remainingMovement -= distance;
        this.pathIndex++;

        if (this.pathIndex >= this.currentPath.length) {
          this.clearPath();
          // If going to worship, start worshipping
          if (this.goingToWorship && this.worshipTempleId) {
            this.startWorship(this.worshipTempleId);
          } else if (this.goingHome) {
            this.startSleep();
          } else {
            this.pauseTimer = this.pauseDuration;
          }
          break;
        }
      } else {
        const ratio = remainingMovement / distance;
        this.x += dx * ratio;
        this.y += dy * ratio;
        remainingMovement = 0;
      }
    }
  }

  destroy() {
    // Circle cleanup handled by VillagerSystem
  }
}
