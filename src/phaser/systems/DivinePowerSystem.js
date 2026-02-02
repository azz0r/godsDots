/**
 * Divine Power System
 *
 * Manages divine powers (Heal, Storm, Food Blessing) with targeting,
 * cooldowns, and visual effects.
 */

import { TERRAIN_CONFIG } from '../config/terrainConfig';

const POWERS = {
  heal: {
    name: 'Heal',
    cost: 20,
    cooldown: 10000, // 10 seconds
    radius: 5, // tiles
    color: 0x00FF00,
  },
  storm: {
    name: 'Storm',
    cost: 50,
    cooldown: 30000,
    radius: 8,
    color: 0x6666FF,
  },
  food: {
    name: 'Food Blessing',
    cost: 30,
    cooldown: 20000,
    radius: 10,
    color: 0xFFD700,
  },
};

export default class DivinePowerSystem {
  constructor(scene) {
    this.scene = scene;
    this.selectedPower = null;
    this.cooldowns = {}; // { powerId: remainingMs }
    this.targetingCircle = null;

    // References set by MainScene
    this.playerSystem = null;
    this.villagerSystem = null;
  }

  /**
   * Select a power for targeting
   */
  selectPower(powerId) {
    if (!POWERS[powerId]) return false;

    // Check cooldown
    if (this.cooldowns[powerId] && this.cooldowns[powerId] > 0) {
      return false;
    }

    // Check cost
    if (this.playerSystem) {
      const human = this.playerSystem.getHumanPlayer();
      if (!human || human.beliefPoints < POWERS[powerId].cost) {
        return false;
      }
    }

    this.selectedPower = powerId;
    this.showTargetingCircle();
    return true;
  }

  /**
   * Cancel power selection
   */
  cancelPower() {
    this.selectedPower = null;
    this.hideTargetingCircle();
  }

  /**
   * Cast selected power at world coordinates
   */
  castAtWorld(worldX, worldY) {
    if (!this.selectedPower) return false;

    const power = POWERS[this.selectedPower];
    if (!power) return false;

    // Check cooldown
    if (this.cooldowns[this.selectedPower] > 0) {
      this.cancelPower();
      return false;
    }

    // Spend belief
    if (this.playerSystem) {
      const human = this.playerSystem.getHumanPlayer();
      if (!human || !this.playerSystem.spendBeliefPoints(human.id, power.cost)) {
        this.cancelPower();
        return false;
      }
    }

    // Apply effect
    const tileX = Math.floor(worldX / TERRAIN_CONFIG.TILE_SIZE);
    const tileY = Math.floor(worldY / TERRAIN_CONFIG.TILE_SIZE);

    this.applyPowerEffect(this.selectedPower, worldX, worldY, tileX, tileY);

    // Start cooldown
    this.cooldowns[this.selectedPower] = power.cooldown;

    // Show visual effect
    this.showCastEffect(worldX, worldY, power);

    // Deselect
    const castPower = this.selectedPower;
    this.cancelPower();

    this.scene.events.emit('powerCast', { powerId: castPower, worldX, worldY });
    return true;
  }

  /**
   * Apply power effect to entities in range
   */
  applyPowerEffect(powerId, worldX, worldY, tileX, tileY) {
    const power = POWERS[powerId];
    if (!this.villagerSystem) return;

    const radiusSq = power.radius * power.radius;

    switch (powerId) {
      case 'heal': {
        // Heal all owned villagers in radius (visual only for now)
        const human = this.playerSystem?.getHumanPlayer();
        if (!human) break;

        let healed = 0;
        for (const villager of this.villagerSystem.villagers) {
          if (villager.playerId !== human.id) continue;

          const dx = villager.x - tileX;
          const dy = villager.y - tileY;
          if (dx * dx + dy * dy <= radiusSq) {
            healed++;
            // Flash the villager green briefly
            if (villager._circle) {
              villager._circle.setFillStyle(0x00FF00);
              this.scene.time.delayedCall(500, () => {
                if (villager._circle && villager.playerColor) {
                  villager._circle.setFillStyle(villager.playerColor);
                }
              });
            }
          }
        }
        console.log(`[DivinePower] Heal: ${healed} villagers affected`);
        break;
      }

      case 'storm': {
        // Scatter all villagers in radius (set to flee-like wander)
        let scattered = 0;
        for (const villager of this.villagerSystem.villagers) {
          const dx = villager.x - tileX;
          const dy = villager.y - tileY;
          if (dx * dx + dy * dy <= radiusSq) {
            scattered++;
            // Interrupt current state and flee outward
            villager.clearPath();
            villager.endWorship?.();
            villager.pauseTimer = 0;

            // Flash red
            if (villager._circle) {
              villager._circle.setFillStyle(0xFF0000);
              this.scene.time.delayedCall(500, () => {
                if (villager._circle && villager.playerColor) {
                  villager._circle.setFillStyle(villager.playerColor);
                } else if (villager._circle) {
                  villager._circle.setFillStyle(0xff0000);
                }
              });
            }
          }
        }
        console.log(`[DivinePower] Storm: ${scattered} villagers scattered`);
        break;
      }

      case 'food': {
        // Add belief bonus (food system not yet implemented)
        const human = this.playerSystem?.getHumanPlayer();
        if (human) {
          this.playerSystem.addBeliefPoints(human.id, 50);
          console.log(`[DivinePower] Food Blessing: +50 belief bonus`);
        }

        // Speed boost to nearby owned villagers
        for (const villager of this.villagerSystem.villagers) {
          const dx = villager.x - tileX;
          const dy = villager.y - tileY;
          if (dx * dx + dy * dy <= radiusSq) {
            const origSpeed = villager.speed;
            villager.speed = origSpeed * 1.5;

            // Flash gold
            if (villager._circle) {
              villager._circle.setFillStyle(0xFFD700);
              this.scene.time.delayedCall(500, () => {
                if (villager._circle && villager.playerColor) {
                  villager._circle.setFillStyle(villager.playerColor);
                }
              });
            }

            // Revert speed after 10 seconds
            this.scene.time.delayedCall(10000, () => {
              villager.speed = origSpeed;
            });
          }
        }
        break;
      }
    }
  }

