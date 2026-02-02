/**
 * Particle Effects System
 *
 * Provides particle effects for key game events using Phaser 3 particles.
 * Creates a tiny circle texture at runtime (no asset files needed).
 *
 * Effects:
 * - Temple worship: golden sparkles rising
 * - Villager spawn: white poof
 * - Building placed: dust cloud
 * - Divine power cast: per-power colored burst
 */

import { TERRAIN_CONFIG } from '../config/terrainConfig';

const PARTICLE_TEXTURE_KEY = 'particle_dot';
const MAX_PARTICLES_PER_EMITTER = 20;

export default class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.textureCreated = false;

    this.createParticleTexture();
    this.registerEventListeners();
  }

  /**
   * Create a tiny white circle texture for particles
   */
  createParticleTexture() {
    if (!this.scene.make?.graphics || !this.scene.textures) return;

    // Check if texture already exists
    if (this.scene.textures.exists(PARTICLE_TEXTURE_KEY)) {
      this.textureCreated = true;
      return;
    }

    const g = this.scene.make.graphics({ add: false });
    g.fillStyle(0xFFFFFF, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture(PARTICLE_TEXTURE_KEY, 8, 8);
    g.destroy();

    this.textureCreated = true;
  }

  /**
   * Listen for game events to trigger particles
   */
  registerEventListeners() {
    if (!this.scene.events) return;

    this.scene.events.on('powerCast', (data) => {
      this.emitPowerCast(data.worldX, data.worldY, data.powerId);
    });
  }

  /**
   * Worship sparkles: golden particles rising from a position
   */
  emitWorship(worldX, worldY) {
    if (!this.textureCreated) return;

    this.scene.add.particles(worldX, worldY, PARTICLE_TEXTURE_KEY, {
      speed: { min: 10, max: 30 },
      angle: { min: 250, max: 290 },
      lifespan: 800,
      quantity: 1,
      frequency: 200,
      maxParticles: MAX_PARTICLES_PER_EMITTER,
      scale: { start: 0.4, end: 0 },
      alpha: { start: 0.8, end: 0 },
      tint: 0xFFD700,
      duration: 2000,
      depth: 110,
    });
  }

  /**
   * Spawn poof: white burst at spawn location
   */
  emitSpawn(worldX, worldY) {
    if (!this.textureCreated) return;

    this.scene.add.particles(worldX, worldY, PARTICLE_TEXTURE_KEY, {
      speed: { min: 20, max: 50 },
      lifespan: 400,
      quantity: 8,
      maxParticles: 8,
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.7, end: 0 },
      tint: 0xFFFFFF,
      depth: 110,
    });
  }

  /**
   * Building placed: brown dust cloud
   */
  emitBuildingPlaced(worldX, worldY) {
    if (!this.textureCreated) return;

    this.scene.add.particles(worldX, worldY, PARTICLE_TEXTURE_KEY, {
      speed: { min: 15, max: 40 },
      lifespan: 500,
      quantity: 10,
      maxParticles: 10,
      scale: { start: 0.6, end: 0.1 },
      alpha: { start: 0.5, end: 0 },
      tint: 0xC4A882,
      depth: 110,
    });
  }

  /**
   * Divine power cast: colored burst matching power type
   */
  emitPowerCast(worldX, worldY, powerId) {
    if (!this.textureCreated) return;

    const colorMap = {
      heal: 0x00FF00,
      storm: 0x6666FF,
      food: 0xFFD700,
    };
    const tint = colorMap[powerId] || 0xFFFFFF;

    this.scene.add.particles(worldX, worldY, PARTICLE_TEXTURE_KEY, {
      speed: { min: 30, max: 80 },
      lifespan: 600,
      quantity: 15,
      maxParticles: 15,
      scale: { start: 0.7, end: 0 },
      alpha: { start: 0.9, end: 0 },
      tint,
      depth: 210,
    });
  }

  /**
   * Villager death: red burst
   */
  emitDeath(worldX, worldY) {
    if (!this.textureCreated) return;

    this.scene.add.particles(worldX, worldY, PARTICLE_TEXTURE_KEY, {
      speed: { min: 20, max: 50 },
      lifespan: 500,
      quantity: 6,
      maxParticles: 6,
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.8, end: 0 },
      tint: 0xFF0000,
      depth: 110,
    });
  }

  destroy() {
    // Particle emitters auto-destroy when done
  }
}
