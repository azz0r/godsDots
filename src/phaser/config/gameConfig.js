/**
 * Layer 1: Phaser 3 Game Configuration
 *
 * Core game configuration for God Dots Phaser 3 migration.
 * Handles renderer setup, scene registration, and core game settings.
 */

import Phaser from 'phaser';
import MainScene from '../scenes/MainScene';

/**
 * Creates the base Phaser game configuration
 * @returns {Phaser.Types.Core.GameConfig} Phaser game configuration object
 */
export function createGameConfig() {
  return {
    type: Phaser.AUTO, // Automatically choose WebGL or Canvas
    width: 1920,
    height: 1080,
    parent: 'game-container',
    backgroundColor: '#1a1a2e',
    scene: [MainScene],
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: 0 }, // Top-down game, no gravity
        debug: false
      }
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    render: {
      pixelArt: false,
      antialias: true,
      roundPixels: false
    },
    fps: {
      target: 60,
      forceSetTimeOut: false
    },
    dom: {
      createContainer: false
    }
  };
}

/**
 * Game constants
 */
export const GAME_CONFIG = {
  WORLD_WIDTH: 4000,
  WORLD_HEIGHT: 4000,
  VIEWPORT_WIDTH: 1920,
  VIEWPORT_HEIGHT: 1080,
  MIN_ZOOM: 0.5,
  MAX_ZOOM: 4,
  DEFAULT_ZOOM: 1
};
