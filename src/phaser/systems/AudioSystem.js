/**
 * Audio System
 *
 * Manages game audio through Phaser's sound manager.
 * Uses Web Audio API to generate procedural sound effects
 * (no audio asset files needed).
 *
 * Sound effects:
 * - Villager spawn: short chime
 * - Worship: soft choir note
 * - Building placed: low thud
 * - Divine power: whoosh/thunder
 * - Combat hit: impact
 *
 * Volume controls integrate with SettingsScene values.
 */

import { loadSettings } from '../scenes/SettingsScene';

export default class AudioSystem {
  constructor(scene) {
    this.scene = scene;

    // Audio context (from Phaser or created manually)
    this.audioContext = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;

    // Volume settings (0-1)
    this.masterVolume = 0.5;
    this.sfxVolume = 0.7;
    this.musicVolume = 0.3;

    // Ambient drone oscillator
    this.ambientOsc = null;
    this.ambientPlaying = false;

    this.initAudio();
    this.loadVolumeSettings();
    this.registerEventListeners();
  }

  /**
   * Initialize Web Audio context and gain nodes
   */
  initAudio() {
    try {
      // Try to get Phaser's audio context
      if (this.scene.sound?.context) {
        this.audioContext = this.scene.sound.context;
      } else {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }

      // Master gain
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);

      // SFX submix
      this.sfxGain = this.audioContext.createGain();
      this.sfxGain.connect(this.masterGain);

      // Music submix
      this.musicGain = this.audioContext.createGain();
      this.musicGain.connect(this.masterGain);

      this.applyVolumes();
    } catch (e) {
      console.warn('[AudioSystem] Web Audio not available:', e.message);
    }
  }

  /**
   * Load volume settings from localStorage
   */
  loadVolumeSettings() {
    const settings = loadSettings();
    this.masterVolume = settings.masterVolume ?? 0.5;
    this.sfxVolume = settings.sfxVolume ?? 0.7;
    this.musicVolume = settings.musicVolume ?? 0.3;
    this.applyVolumes();
  }

  /**
   * Apply current volume levels to gain nodes
   */
  applyVolumes() {
    if (this.masterGain) this.masterGain.gain.value = this.masterVolume;
    if (this.sfxGain) this.sfxGain.gain.value = this.sfxVolume;
    if (this.musicGain) this.musicGain.gain.value = this.musicVolume;
  }

  /**
   * Set volume levels
   */
  setVolume(master, sfx, music) {
    if (master !== undefined) this.masterVolume = master;
    if (sfx !== undefined) this.sfxVolume = sfx;
    if (music !== undefined) this.musicVolume = music;
    this.applyVolumes();
  }

  /**
   * Register game event listeners
   */
  registerEventListeners() {
    if (!this.scene.events) return;

    this.scene.events.on('powerCast', (data) => {
      this.playPowerSound(data.powerId);
    });
  }

  /**
   * Play a short tone (procedural SFX)
   * @param {number} frequency - Hz
   * @param {number} duration - seconds
   * @param {string} type - oscillator type (sine, square, triangle, sawtooth)
   * @param {number} volume - 0-1
   */
  playTone(frequency, duration, type = 'sine', volume = 0.3) {
    if (!this.audioContext || !this.sfxGain) return;

    // Resume context if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const now = this.audioContext.currentTime;
    const osc = this.audioContext.createOscillator();
    const env = this.audioContext.createGain();

    osc.type = type;
    osc.frequency.value = frequency;

    // ADSR-like envelope
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(volume, now + 0.02); // Attack
    env.gain.linearRampToValueAtTime(volume * 0.6, now + duration * 0.3); // Decay
    env.gain.linearRampToValueAtTime(0, now + duration); // Release

    osc.connect(env);
    env.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + duration);
  }

  /**
   * Play a noise burst (for thuds, impacts)
   */
  playNoise(duration, volume = 0.2) {
    if (!this.audioContext || !this.sfxGain) return;

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const now = this.audioContext.currentTime;
    const bufferSize = this.audioContext.sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.max(0, 1 - i / bufferSize);
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;

    const env = this.audioContext.createGain();
    env.gain.setValueAtTime(volume, now);
    env.gain.linearRampToValueAtTime(0, now + duration);

    // Low-pass filter for thud effect
    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    source.connect(filter);
    filter.connect(env);
    env.connect(this.sfxGain);

    source.start(now);
  }

  // --- Game event sounds ---

  playSpawnSound() {
    // Short rising chime
    this.playTone(600, 0.15, 'sine', 0.2);
    setTimeout(() => this.playTone(800, 0.1, 'sine', 0.15), 80);
  }

  playWorshipSound() {
    // Soft choir-like tone
    this.playTone(440, 0.4, 'sine', 0.1);
    this.playTone(554, 0.4, 'sine', 0.08); // Major third
  }

  playBuildSound() {
    // Low thud
    this.playNoise(0.2, 0.25);
    this.playTone(80, 0.15, 'sine', 0.3);
  }

  playCombatSound() {
    // Quick impact
    this.playNoise(0.1, 0.15);
    this.playTone(200, 0.08, 'square', 0.1);
  }

  playPowerSound(powerId) {
    switch (powerId) {
      case 'heal':
        // Rising arpeggio
        this.playTone(440, 0.2, 'sine', 0.2);
        setTimeout(() => this.playTone(554, 0.2, 'sine', 0.2), 100);
        setTimeout(() => this.playTone(660, 0.3, 'sine', 0.2), 200);
        break;
      case 'storm':
        // Thunder rumble
        this.playNoise(0.5, 0.4);
        this.playTone(60, 0.4, 'sawtooth', 0.15);
        break;
      case 'food':
        // Bright chime
        this.playTone(660, 0.15, 'sine', 0.2);
        setTimeout(() => this.playTone(880, 0.2, 'sine', 0.15), 100);
        break;
    }
  }

  playDeathSound() {
    this.playTone(200, 0.2, 'sawtooth', 0.1);
    this.playTone(150, 0.3, 'sine', 0.15);
  }

  /**
   * Start ambient background drone
   */
  startAmbient() {
    if (!this.audioContext || !this.musicGain || this.ambientPlaying) return;

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    // Low ambient drone
    this.ambientOsc = this.audioContext.createOscillator();
    this.ambientOsc.type = 'sine';
    this.ambientOsc.frequency.value = 80;

    const ambientGain = this.audioContext.createGain();
    ambientGain.gain.value = 0.05;

    this.ambientOsc.connect(ambientGain);
    ambientGain.connect(this.musicGain);
    this.ambientOsc.start();

    this.ambientPlaying = true;
    this._ambientGain = ambientGain;
  }

  /**
   * Stop ambient background
   */
  stopAmbient() {
    if (this.ambientOsc) {
      this.ambientOsc.stop();
      this.ambientOsc = null;
    }
    this.ambientPlaying = false;
  }

  destroy() {
    this.stopAmbient();
  }
}
