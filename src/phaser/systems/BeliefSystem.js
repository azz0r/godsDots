/**
 * Layer 6: Belief System
 *
 * Manages villager belief in players/gods, including:
 * - Belief generation from worship
 * - Miracle witness impressiveness
 * - Belief decay over time
 * - Proximity-based temple influence
 * - Conversion tracking
 */

import { TERRAIN_CONFIG } from '../config/terrainConfig';

// Belief generation constants
const BELIEF_CONSTANTS = {
  // Worship generation
  BASE_WORSHIP_RATE: 5,           // BP/min at temple
  TEMPLE_LEVEL_MULTIPLIER: 0.2,   // +20% per temple level
  DEVOTION_SCALING: 1.0,           // Scales with belief strength (0-100)

  // Miracle witness bonuses
  MIRACLE_BASE_BELIEF: 15,         // Base belief gain from witnessing miracle
  MIRACLE_DISTANCE_DECAY: 0.5,    // How quickly effect diminishes with distance
  POSITIVE_MIRACLE_BONUS: 1.5,    // Multiplier for helpful miracles
  DESTRUCTIVE_MIRACLE_PENALTY: 0.3, // Penalty for harmful miracles

  // Building proximity influence
  TEMPLE_RADIUS: 100,              // Tiles of passive influence
  TEMPLE_PASSIVE_RATE: 1,          // BP/min for living near temple
  WORKING_TEMPLE_RATE: 3,          // BP/min for working at temple

  // Belief decay
  NEGLECT_DECAY_RATE: 0.5,         // BP/min lost when ignored
  STARVATION_DECAY_RATE: 5,        // BP/min lost when starving/unhappy
  RIVAL_WITNESS_PENALTY: 10,       // Belief lost when seeing rival miracle

  // Conversion thresholds
  INFLUENCED_THRESHOLD: 20,        // 20% = influenced
  DEVOTED_THRESHOLD: 80,           // 80% = devoted
  CONVERSION_RESISTANCE_BASE: 10,  // Base resistance after failed conversion
};

export default class BeliefSystem {
  /**
   * Create a new belief system
   * @param {Object} scene - The Phaser scene
   * @param {Object} db - Database service
   */
  constructor(scene, db) {
    this.scene = scene;
    this.db = db;

    // Cache for belief data (avoid frequent DB queries)
    this.beliefCache = new Map(); // villagerId -> {[playerId]: beliefData}
    this.lastUpdateTime = 0;
    this.updateInterval = 1000; // Update every 1 second

    console.log('[BeliefSystem] Initialized');
  }

  /**
   * Update belief generation and decay
   * @param {number} time - Current game time in milliseconds
   * @param {number} delta - Time since last update in milliseconds
   */
  update(time, delta) {
    // Only update once per second to avoid too frequent DB writes
    if (time - this.lastUpdateTime < this.updateInterval) {
      return;
    }

    this.lastUpdateTime = time;

    // Update belief generation from all sources
    this.updateBeliefGeneration(delta);
  }

  /**
   * Calculate belief generation from worship at a temple
   * @param {Object} villager - Villager entity
   * @param {Object} temple - Temple building
   * @param {string} playerId - Player ID
   * @returns {number} Belief points generated per minute
   */
  calculateWorshipGeneration(villager, temple, playerId) {
    if (!villager || !temple || !playerId) {
      return 0;
    }

    // Get villager's current belief strength in this player
    const beliefStrength = this.getBeliefStrength(villager.id, playerId);

    // Base rate modified by devotion and temple level
    const devotionFactor = beliefStrength / 100;
    const templeFactor = 1 + (temple.level * BELIEF_CONSTANTS.TEMPLE_LEVEL_MULTIPLIER);

    const generation = BELIEF_CONSTANTS.BASE_WORSHIP_RATE * devotionFactor * templeFactor;

    return generation;
  }

