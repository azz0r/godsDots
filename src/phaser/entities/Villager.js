/**
 * Layer 4: Villager Entity
 *
 * Represents a single villager with pathfinding and state management.
 * States: idle, moving, worshipping
 */

export default class Villager {
  constructor(id, x, y) {
    this.id = id;
    this.x = x;
    this.y = y;

    // Movement
    this.speed = 10; // Tiles per second
    this.currentPath = null;
    this.pathIndex = 0;

    // State management: idle | moving | worshipping
    this.state = 'idle';
    this.isPaused = false;

    // Return journey
    this.origin = { x, y };
    this.destination = null;
    this.returningHome = false;
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

  pause() {
    this.isPaused = true;
  }

  resume() {
    this.isPaused = false;
  }

  update(delta) {
    if (this.isPaused) return;

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

    let remainingMovement = (this.speed * delta) / 1000;

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
          // If going to worship, start worshipping instead of pausing
          if (this.goingToWorship && this.worshipTempleId) {
            this.startWorship(this.worshipTempleId);
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
