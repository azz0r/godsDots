/**
 * Settings Scene
 *
 * Game settings: volume, game speed, camera sensitivity, debug toggle.
 * Saves to localStorage and loads on boot.
 */

import Phaser from 'phaser';

const SETTINGS_KEY = 'godDotsSettings';

const DEFAULT_SETTINGS = {
  masterVolume: 0.8,
  musicVolume: 0.5,
  sfxVolume: 0.7,
  gameSpeed: 1,
  cameraSensitivity: 1,
  showDebug: false,
};

export function loadSettings() {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
  } catch (e) {
    // ignore
  }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    // ignore
  }
}

export default class SettingsScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SettingsScene' });
    this.settings = loadSettings();
    this.sliders = [];
  }

  create() {
    const { width, height } = this.cameras.main;
    this.elements = [];

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x0a0a1e, 1);
    bg.fillRect(0, 0, width, height);
    this.elements.push(bg);

    // Title
    const title = this.add.text(width / 2, 60, 'SETTINGS', {
      fontFamily: 'Georgia, serif',
      fontSize: '56px',
      fontStyle: 'bold',
      color: '#FFD700',
      stroke: '#000000',
      strokeThickness: 6,
    });
    title.setOrigin(0.5);
    this.elements.push(title);

    let y = 160;
    const rowHeight = 80;

    // Sliders
    y = this.createSlider(width / 2, y, 'Master Volume', 'masterVolume', 0, 1);
    y += rowHeight;
    y = this.createSlider(width / 2, y, 'Music Volume', 'musicVolume', 0, 1);
    y += rowHeight;
    y = this.createSlider(width / 2, y, 'SFX Volume', 'sfxVolume', 0, 1);
    y += rowHeight;
    y = this.createSlider(width / 2, y, 'Game Speed', 'gameSpeed', 0.5, 3, [0.5, 1, 2, 3]);
    y += rowHeight;
    y = this.createSlider(width / 2, y, 'Camera Sensitivity', 'cameraSensitivity', 0.5, 2);
    y += rowHeight;

    // Toggle: Show Debug
    this.createToggle(width / 2, y, 'Show Debug Info', 'showDebug');
    y += rowHeight;

    // Back button
    this.createBackButton(width / 2, height - 80);

    // ESC to go back
    this.input.keyboard.on('keydown-ESC', () => this.goBack());
  }

  createSlider(x, y, label, key, min, max, steps) {
    const sliderWidth = 300;
    const labelText = this.add.text(x - 200, y, label, {
      fontFamily: 'Georgia, serif',
      fontSize: '24px',
      color: '#FFFFFF',
    });
    labelText.setOrigin(1, 0.5);
    this.elements.push(labelText);

    // Track
    const track = this.add.graphics();
    const trackX = x - 100;
    track.fillStyle(0x333333);
    track.fillRoundedRect(trackX, y - 4, sliderWidth, 8, 4);
    this.elements.push(track);

    // Value
    const value = this.settings[key];
    const ratio = (value - min) / (max - min);
    const handleX = trackX + ratio * sliderWidth;

    // Fill
    const fill = this.add.graphics();
    fill.fillStyle(0xFFD700);
    fill.fillRoundedRect(trackX, y - 4, ratio * sliderWidth, 8, 4);
    this.elements.push(fill);

    // Handle
    const handle = this.add.circle(handleX, y, 12, 0xFFD700);
    handle.setStrokeStyle(2, 0xFFFFFF);
    handle.setInteractive({ draggable: true });
    this.elements.push(handle);

    // Value text
    const displayValue = steps ? value.toFixed(1) + 'x' : Math.round(value * 100) + '%';
    const valueText = this.add.text(trackX + sliderWidth + 20, y, displayValue, {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#FFD700',
    });
    valueText.setOrigin(0, 0.5);
    this.elements.push(valueText);

    // Drag handler
    handle.on('drag', (pointer, dragX) => {
      const clampedX = Phaser.Math.Clamp(dragX, trackX, trackX + sliderWidth);
      handle.x = clampedX;

      const newRatio = (clampedX - trackX) / sliderWidth;
      let newValue = min + newRatio * (max - min);

      // Snap to steps if provided
      if (steps) {
        newValue = steps.reduce((prev, curr) =>
          Math.abs(curr - newValue) < Math.abs(prev - newValue) ? curr : prev
        );
      }

      this.settings[key] = newValue;

      // Update fill
      const fillRatio = (newValue - min) / (max - min);
      fill.clear();
      fill.fillStyle(0xFFD700);
      fill.fillRoundedRect(trackX, y - 4, fillRatio * sliderWidth, 8, 4);

      // Update handle position for snapped values
      handle.x = trackX + fillRatio * sliderWidth;

      // Update text
      const newDisplayValue = steps ? newValue.toFixed(1) + 'x' : Math.round(newValue * 100) + '%';
      valueText.setText(newDisplayValue);

      saveSettings(this.settings);
    });

    return y;
  }

  createToggle(x, y, label, key) {
    const labelText = this.add.text(x - 200, y, label, {
      fontFamily: 'Georgia, serif',
      fontSize: '24px',
      color: '#FFFFFF',
    });
    labelText.setOrigin(1, 0.5);
    this.elements.push(labelText);

    const isOn = this.settings[key];
    const toggleBg = this.add.graphics();
    const toggleX = x - 80;

    const drawToggle = (on) => {
      toggleBg.clear();
      toggleBg.fillStyle(on ? 0x4ade80 : 0x444444);
      toggleBg.fillRoundedRect(toggleX, y - 14, 56, 28, 14);
      toggleBg.fillStyle(0xFFFFFF);
      toggleBg.fillCircle(on ? toggleX + 42 : toggleX + 14, y, 10);
    };

    drawToggle(isOn);
    this.elements.push(toggleBg);

    const hitArea = new Phaser.Geom.Rectangle(toggleX, y - 14, 56, 28);
    toggleBg.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

    toggleBg.on('pointerdown', () => {
      this.settings[key] = !this.settings[key];
      drawToggle(this.settings[key]);
      saveSettings(this.settings);
    });
  }

  createBackButton(x, y) {
    const buttonWidth = 250;
    const buttonHeight = 60;

    const bg = this.add.graphics();
    bg.fillStyle(0x2a2a4e);
    bg.fillRoundedRect(x - buttonWidth / 2, y - buttonHeight / 2, buttonWidth, buttonHeight, 12);
    bg.lineStyle(3, 0x4a4a8e);
    bg.strokeRoundedRect(x - buttonWidth / 2, y - buttonHeight / 2, buttonWidth, buttonHeight, 12);
    this.elements.push(bg);

    const text = this.add.text(x, y, 'BACK', {
      fontFamily: 'Georgia, serif',
      fontSize: '32px',
      fontStyle: 'bold',
      color: '#FFFFFF',
    });
    text.setOrigin(0.5);
    this.elements.push(text);

    const hitArea = new Phaser.Geom.Rectangle(
      x - buttonWidth / 2, y - buttonHeight / 2, buttonWidth, buttonHeight
    );
    bg.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

    bg.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x3a3a6e);
      bg.fillRoundedRect(x - buttonWidth / 2, y - buttonHeight / 2, buttonWidth, buttonHeight, 12);
      bg.lineStyle(4, 0xFFD700);
      bg.strokeRoundedRect(x - buttonWidth / 2, y - buttonHeight / 2, buttonWidth, buttonHeight, 12);
      text.setColor('#FFD700');
    });

    bg.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x2a2a4e);
      bg.fillRoundedRect(x - buttonWidth / 2, y - buttonHeight / 2, buttonWidth, buttonHeight, 12);
      bg.lineStyle(3, 0x4a4a8e);
      bg.strokeRoundedRect(x - buttonWidth / 2, y - buttonHeight / 2, buttonWidth, buttonHeight, 12);
      text.setColor('#FFFFFF');
    });

    bg.on('pointerdown', () => this.goBack());
  }

  goBack() {
    saveSettings(this.settings);
    this.scene.start('MainMenuScene');
  }
}