  /**
   * Process a villager witnessing a miracle
   * @param {Object} villager - Villager entity
   * @param {Object} miracle - Miracle cast
   * @param {string} casterPlayerId - Player who cast the miracle
   * @returns {number} Belief change (positive or negative)
   */
  processWitnessEvent(villager, miracle, casterPlayerId) {
    if (!villager || !miracle || !casterPlayerId) {
      return 0;
    }

    // Calculate distance from villager to miracle
    const distance = this.calculateDistance(villager.position, miracle.position);
    const miracleRadius = miracle.power * 50; // Miracle influence radius

    if (distance > miracleRadius) {
      return 0; // Too far away to witness
    }

    // Distance decay factor (closer = more impressive)
    const distanceFactor = 1 - (distance / miracleRadius) * BELIEF_CONSTANTS.MIRACLE_DISTANCE_DECAY;

    // Miracle type modifier (helpful vs harmful)
    const miracleModifier = this.getMiracleBeliefModifier(miracle.type);

    // Calculate base belief change
    let beliefChange = BELIEF_CONSTANTS.MIRACLE_BASE_BELIEF * distanceFactor * miracleModifier;

    // Scale by miracle power
    beliefChange *= miracle.power;

    // Update belief in database
    this.addBelief(villager.id, casterPlayerId, beliefChange, {
      method: 'miracle',
      miracleType: miracle.type,
      distance,
      power: miracle.power
    });

    // Log impression event
    this.logImpressionEvent(villager.id, casterPlayerId, {
      type: 'miracle',
      miracleType: miracle.type,
      magnitude: beliefChange,
      timestamp: new Date()
    });

    console.log(`[BeliefSystem] Villager ${villager.id} witnessed ${miracle.type} by player ${casterPlayerId}: ${beliefChange.toFixed(1)} belief`);

    return beliefChange;
  }

  /**
   * Get miracle belief modifier based on type
   * @param {string} miracleType - Type of miracle
   * @returns {number} Modifier (positive for helpful, negative for harmful)
   */
  getMiracleBeliefModifier(miracleType) {
    const helpfulMiracles = ['heal', 'food', 'growth', 'shield', 'blessing', 'fertility'];
    const harmfulMiracles = ['lightning', 'storm', 'curse', 'plague'];

    if (helpfulMiracles.includes(miracleType)) {
      return BELIEF_CONSTANTS.POSITIVE_MIRACLE_BONUS;
    } else if (harmfulMiracles.includes(miracleType)) {
      return BELIEF_CONSTANTS.DESTRUCTIVE_MIRACLE_PENALTY;
    }

    return 1.0; // Neutral miracles
  }

  /**
   * Calculate proximity-based belief generation (living/working near temples)
   * @param {Object} villager - Villager entity
   * @param {Array} temples - Array of temple buildings
   * @param {string} playerId - Player ID
   * @returns {number} Belief points generated per minute
   */
  calculateProximityInfluence(villager, temples, playerId) {
    if (!villager || !temples || temples.length === 0) {
      return 0;
    }

    let totalInfluence = 0;

    for (const temple of temples) {
      // Skip temples not owned by this player
      if (temple.playerId !== playerId) {
        continue;
      }

      const distance = this.calculateDistance(villager.position, temple.position);

      // Check if villager is working at this temple
      if (villager.workplaceId === temple.id) {
        totalInfluence += BELIEF_CONSTANTS.WORKING_TEMPLE_RATE;
        continue;
      }

      // Check proximity influence
      if (distance <= BELIEF_CONSTANTS.TEMPLE_RADIUS) {
        const proximityFactor = 1 - (distance / BELIEF_CONSTANTS.TEMPLE_RADIUS);
        totalInfluence += BELIEF_CONSTANTS.TEMPLE_PASSIVE_RATE * proximityFactor;
      }
    }

    return totalInfluence;
  }

  /**
   * Apply belief decay for neglected villagers
   * @param {Object} villager - Villager entity
   * @param {string} playerId - Player ID
   * @param {number} deltaMinutes - Time elapsed in minutes
   */
  applyBeliefDecay(villager, playerId, deltaMinutes) {
    if (!villager || !playerId) {
      return;
    }

    let decayRate = 0;

    // Check villager condition
    if (villager.health < 30 || villager.happiness < 30) {
      // Starving or unhappy villagers lose faith quickly
      decayRate = BELIEF_CONSTANTS.STARVATION_DECAY_RATE;
    } else {
      // Normal neglect decay
      decayRate = BELIEF_CONSTANTS.NEGLECT_DECAY_RATE;
    }

    const decayAmount = decayRate * deltaMinutes;

    if (decayAmount > 0) {
      this.addBelief(villager.id, playerId, -decayAmount, {
        method: 'decay',
        reason: villager.health < 30 ? 'starvation' : 'neglect'
      });
    }
  }

