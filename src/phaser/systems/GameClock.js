/**
 * Game Clock System
 *
 * Tracks in-game time with day/night cycle.
 * One game day = 60 real seconds (configurable).
 * Hours 0-23, with night from 20-5.
 */

const DAY_DURATION_MS = 60000; // 60 seconds per game day
const HOURS_PER_DAY = 24;
const MS_PER_HOUR = DAY_DURATION_MS / HOURS_PER_DAY;
const NIGHT_START = 20; // 8 PM
const NIGHT_END = 5; // 5 AM
const DAWN_START = 5;
const DAWN_END = 7;
const DUSK_START = 18;
const DUSK_END = 20;

export default class GameClock {
  constructor(scene) {
    this.scene = scene;
    this.day = 1;
    this.timeMs = DAY_DURATION_MS * 0.3; // Start at roughly 7 AM
    this.lastHour = -1;

    // Night overlay
    this.nightOverlay = null;
    if (scene && scene.add) {
      this.nightOverlay = scene.add.rectangle(
        0, 0, scene.cameras.main.width * 4, scene.cameras.main.height * 4,
        0x000033
      );
      this.nightOverlay.setScrollFactor(0);
      this.nightOverlay.setDepth(4999); // Just below HUD
      this.nightOverlay.setAlpha(0);
      this.nightOverlay.setOrigin(0, 0);
    }
  }

  /**
   * Get current hour (0-23)
   */
  getHour() {
    return Math.floor((this.timeMs % DAY_DURATION_MS) / MS_PER_HOUR);
  }

  /**
   * Get current day
   */
  getDay() {
    return this.day;
  }

  /**
   * Check if it's currently night
   */
  isNight() {
    const hour = this.getHour();
    return hour >= NIGHT_START || hour < NIGHT_END;
  }

  /**
   * Get the darkness level (0 = day, 1 = full night)
   */
  getDarkness() {
    const hour = this.getHour();
    const minute = ((this.timeMs % DAY_DURATION_MS) / MS_PER_HOUR - hour) * 60;
    const hourFloat = hour + minute / 60;

    // Full night: 21-4 (darkness = 0.4)
    if (hourFloat >= 21 || hourFloat < 4) return 0.4;

    // Dusk: 18-21 (ramp up)
    if (hourFloat >= DUSK_START && hourFloat < 21) {
      return 0.4 * ((hourFloat - DUSK_START) / (21 - DUSK_START));
    }

    // Dawn: 4-7 (ramp down)
    if (hourFloat >= 4 && hourFloat < DAWN_END) {
      return 0.4 * (1 - (hourFloat - 4) / (DAWN_END - 4));
    }

    return 0; // Daytime
  }

  /**
   * Get time string for display
   */
  getTimeString() {
    const hour = this.getHour();
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `Day ${this.day} - ${displayHour}${period}`;
  }

  update(delta) {
    this.timeMs += delta;

    const currentHour = this.getHour();

    // Check for new hour
    if (currentHour !== this.lastHour) {
      this.lastHour = currentHour;

      // Check for new day (midnight)
      if (currentHour === 0 && this.timeMs > DAY_DURATION_MS) {
        this.day++;
        this.scene.events.emit('dayChanged', this.day);
      }

      this.scene.events.emit('hourChanged', currentHour);
    }

    // Handle day wrap
    if (this.timeMs >= DAY_DURATION_MS * this.day) {
      // Don't reset timeMs, just track days
    }

    // Update night overlay
    if (this.nightOverlay) {
      this.nightOverlay.setAlpha(this.getDarkness());
    }
  }

  destroy() {
    if (this.nightOverlay) {
      this.nightOverlay.destroy();
    }
  }
}
