/**
 * Story 2: Main Menu Scene Tests
 *
 * Tests for the main menu start screen with:
 * - New Game button
 * - Continue button
 * - Settings button
 * - Credits button
 */

import Phaser from 'phaser';
import MainMenuScene from '../scenes/MainMenuScene';
import { createGameConfig } from '../config/gameConfig';

describe('Story 2: MainMenuScene', () => {
  let game;
  let scene;

  beforeEach(() => {
    // Create minimal game instance
    const config = {
      type: Phaser.HEADLESS,
      width: 1920,
      height: 1080,
      scene: [MainMenuScene],
      callbacks: {
        postBoot: (game) => {
          // Scene will be available after boot
        }
      }
    };

    game = new Phaser.Game(config);
    scene = game.scene.getScene('MainMenuScene');

    // Wait for scene to be ready
    if (!scene) {
      scene = new MainMenuScene();
      scene.sys = {
        game,
        settings: { key: 'MainMenuScene' },
        canvas: document.createElement('canvas')
      };
    }
  });

  afterEach(() => {
    if (game) {
      game.destroy(true);
    }
  });

  describe('Scene Configuration', () => {
    test('should have correct scene key', () => {
      expect(scene.sys.settings.key).toBe('MainMenuScene');
    });

    test('should be first scene in game config', () => {
      const config = createGameConfig();
      expect(config.scene[0].name).toBe('MainMenuScene');
    });
  });

  describe('Menu Functions', () => {
    test('should handle new game button click', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Mock scene.start
      scene.scene = {
        start: jest.fn()
      };

      scene.cameras = {
        main: {
          fadeOut: jest.fn(),
          once: jest.fn((event, callback) => {
            // Immediately trigger callback for testing
            callback();
          })
        }
      };

      scene.startNewGame();

      expect(consoleSpy).toHaveBeenCalledWith('[MainMenuScene] Starting new game...');
      expect(scene.scene.start).toHaveBeenCalledWith('MainScene');

      consoleSpy.mockRestore();
    });

    test('should handle continue button click', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      scene.scene = {
        start: jest.fn()
      };

      scene.continueGame();

      expect(consoleSpy).toHaveBeenCalledWith('[MainMenuScene] Continuing saved game...');
      expect(scene.scene.start).toHaveBeenCalledWith('MainScene');

      consoleSpy.mockRestore();
    });

    test('should handle settings button click', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      scene.scene = { start: jest.fn() };
      scene.openSettings();

      expect(consoleSpy).toHaveBeenCalledWith('[MainMenuScene] Opening settings...');
      expect(scene.scene.start).toHaveBeenCalledWith('SettingsScene');

      consoleSpy.mockRestore();
    });

    test('should handle credits button click', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      scene.showPlaceholderDialog = jest.fn();
      scene.showCredits();

      expect(consoleSpy).toHaveBeenCalledWith('[MainMenuScene] Showing credits...');
      expect(scene.showPlaceholderDialog).toHaveBeenCalledWith(
        'Credits',
        expect.stringContaining('GOD DOTS')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Saved Game Detection', () => {
    test('should return false if no saved game exists', () => {
      localStorage.clear();
      const result = scene.checkForSavedGame();
      expect(result).toBe(false);
    });

    test('should return true if saved game exists', () => {
      localStorage.setItem('godDotsSave', JSON.stringify({ test: true }));
      const result = scene.checkForSavedGame();
      expect(result).toBe(true);
      localStorage.clear();
    });

    test('should handle localStorage errors gracefully', () => {
      // Mock localStorage to throw error
      const originalGetItem = Storage.prototype.getItem;
      Storage.prototype.getItem = jest.fn(() => {
        throw new Error('localStorage disabled');
      });

      const result = scene.checkForSavedGame();
      expect(result).toBe(false);

      Storage.prototype.getItem = originalGetItem;
    });
  });

  describe('Button Handler', () => {
    test('should route to correct handler based on key', () => {
      scene.startNewGame = jest.fn();
      scene.continueGame = jest.fn();
      scene.openSettings = jest.fn();
      scene.showCredits = jest.fn();

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      scene.handleButtonClick('newGame');
      expect(scene.startNewGame).toHaveBeenCalled();

      scene.handleButtonClick('continue');
      expect(scene.continueGame).toHaveBeenCalled();

      scene.handleButtonClick('settings');
      expect(scene.openSettings).toHaveBeenCalled();

      scene.handleButtonClick('credits');
      expect(scene.showCredits).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Scene Transition', () => {
    test('should fade out camera before transitioning', (done) => {
      scene.scene = {
        start: jest.fn()
      };

      let fadeCallback;
      scene.cameras = {
        main: {
          fadeOut: jest.fn((duration, r, g, b) => {
            expect(duration).toBe(500);
            expect(r).toBe(0);
            expect(g).toBe(0);
            expect(b).toBe(0);
          }),
          once: jest.fn((event, callback) => {
            expect(event).toBe('camerafadeoutcomplete');
            fadeCallback = callback;
          })
        }
      };

      scene.startNewGame();

      // Simulate fade complete
      if (fadeCallback) {
        fadeCallback();
        expect(scene.scene.start).toHaveBeenCalledWith('MainScene');
      }

      done();
    });
  });
});