  /**
   * Get villager's belief strength in a specific player
   * @param {string} villagerId - Villager ID
   * @param {string} playerId - Player ID
   * @returns {number} Belief strength (0-100)
   */
  getBeliefStrength(villagerId, playerId) {
    // Check cache first
    const cached = this.beliefCache.get(villagerId);
    if (cached && cached[playerId]) {
      return cached[playerId].strength;
    }

    // Default to 0 if not found
    return 0;
  }

  /**
   * Add (or subtract) belief for a villager toward a player
   * @param {string} villagerId - Villager ID
   * @param {string} playerId - Player ID
   * @param {number} amount - Amount to add (negative to subtract)
   * @param {Object} context - Context about how belief was gained/lost
   */
  async addBelief(villagerId, playerId, amount, context = {}) {
    if (!this.db) {
      // No database in test mode
      return;
    }

    try {
      // Get or create belief record
      let belief = await this.db.VillagerBelief
        .where('[villagerId+playerId]')
        .equals([villagerId, playerId])
        .first();

      if (!belief) {
        // Create new belief record
        belief = {
          villagerId,
          playerId,
          strength: 0,
          lastInteraction: new Date(),
          conversionProgress: 0,
          impressionEvents: [],
          lastUpdated: new Date(),
          resistanceModifier: 0
        };

        await this.db.VillagerBelief.add(belief);
      }

      // Update belief strength (clamped to 0-100)
      const newStrength = Math.max(0, Math.min(100, belief.strength + amount));
      const changed = newStrength !== belief.strength;

      if (changed) {
        await this.db.VillagerBelief
          .where('[villagerId+playerId]')
          .equals([villagerId, playerId])
          .modify({
            strength: newStrength,
            lastInteraction: new Date(),
            lastUpdated: new Date()
          });

        // Update cache
        this.updateCache(villagerId, playerId, newStrength);

        // Check for conversion threshold
        this.checkConversionThreshold(villagerId, playerId, newStrength, belief.strength);
      }
    } catch (error) {
      console.error('[BeliefSystem] Error adding belief:', error);
    }
  }

  /**
   * Log an impression event (miracle witnessed, etc.)
   * @param {string} villagerId - Villager ID
   * @param {string} playerId - Player ID
   * @param {Object} event - Event data
   */
  async logImpressionEvent(villagerId, playerId, event) {
    if (!this.db) return;

    try {
      await this.db.VillagerBelief
        .where('[villagerId+playerId]')
        .equals([villagerId, playerId])
        .modify(belief => {
          if (!belief.impressionEvents) {
            belief.impressionEvents = [];
          }
          belief.impressionEvents.push(event);

          // Keep only last 10 events to avoid bloat
          if (belief.impressionEvents.length > 10) {
            belief.impressionEvents = belief.impressionEvents.slice(-10);
          }
        });
    } catch (error) {
      console.error('[BeliefSystem] Error logging impression:', error);
    }
  }

  /**
   * Check if villager has crossed a conversion threshold
   * @param {string} villagerId - Villager ID
   * @param {string} playerId - Player ID
   * @param {number} newStrength - New belief strength
   * @param {number} oldStrength - Previous belief strength
   */
  checkConversionThreshold(villagerId, playerId, newStrength, oldStrength) {
    // Influenced threshold (20%)
    if (oldStrength < BELIEF_CONSTANTS.INFLUENCED_THRESHOLD &&
        newStrength >= BELIEF_CONSTANTS.INFLUENCED_THRESHOLD) {
      console.log(`[BeliefSystem] Villager ${villagerId} now INFLUENCED by player ${playerId}`);
      this.scene?.events.emit('villager_influenced', { villagerId, playerId, strength: newStrength });
    }

    // Devoted threshold (80%)
    if (oldStrength < BELIEF_CONSTANTS.DEVOTED_THRESHOLD &&
        newStrength >= BELIEF_CONSTANTS.DEVOTED_THRESHOLD) {
      console.log(`[BeliefSystem] Villager ${villagerId} now DEVOTED to player ${playerId}`);
      this.scene?.events.emit('villager_converted', { villagerId, playerId, strength: newStrength });

      // Log conversion event
      this.logConversion(villagerId, null, playerId, 'belief_threshold', oldStrength, newStrength);
    }
  }

