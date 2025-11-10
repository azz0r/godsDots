/**
 * Layer 6: Player Management System
 *
 * Manages multiple players (human + AI), their colors, territories, and stats.
 */

export const PLAYER_COLORS = {
  HUMAN: 0x4169E1,      // Royal Blue
  AI_1: 0xFF4500,       // Orange Red
  AI_2: 0x32CD32,       // Lime Green
  AI_3: 0x9370DB,       // Medium Purple
};

export default class PlayerSystem {
  /**
   * Create a new player system
   * @param {Phaser.Scene} scene - The Phaser scene
   */
  constructor(scene) {
    this.scene = scene;
    this.players = [];
    this.nextPlayerId = 1;

    // Quick lookup
    this.humanPlayer = null;
    this.aiPlayers = [];

    console.log('[PlayerSystem] Initialized');
  }

  /**
   * Create a new player
   * @param {Object} config - Player configuration
   * @returns {Object} Player entity
   */
  createPlayer(config) {
    const player = {
      id: config.id || `player_${this.nextPlayerId++}`,
      type: config.type || 'human', // 'human' | 'ai'
      name: config.name || 'Player',
      color: config.color || PLAYER_COLORS.HUMAN,

      // Position (temple location)
      spawnPosition: config.spawnPosition || { x: 0, y: 0 },

      // Stats
      beliefPoints: config.beliefPoints || 100,
      population: 0,
      devotedVillagers: [],
      influencedVillagers: [],

      // Buildings
      temples: [],
      buildings: [],

      // Game state
      isActive: true,
      isEliminated: false
    };

    this.players.push(player);

    if (player.type === 'human') {
      this.humanPlayer = player;
    } else {
      this.aiPlayers.push(player);
    }

    console.log(`[PlayerSystem] Created ${player.type} player: ${player.name} (${player.id})`);

    return player;
  }

  /**
   * Get player by ID
   * @param {string} playerId - Player ID
   * @returns {Object|null} Player entity
   */
  getPlayer(playerId) {
    return this.players.find(p => p.id === playerId) || null;
  }

  /**
   * Get human player
   * @returns {Object|null} Human player
   */
  getHumanPlayer() {
    return this.humanPlayer;
  }

  /**
   * Get all AI players
   * @returns {Array} AI players
   */
  getAIPlayers() {
    return this.aiPlayers;
  }

  /**
   * Get all active players
   * @returns {Array} Active players
   */
  getActivePlayers() {
    return this.players.filter(p => p.isActive && !p.isEliminated);
  }

  /**
   * Add temple to player
   * @param {string} playerId - Player ID
   * @param {Object} temple - Temple entity
   */
  addTemple(playerId, temple) {
    const player = this.getPlayer(playerId);
    if (player) {
      player.temples.push(temple);
      console.log(`[PlayerSystem] Added temple to player ${playerId}`);
    }
  }

  /**
   * Add villager to player
   * @param {string} playerId - Player ID
   * @param {Object} villager - Villager entity
   */
  addVillager(playerId, villager) {
    const player = this.getPlayer(playerId);
    if (player) {
      villager.playerId = playerId;
      villager.playerColor = player.color;
      player.population++;
      player.devotedVillagers.push(villager.id);
      console.log(`[PlayerSystem] Added villager ${villager.id} to player ${playerId} (pop: ${player.population})`);
    }
  }

  /**
   * Remove villager from player (death, conversion, etc.)
   * @param {string} playerId - Player ID
   * @param {string} villagerId - Villager ID
   */
  removeVillager(playerId, villagerId) {
    const player = this.getPlayer(playerId);
    if (player) {
      player.population = Math.max(0, player.population - 1);
      player.devotedVillagers = player.devotedVillagers.filter(id => id !== villagerId);
      console.log(`[PlayerSystem] Removed villager ${villagerId} from player ${playerId} (pop: ${player.population})`);
    }
  }

  /**
   * Add belief points to player
   * @param {string} playerId - Player ID
   * @param {number} amount - Amount to add
   */
  addBeliefPoints(playerId, amount) {
    const player = this.getPlayer(playerId);
    if (player) {
      player.beliefPoints += amount;
      console.log(`[PlayerSystem] Player ${playerId} gained ${amount} BP (total: ${player.beliefPoints})`);
    }
  }

  /**
   * Check if player has enough belief points
   * @param {string} playerId - Player ID
   * @param {number} cost - Cost to check
   * @returns {boolean} True if player can afford
   */
  canAfford(playerId, cost) {
    const player = this.getPlayer(playerId);
    return player && player.beliefPoints >= cost;
  }

  /**
   * Spend belief points
   * @param {string} playerId - Player ID
   * @param {number} cost - Cost to spend
   * @returns {boolean} True if spent successfully
   */
  spendBeliefPoints(playerId, cost) {
    const player = this.getPlayer(playerId);
    if (player && player.beliefPoints >= cost) {
      player.beliefPoints -= cost;
      console.log(`[PlayerSystem] Player ${playerId} spent ${cost} BP (remaining: ${player.beliefPoints})`);
      return true;
    }
    return false;
  }

  /**
   * Eliminate player from game
   * @param {string} playerId - Player ID
   */
  eliminatePlayer(playerId) {
    const player = this.getPlayer(playerId);
    if (player) {
      player.isEliminated = true;
      player.isActive = false;
      console.log(`[PlayerSystem] Player ${playerId} eliminated from game`);

      this.scene.events.emit('player_eliminated', { playerId, player });
    }
  }

  /**
   * Check win/lose conditions
   * @returns {Object|null} {winner, reason} or null if game continues
   */
  checkGameEnd() {
    const activePlayers = this.getActivePlayers();

    // No players left (draw)
    if (activePlayers.length === 0) {
      return { winner: null, reason: 'draw' };
    }

    // Only one player left (winner)
    if (activePlayers.length === 1) {
      return {
        winner: activePlayers[0],
        reason: 'elimination'
      };
    }

    // Check population dominance (optional)
    const humanPlayer = this.getHumanPlayer();
    if (humanPlayer && humanPlayer.population === 0 && humanPlayer.temples.length === 0) {
      // Human has no villagers or temples - eliminated
      this.eliminatePlayer(humanPlayer.id);
      return this.checkGameEnd(); // Recheck
    }

    return null; // Game continues
  }

  /**
   * Get game stats for UI
   * @returns {Object} Stats for all players
   */
  getGameStats() {
    return {
      players: this.players.map(p => ({
        id: p.id,
        type: p.type,
        name: p.name,
        color: p.color,
        beliefPoints: p.beliefPoints,
        population: p.population,
        temples: p.temples.length,
        isActive: p.isActive,
        isEliminated: p.isEliminated
      })),
      humanPlayer: this.humanPlayer ? {
        id: this.humanPlayer.id,
        beliefPoints: this.humanPlayer.beliefPoints,
        population: this.humanPlayer.population
      } : null
    };
  }

  /**
   * Update system (called every frame)
   * @param {number} time - Current game time
   * @param {number} delta - Time since last update
   */
  update(time, delta) {
    // Check for game end conditions
    const gameEnd = this.checkGameEnd();
    if (gameEnd) {
      this.scene.events.emit('game_end', gameEnd);
    }
  }

  /**
   * Clean up
   */
  destroy() {
    this.players = [];
    this.humanPlayer = null;
    this.aiPlayers = [];
    console.log('[PlayerSystem] Destroyed');
  }
}