  /**
   * Show expanding circle visual effect at cast location
   */
  showCastEffect(worldX, worldY, power) {
    const TILE_SIZE = TERRAIN_CONFIG.TILE_SIZE;
    const maxRadius = power.radius * TILE_SIZE;

    // Create expanding circle
    const circle = this.scene.add.circle(worldX, worldY, 0, power.color, 0.3);
    circle.setDepth(200);
    circle.setStrokeStyle(2, power.color, 0.8);

    // Animate expansion
    this.scene.tweens.add({
      targets: circle,
      radius: maxRadius,
      alpha: 0,
      duration: 600,
      ease: 'Power2',
      onUpdate: () => {
        // Phaser circles don't tween radius directly, use scale
        circle.setRadius(circle.radius);
      },
      onComplete: () => {
        circle.destroy();
      }
    });

    // Second ring for emphasis
    const ring = this.scene.add.circle(worldX, worldY, maxRadius * 0.3, power.color, 0.15);
    ring.setDepth(200);
    ring.setStrokeStyle(1, power.color, 0.5);

    this.scene.tweens.add({
      targets: ring,
      scaleX: power.radius / 3,
      scaleY: power.radius / 3,
      alpha: 0,
      duration: 800,
      ease: 'Power1',
      onComplete: () => {
        ring.destroy();
      }
    });
  }

  /**
   * Show targeting circle following the cursor
   */
  showTargetingCircle() {
    this.hideTargetingCircle();

    if (!this.selectedPower) return;

    const power = POWERS[this.selectedPower];
    const TILE_SIZE = TERRAIN_CONFIG.TILE_SIZE;
    const radius = power.radius * TILE_SIZE;

    this.targetingCircle = this.scene.add.circle(0, 0, radius, power.color, 0.1);
    this.targetingCircle.setDepth(150);
    this.targetingCircle.setStrokeStyle(2, power.color, 0.6);
  }

  /**
   * Hide targeting circle
   */
  hideTargetingCircle() {
    if (this.targetingCircle) {
      this.targetingCircle.destroy();
      this.targetingCircle = null;
    }
  }

  /**
   * Update targeting circle to follow cursor, tick cooldowns
   */
  update(delta) {
    // Tick cooldowns
    for (const powerId of Object.keys(this.cooldowns)) {
      if (this.cooldowns[powerId] > 0) {
        this.cooldowns[powerId] -= delta;
        if (this.cooldowns[powerId] < 0) this.cooldowns[powerId] = 0;
      }
    }

    // Update targeting circle position
    if (this.targetingCircle && this.selectedPower) {
      const pointer = this.scene.input.mousePointer;
      const camera = this.scene.cameras.main;
      const worldX = pointer.x / camera.zoom + camera.scrollX;
      const worldY = pointer.y / camera.zoom + camera.scrollY;
      this.targetingCircle.setPosition(worldX, worldY);
    }
  }

  /**
   * Get power info for UI
   */
  getPowerInfo(powerId) {
    const power = POWERS[powerId];
    if (!power) return null;

    return {
      ...power,
      id: powerId,
      cooldownRemaining: this.cooldowns[powerId] || 0,
      isOnCooldown: (this.cooldowns[powerId] || 0) > 0,
      isSelected: this.selectedPower === powerId,
    };
  }

  /**
   * Get all power infos
   */
  getAllPowerInfo() {
    return Object.keys(POWERS).map(id => this.getPowerInfo(id));
  }

  destroy() {
    this.hideTargetingCircle();
    this.selectedPower = null;
    this.cooldowns = {};
  }
}