  /**
   * Log a conversion event to database
   * @param {string} villagerId - Villager ID
   * @param {string} fromPlayerId - Previous owner (null if free)
   * @param {string} toPlayerId - New owner
   * @param {string} method - How conversion happened
   * @param {number} beliefBefore - Belief before conversion
   * @param {number} beliefAfter - Belief after conversion
   */
  async logConversion(villagerId, fromPlayerId, toPlayerId, method, beliefBefore, beliefAfter) {
    if (!this.db) return;

    try {
      await this.db.ConversionEvent.add({
        villagerId,
        fromPlayerId,
        toPlayerId,
        method,
        beliefBefore,
        beliefAfter,
        timestamp: new Date(),
        context: {}
      });
    } catch (error) {
      console.error('[BeliefSystem] Error logging conversion:', error);
    }
  }

  /**
   * Update belief generation for all villagers (called once per second)
   * @param {number} delta - Time since last update in milliseconds
   */
  async updateBeliefGeneration(delta) {
    // This will be implemented when we integrate with VillagerSystem
    // For now, it's a placeholder
  }

  /**
   * Calculate distance between two positions
   * @param {Object} pos1 - {x, y}
   * @param {Object} pos2 - {x, y}
   * @returns {number} Distance in tiles
   */
  calculateDistance(pos1, pos2) {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Update belief cache
   * @param {string} villagerId - Villager ID
   * @param {string} playerId - Player ID
   * @param {number} strength - Belief strength
   */
  updateCache(villagerId, playerId, strength) {
    if (!this.beliefCache.has(villagerId)) {
      this.beliefCache.set(villagerId, {});
    }

    this.beliefCache.get(villagerId)[playerId] = {
      strength,
      lastUpdated: Date.now()
    };
  }

  /**
   * Load belief data from database into cache
   * @param {string} villagerId - Villager ID
   */
  async loadBeliefData(villagerId) {
    if (!this.db) return;

    try {
      const beliefs = await this.db.VillagerBelief
        .where('villagerId')
        .equals(villagerId)
        .toArray();

      const beliefMap = {};
      beliefs.forEach(b => {
        beliefMap[b.playerId] = {
          strength: b.strength,
          lastUpdated: b.lastUpdated.getTime()
        };
      });

      this.beliefCache.set(villagerId, beliefMap);
    } catch (error) {
      console.error('[BeliefSystem] Error loading belief data:', error);
    }
  }

  /**
   * Get all villagers who believe in a specific player
   * @param {string} playerId - Player ID
   * @param {number} minStrength - Minimum belief strength (default 20 = influenced)
   * @returns {Promise<Array>} Array of belief records
   */
  async getBelieversByPlayer(playerId, minStrength = BELIEF_CONSTANTS.INFLUENCED_THRESHOLD) {
    if (!this.db) return [];

    try {
      return await this.db.VillagerBelief
        .where('playerId')
        .equals(playerId)
        .and(b => b.strength >= minStrength)
        .toArray();
    } catch (error) {
      console.error('[BeliefSystem] Error getting believers:', error);
      return [];
    }
  }

  /**
   * Get villager's dominant belief (highest strength)
   * @param {string} villagerId - Villager ID
   * @returns {Promise<Object>} {playerId, strength} or null
   */
  async getDominantBelief(villagerId) {
    if (!this.db) return null;

    try {
      const beliefs = await this.db.VillagerBelief
        .where('villagerId')
        .equals(villagerId)
        .toArray();

      if (beliefs.length === 0) {
        return null;
      }

      // Find highest strength
      const dominant = beliefs.reduce((max, b) =>
        b.strength > max.strength ? b : max
      , beliefs[0]);

      return {
        playerId: dominant.playerId,
        strength: dominant.strength
      };
    } catch (error) {
      console.error('[BeliefSystem] Error getting dominant belief:', error);
      return null;
    }
  }

  /**
   * Clean up and remove listeners
   */
  destroy() {
    this.beliefCache.clear();
    console.log('[BeliefSystem] Destroyed');
  }
}

export { BELIEF_CONSTANTS };
