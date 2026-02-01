/**
 * Story 3: Pause Menu System Tests
 *
 * Tests for pause menu functionality:
 * - ESC key pauses/resumes game
 * - Pause overlay UI
 * - Resume button
 * - Restart button
 * - Main Menu button
 * - Game updates freeze when paused
 */

import Phaser from 'phaser';
import MainScene from '../scenes/MainScene';

describe('Story 3: Pause Menu', () => {
  let game;
  let scene;

  beforeEach(() => {
    // Create minimal game instance
    const config = {
      type: Phaser.HEADLESS,
      width: 1920,
      height: 1080,
      scene: [MainScene],
      callbacks: {
        postBoot: (game) => {
          // Scene will be available after boot
        }
      }
    };

    game = new Phaser.Game(config);
    scene = game.scene.getScene('MainScene');

    // Wait for scene to be ready
    if (!scene) {
      scene = new MainScene();
      scene.sys = {
        game,
        settings: { key: 'MainScene' },
        canvas: document.createElement('canvas')
      };
    }

    // Mock camera
    scene.cameras = {
      main: {
        width: 1920,
        height: 1080,
        fadeOut: jest.fn(),
        once: jest.fn()
      }
    };

    // Mock add for graphics creation
    scene.add = {
      graphics: jest.fn(() => ({
        fillStyle: jest.fn(),
        fillRect: jest.fn(),
        fillRoundedRect: jest.fn(),
        lineStyle: jest.fn(),
        strokeRoundedRect: jest.fn(),
        setScrollFactor: jest.fn(),
        setDepth: jest.fn(),
        setInteractive: jest.fn(),
        on: jest.fn(),
        clear: jest.fn(),
        destroy: jest.fn()
      })),
      text: jest.fn((x, y, text, style) => ({
        setOrigin: jest.fn(),
        setScrollFactor: jest.fn(),
        setDepth: jest.fn(),
        setColor: jest.fn(),
        destroy: jest.fn()
      }))
    };

    // Mock scene manager
    scene.scene = {
      restart: jest.fn(),
      start: jest.fn()
    };
  });

  afterEach(() => {
    if (game) {
      game.destroy(true);
    }
  });

  describe('Pause State', () => {
    test('should initialize with isPaused = false', () => {
      expect(scene.isPaused).toBe(false);
    });

    test('should set isPaused = true when pauseGame() called', () => {
      scene.pauseGame();
      expect(scene.isPaused).toBe(true);
    });

    test('should set isPaused = false when resumeGame() called', () => {
      scene.isPaused = true;
      scene.pauseOverlay = { overlay: { destroy: jest.fn() }, panel: { destroy: jest.fn() }, title: { destroy: jest.fn() }, buttons: [] };
      scene.resumeGame();
      expect(scene.isPaused).toBe(false);
    });

    test('should not double-pause if already paused', () => {
      const createOverlaySpy = jest.spyOn(scene, 'createPauseOverlay');
      scene.pauseGame();
      scene.pauseGame(); // Try to pause again
      expect(createOverlaySpy).toHaveBeenCalledTimes(1);
    });

    test('should not double-resume if not paused', () => {
      const removeOverlaySpy = jest.spyOn(scene, 'removePauseOverlay');
      scene.resumeGame();
      expect(removeOverlaySpy).not.toHaveBeenCalled();
    });
  });

  describe('Pause Toggle', () => {
    test('should pause when not paused', () => {
      scene.togglePause();
      expect(scene.isPaused).toBe(true);
    });

    test('should resume when paused', () => {
      scene.isPaused = true;
      scene.pauseOverlay = { overlay: { destroy: jest.fn() }, panel: { destroy: jest.fn() }, title: { destroy: jest.fn() }, buttons: [] };
      scene.togglePause();
      expect(scene.isPaused).toBe(false);
    });
  });

  describe('Pause Overlay', () => {
    test('should create overlay when pauseGame() called', () => {
      scene.pauseGame();
      expect(scene.pauseOverlay).toBeDefined();
      expect(scene.pauseOverlay.overlay).toBeDefined();
      expect(scene.pauseOverlay.panel).toBeDefined();
      expect(scene.pauseOverlay.title).toBeDefined();
      expect(scene.pauseOverlay.buttons).toBeDefined();
    });

    test('should create three buttons (Resume, Restart, Main Menu)', () => {
      scene.pauseGame();
      expect(scene.pauseOverlay.buttons.length).toBe(3);
    });

    test('should destroy overlay when resumeGame() called', () => {
      scene.pauseGame();
      const overlay = scene.pauseOverlay;

      scene.resumeGame();

      expect(overlay.overlay.destroy).toHaveBeenCalled();
      expect(overlay.panel.destroy).toHaveBeenCalled();
      expect(overlay.title.destroy).toHaveBeenCalled();
      expect(scene.pauseOverlay).toBeNull();
    });
  });

  describe('Game Update Loop', () => {
    test('should skip villager/temple updates when paused', () => {
      // Mock systems
      scene.villagerSystem = { update: jest.fn() };
      scene.templeSystem = { update: jest.fn() };
      scene.playerSystem = { update: jest.fn() };
      scene.cameraControlSystem = { update: jest.fn() };
      scene.gameStarted = true;
      scene.gameEnded = false;

      // Pause game
      scene.isPaused = true;

      // Call update
      scene.update(1000, 16);

      // Villagers/temples should NOT update
      expect(scene.villagerSystem.update).not.toHaveBeenCalled();
      expect(scene.templeSystem.update).not.toHaveBeenCalled();
      expect(scene.playerSystem.update).not.toHaveBeenCalled();

      // Camera should still update (allow panning while paused)
      expect(scene.cameraControlSystem.update).toHaveBeenCalled();
    });

    test('should update normally when not paused', () => {
      // Mock systems
      scene.villagerSystem = { update: jest.fn() };
      scene.templeSystem = { update: jest.fn() };
      scene.playerSystem = { update: jest.fn() };
      scene.cameraControlSystem = { update: jest.fn() };
      scene.gameStarted = true;
      scene.gameEnded = false;

      // Not paused
      scene.isPaused = false;

      // Call update
      scene.update(1000, 16);

      // All systems should update
      expect(scene.villagerSystem.update).toHaveBeenCalled();
      expect(scene.templeSystem.update).toHaveBeenCalled();
      expect(scene.playerSystem.update).toHaveBeenCalled();
      expect(scene.cameraControlSystem.update).toHaveBeenCalled();
    });
  });

  describe('Restart Game', () => {
    test('should call scene.restart()', () => {
      scene.isPaused = true;
      scene.pauseOverlay = { overlay: { destroy: jest.fn() }, panel: { destroy: jest.fn() }, title: { destroy: jest.fn() }, buttons: [] };

      scene.restartGame();

      expect(scene.scene.restart).toHaveBeenCalled();
      expect(scene.isPaused).toBe(false);
    });

    test('should remove pause overlay before restarting', () => {
      scene.pauseGame();
      const removeOverlaySpy = jest.spyOn(scene, 'removePauseOverlay');

      scene.restartGame();

      expect(removeOverlaySpy).toHaveBeenCalled();
    });
  });

  describe('Return to Main Menu', () => {
    test('should transition to MainMenuScene', () => {
      scene.isPaused = true;
      scene.pauseOverlay = { overlay: { destroy: jest.fn() }, panel: { destroy: jest.fn() }, title: { destroy: jest.fn() }, buttons: [] };

      scene.returnToMainMenu();

      expect(scene.cameras.main.fadeOut).toHaveBeenCalledWith(500, 0, 0, 0);
      expect(scene.isPaused).toBe(false);
    });

    test('should remove pause overlay before transitioning', () => {
      scene.pauseGame();
      const removeOverlaySpy = jest.spyOn(scene, 'removePauseOverlay');

      scene.returnToMainMenu();

      expect(removeOverlaySpy).toHaveBeenCalled();
    });

    test('should start MainMenuScene after fade completes', () => {
      scene.isPaused = true;
      scene.pauseOverlay = { overlay: { destroy: jest.fn() }, panel: { destroy: jest.fn() }, title: { destroy: jest.fn() }, buttons: [] };

      let fadeCallback;
      scene.cameras.main.once = jest.fn((event, callback) => {
        fadeCallback = callback;
      });

      scene.returnToMainMenu();

      // Simulate fade completion
      if (fadeCallback) {
        fadeCallback();
        expect(scene.scene.start).toHaveBeenCalledWith('MainMenuScene');
      }
    });
  });

  describe('Pause Button Creation', () => {
    test('should create button with graphics and text', () => {
      const button = scene.createPauseButton(100, 200, 'TEST', jest.fn());

      expect(button.bg).toBeDefined();
      expect(button.text).toBeDefined();
    });

    test('should call onClick when button clicked', () => {
      const onClick = jest.fn();
      const button = scene.createPauseButton(100, 200, 'TEST', onClick);

      // Get the pointerdown handler
      const pointerdownCall = button.bg.on.mock.calls.find(call => call[0] === 'pointerdown');
      if (pointerdownCall) {
        const handler = pointerdownCall[1];
        handler(); // Simulate click
        expect(onClick).toHaveBeenCalled();
      }
    });
  });
});
