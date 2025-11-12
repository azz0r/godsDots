/**
 * Main Menu Scene
 *
 * Professional start screen with game options:
 * - New Game
 * - Continue (if save exists)
 * - Settings
 * - Credits
 */

import Phaser from 'phaser';
// RexUI will be integrated in future story for advanced dialog systems
// import RexUIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin.js';

export default class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  preload() {
    // Preload any assets needed for the menu
    // For now, we'll use programmatic graphics
  }

  create() {
    const { width, height } = this.cameras.main;

    // Background gradient
    this.createBackground(width, height);

    // Game title
    this.createTitle(width);

    // Menu buttons
    this.createMenuButtons(width, height);

    // Check for saved game
    this.hasSavedGame = this.checkForSavedGame();
  }

  createBackground(width, height) {
    // Create a dark gradient background
    const bg = this.add.graphics();

    // Top color: Dark blue
    // Bottom color: Nearly black
    const colors = [
      { stop: 0, color: 0x0a0a1e },
      { stop: 0.5, color: 0x1a1a2e },
      { stop: 1, color: 0x0a0a0a }
    ];

    // Draw gradient rectangles
    for (let i = 0; i < colors.length - 1; i++) {
      const startY = height * colors[i].stop;
      const endY = height * colors[i + 1].stop;
      const steps = 50;

      for (let j = 0; j < steps; j++) {
        const y = startY + ((endY - startY) * j / steps);
        const h = (endY - startY) / steps;
        const ratio = j / steps;
        const color = Phaser.Display.Color.Interpolate.ColorWithColor(
          Phaser.Display.Color.ValueToColor(colors[i].color),
          Phaser.Display.Color.ValueToColor(colors[i + 1].color),
          steps,
          j
        );

        bg.fillStyle(Phaser.Display.Color.GetColor(color.r, color.g, color.b));
        bg.fillRect(0, y, width, h);
      }
    }

    // Add some subtle stars
    this.createStars(width, height);
  }

  createStars(width, height) {
    const stars = this.add.graphics();
    stars.fillStyle(0xffffff, 0.6);

    // Create random stars
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = Math.random() * 2;
      stars.fillCircle(x, y, size);
    }
  }

  createTitle(width) {
    // Main title
    const title = this.add.text(width / 2, 200, 'GOD DOTS', {
      fontFamily: 'Georgia, serif',
      fontSize: '96px',
      fontStyle: 'bold',
      color: '#FFD700',
      stroke: '#000000',
      strokeThickness: 8,
      shadow: {
        offsetX: 4,
        offsetY: 4,
        color: '#000000',
        blur: 10,
        fill: true
      }
    });
    title.setOrigin(0.5);

    // Subtitle
    const subtitle = this.add.text(width / 2, 280, 'A Divine Strategy Game', {
      fontFamily: 'Georgia, serif',
      fontSize: '24px',
      color: '#CCCCCC',
      stroke: '#000000',
      strokeThickness: 4
    });
    subtitle.setOrigin(0.5);

    // Animate title entrance
    title.setAlpha(0);
    subtitle.setAlpha(0);

    this.tweens.add({
      targets: title,
      alpha: 1,
      duration: 1000,
      ease: 'Power2'
    });

    this.tweens.add({
      targets: subtitle,
      alpha: 1,
      duration: 1000,
      delay: 500,
      ease: 'Power2'
    });
  }

  createMenuButtons(width, height) {
    const centerX = width / 2;
    const startY = height / 2 + 50;
    const buttonSpacing = 80;

    // Button configuration
    const buttons = [
      { text: 'NEW GAME', key: 'newGame', y: startY },
      { text: 'CONTINUE', key: 'continue', y: startY + buttonSpacing, enabled: false }, // Will enable if save exists
      { text: 'SETTINGS', key: 'settings', y: startY + buttonSpacing * 2 },
      { text: 'CREDITS', key: 'credits', y: startY + buttonSpacing * 3 }
    ];

    buttons.forEach((config, index) => {
      this.createButton(centerX, config.y, config.text, config.key, config.enabled !== false, index);
    });
  }

  createButton(x, y, text, key, enabled = true, index = 0) {
    const buttonWidth = 300;
    const buttonHeight = 60;

    // Button background
    const bg = this.add.graphics();
    const color = enabled ? 0x2a2a4e : 0x1a1a1a;
    const hoverColor = enabled ? 0x3a3a6e : 0x1a1a1a;

    bg.fillStyle(color);
    bg.fillRoundedRect(x - buttonWidth / 2, y - buttonHeight / 2, buttonWidth, buttonHeight, 10);

    // Border
    bg.lineStyle(2, enabled ? 0x4a4a8e : 0x3a3a3a);
    bg.strokeRoundedRect(x - buttonWidth / 2, y - buttonHeight / 2, buttonWidth, buttonHeight, 10);

    // Button text
    const textObj = this.add.text(x, y, text, {
      fontFamily: 'Georgia, serif',
      fontSize: '28px',
      fontStyle: 'bold',
      color: enabled ? '#FFFFFF' : '#666666'
    });
    textObj.setOrigin(0.5);

    if (enabled) {
      // Make interactive
      const hitArea = new Phaser.Geom.Rectangle(
        x - buttonWidth / 2,
        y - buttonHeight / 2,
        buttonWidth,
        buttonHeight
      );

      bg.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
      textObj.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

      // Hover effects
      bg.on('pointerover', () => {
        bg.clear();
        bg.fillStyle(hoverColor);
        bg.fillRoundedRect(x - buttonWidth / 2, y - buttonHeight / 2, buttonWidth, buttonHeight, 10);
        bg.lineStyle(3, 0xFFD700);
        bg.strokeRoundedRect(x - buttonWidth / 2, y - buttonHeight / 2, buttonWidth, buttonHeight, 10);
        textObj.setColor('#FFD700');
        // TODO: Add hover sound effect when audio assets are available
        // this.sound.play('hover', { volume: 0.3 });
      });

      bg.on('pointerout', () => {
        bg.clear();
        bg.fillStyle(color);
        bg.fillRoundedRect(x - buttonWidth / 2, y - buttonHeight / 2, buttonWidth, buttonHeight, 10);
        bg.lineStyle(2, 0x4a4a8e);
        bg.strokeRoundedRect(x - buttonWidth / 2, y - buttonHeight / 2, buttonWidth, buttonHeight, 10);
        textObj.setColor('#FFFFFF');
      });

      bg.on('pointerdown', () => {
        this.handleButtonClick(key);
      });
    }

    // Animate entrance
    bg.setAlpha(0);
    textObj.setAlpha(0);

    this.tweens.add({
      targets: [bg, textObj],
      alpha: 1,
      duration: 500,
      delay: 1000 + (index * 100),
      ease: 'Power2'
    });

    return { bg, text: textObj };
  }

  handleButtonClick(key) {
    console.log(`[MainMenuScene] Button clicked: ${key}`);

    switch (key) {
      case 'newGame':
        this.startNewGame();
        break;
      case 'continue':
        this.continueGame();
        break;
      case 'settings':
        this.openSettings();
        break;
      case 'credits':
        this.showCredits();
        break;
    }
  }

  startNewGame() {
    console.log('[MainMenuScene] Starting new game...');

    // Fade out
    this.cameras.main.fadeOut(500, 0, 0, 0);

    this.cameras.main.once('camerafadeoutcomplete', () => {
      // Transition to game scene
      this.scene.start('MainScene');
    });
  }

  continueGame() {
    console.log('[MainMenuScene] Continuing saved game...');
    // TODO: Load saved game state
    this.scene.start('MainScene');
  }

  openSettings() {
    console.log('[MainMenuScene] Opening settings...');
    // TODO: Create settings panel with RexUI dialog
    this.showPlaceholderDialog('Settings', 'Settings panel coming soon!\n\nVolume controls\nGraphics quality\nKeybindings');
  }

  showCredits() {
    console.log('[MainMenuScene] Showing credits...');
    this.showPlaceholderDialog('Credits', 'GOD DOTS\n\nA game inspired by Black & White\n\nBuilt with Phaser 3\n\nDeveloped with Claude Code');
  }

  showPlaceholderDialog(title, content) {
    // Simple dialog overlay until we implement RexUI dialogs
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);

    const dialog = this.add.graphics();
    const dialogWidth = 600;
    const dialogHeight = 400;
    const dialogX = (this.cameras.main.width - dialogWidth) / 2;
    const dialogY = (this.cameras.main.height - dialogHeight) / 2;

    dialog.fillStyle(0x1a1a2e);
    dialog.fillRoundedRect(dialogX, dialogY, dialogWidth, dialogHeight, 15);
    dialog.lineStyle(3, 0x4a4a8e);
    dialog.strokeRoundedRect(dialogX, dialogY, dialogWidth, dialogHeight, 15);

    const titleText = this.add.text(
      this.cameras.main.width / 2,
      dialogY + 50,
      title,
      {
        fontFamily: 'Georgia, serif',
        fontSize: '36px',
        fontStyle: 'bold',
        color: '#FFD700'
      }
    );
    titleText.setOrigin(0.5);

    const contentText = this.add.text(
      this.cameras.main.width / 2,
      dialogY + 150,
      content,
      {
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
        color: '#FFFFFF',
        align: 'center'
      }
    );
    contentText.setOrigin(0.5);

    const closeButton = this.add.text(
      this.cameras.main.width / 2,
      dialogY + dialogHeight - 60,
      'CLOSE',
      {
        fontFamily: 'Georgia, serif',
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#FFFFFF',
        backgroundColor: '#2a2a4e',
        padding: { x: 30, y: 10 }
      }
    );
    closeButton.setOrigin(0.5);
    closeButton.setInteractive();

    closeButton.on('pointerover', () => {
      closeButton.setColor('#FFD700');
    });

    closeButton.on('pointerout', () => {
      closeButton.setColor('#FFFFFF');
    });

    closeButton.on('pointerdown', () => {
      overlay.destroy();
      dialog.destroy();
      titleText.destroy();
      contentText.destroy();
      closeButton.destroy();
    });

    // Make overlay clickable to close
    overlay.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, this.cameras.main.width, this.cameras.main.height),
      Phaser.Geom.Rectangle.Contains
    );
    overlay.on('pointerdown', () => {
      overlay.destroy();
      dialog.destroy();
      titleText.destroy();
      contentText.destroy();
      closeButton.destroy();
    });
  }

  checkForSavedGame() {
    // TODO: Check localStorage for saved game
    try {
      const savedGame = localStorage.getItem('godDotsSave');
      return savedGame !== null;
    } catch (e) {
      return false;
    }
  }
}
