/**
 * Layer 5: Camera Control System
 *
 * Implements Black & White style camera controls:
 * - Left-click drag to pan camera
 * - Mouse wheel zoom in/out (zoom towards cursor)
 * - Double-click to zoom to location
 * - Smooth camera transitions
 */

import { TERRAIN_CONFIG } from '../config/terrainConfig';

export default class CameraControlSystem {
  /**
   * Create a new camera control system
   * @param {Phaser.Scene} scene - The Phaser scene
   */
  constructor(scene) {
    this.scene = scene;
    this.camera = scene.cameras.main;

    // Drag state
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.cameraStartX = 0;
    this.cameraStartY = 0;

    // Double-click detection
    this.lastClickTime = 0;
    this.doubleClickDelay = 300; // milliseconds
    this.isDoubleClick = false;

    // Zoom limits
    this.minZoom = 0.25;
    this.maxZoom = 4.0;
    this.defaultZoom = 2.5; // Close-up zoom for double-click

    // Smooth camera transitions
    this.targetZoom = null;
    this.targetCameraX = null;
    this.targetCameraY = null;
    this.transitionSpeed = 0.2; // Lerp factor (0-1) - increased from 0.1 for faster transitions
    this.transitionThreshold = 0.5; // Stop transitioning when this close

    // Zoom behavior
    this.zoomSpeed = 0.0025; // How fast to zoom per wheel delta - increased from 0.001 for quicker zoom
    this.zoomStep = 0.15; // Discrete zoom step - increased from 0.1 for bigger steps

    // Bind event handlers
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handleWheel = this.handleWheel.bind(this);

    // Register input listeners
    this.registerListeners();

    console.log('[CameraControlSystem] Initialized');
  }

  /**
   * Register input event listeners
   */
  registerListeners() {
    this.scene.input.on('pointerdown', this.handlePointerDown);
    this.scene.input.on('pointermove', this.handlePointerMove);
    this.scene.input.on('pointerup', this.handlePointerUp);
    this.scene.input.on('wheel', this.handleWheel);
  }

  /**
   * Handle pointer down event (start drag or detect double-click)
   * @param {Phaser.Input.Pointer} pointer
   */
  handlePointerDown(pointer) {
    // Only respond to left mouse button
    if (!pointer.leftButtonDown() || pointer.button !== 0) {
      return;
    }

    // Don't start drag if targeting a power or placing a building
    if (this.scene.divinePowerSystem && this.scene.divinePowerSystem.selectedPower) {
      return;
    }
    if (this.scene.buildingSystem && this.scene.buildingSystem.placementMode) {
      return;
    }

    // Check for double-click
    const currentTime = pointer.downTime;
    const timeSinceLastClick = currentTime - this.lastClickTime;

    if (timeSinceLastClick < this.doubleClickDelay) {
      // Double-click detected!
      this.isDoubleClick = true;
      this.handleDoubleClick(pointer);
      this.lastClickTime = 0; // Reset to avoid triple-click detection
      return;
    }

    this.lastClickTime = currentTime;
    this.isDoubleClick = false;

    // Start dragging
    this.isDragging = true;
    this.dragStartX = pointer.x;
    this.dragStartY = pointer.y;
    this.cameraStartX = this.camera.scrollX;
    this.cameraStartY = this.camera.scrollY;
  }

  /**
   * Handle pointer move event (drag camera)
   * @param {Phaser.Input.Pointer} pointer
   */
  handlePointerMove(pointer) {
    if (!this.isDragging || !pointer.leftButtonDown()) {
      return;
    }

    // Calculate drag delta
    const deltaX = pointer.x - this.dragStartX;
    const deltaY = pointer.y - this.dragStartY;

    // Move camera opposite to drag direction
    // Scale by zoom level (at higher zoom, smaller camera movement per pixel drag)
    const newScrollX = this.cameraStartX - deltaX / this.camera.zoom;
    const newScrollY = this.cameraStartY - deltaY / this.camera.zoom;

    this.camera.setScroll(newScrollX, newScrollY);

    // Cancel any ongoing transition
    this.targetZoom = null;
    this.targetCameraX = null;
    this.targetCameraY = null;
  }

  /**
   * Handle pointer up event (stop dragging)
   */
  handlePointerUp() {
    this.isDragging = false;
  }

  /**
   * Handle double-click event
   * @param {Phaser.Input.Pointer} pointer
   */
  handleDoubleClick(pointer) {
    // Convert screen coordinates to world coordinates
    const worldX = pointer.x / this.camera.zoom + this.camera.scrollX;
    const worldY = pointer.y / this.camera.zoom + this.camera.scrollY;

    // Zoom to this location
    this.zoomToLocation(worldX, worldY, this.defaultZoom);

    console.log(`[CameraControlSystem] Double-click zoom to (${Math.floor(worldX)}, ${Math.floor(worldY)})`);
  }

  /**
   * Handle mouse wheel event (zoom in/out)
   * @param {WheelEvent} event
   */
  handleWheel(event) {
    // Prevent page scroll
    event.preventDefault?.();

    // Get mouse position
    const mousePointer = this.scene.input.mousePointer;
    const mouseX = mousePointer.x;
    const mouseY = mousePointer.y;

    // Calculate world position before zoom
    const worldXBefore = mouseX / this.camera.zoom + this.camera.scrollX;
    const worldYBefore = mouseY / this.camera.zoom + this.camera.scrollY;

    // Calculate new zoom
    const zoomDelta = -event.deltaY * this.zoomSpeed;
    let newZoom = this.camera.zoom + zoomDelta;

    // Apply zoom limits
    newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));

    // Set new zoom
    this.camera.setZoom(newZoom);

    // Calculate world position after zoom
    const worldXAfter = mouseX / this.camera.zoom + this.camera.scrollX;
    const worldYAfter = mouseY / this.camera.zoom + this.camera.scrollY;

    // Adjust camera scroll to keep world position under cursor
    const scrollDeltaX = worldXBefore - worldXAfter;
    const scrollDeltaY = worldYBefore - worldYAfter;

    this.camera.setScroll(
      this.camera.scrollX + scrollDeltaX,
      this.camera.scrollY + scrollDeltaY
    );

    // Cancel any ongoing transition
    this.targetZoom = null;
    this.targetCameraX = null;
    this.targetCameraY = null;
  }

  /**
   * Zoom to a specific location with smooth transition
   * @param {number} worldX - World X coordinate
   * @param {number} worldY - World Y coordinate
   * @param {number} zoom - Target zoom level (optional, uses default if not provided)
   */
  zoomToLocation(worldX, worldY, zoom = this.defaultZoom) {
    // Clamp zoom to limits
    zoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));

    // Set transition targets
    this.targetZoom = zoom;
    this.targetCameraX = worldX - (this.camera.width / 2) / zoom;
    this.targetCameraY = worldY - (this.camera.height / 2) / zoom;

    console.log(`[CameraControlSystem] Zoom transition started to (${Math.floor(worldX)}, ${Math.floor(worldY)}) at ${zoom}x`);
  }

  /**
   * Zoom to a villager's position
   * @param {Villager} villager - The villager to zoom to
   */
  zoomToVillager(villager) {
    if (!villager) {
      console.warn('[CameraControlSystem] Cannot zoom to null villager');
      return;
    }

    // Convert tile coordinates to world pixel coordinates
    const TILE_SIZE = TERRAIN_CONFIG.TILE_SIZE;
    const worldX = villager.x * TILE_SIZE + TILE_SIZE / 2;
    const worldY = villager.y * TILE_SIZE + TILE_SIZE / 2;

    console.log(`[CameraControlSystem] ========== ZOOM TO VILLAGER ==========`);
    console.log(`[CameraControlSystem] Villager #${villager.id}`);
    console.log(`[CameraControlSystem] Tile position: (${villager.x}, ${villager.y})`);
    console.log(`[CameraControlSystem] Tile size: ${TILE_SIZE}px`);
    console.log(`[CameraControlSystem] World pixel position: (${worldX}, ${worldY})`);
    console.log(`[CameraControlSystem] Target zoom: ${this.defaultZoom}x`);

    this.zoomToLocation(worldX, worldY, this.defaultZoom);
  }

  /**
   * Update camera (smooth transitions)
   * @param {number} delta - Time since last frame in milliseconds
   */
  update(delta) {
    // Check if we have active transitions
    const hasZoomTarget = this.targetZoom !== null;
    const hasPositionTarget = this.targetCameraX !== null && this.targetCameraY !== null;

    if (!hasZoomTarget && !hasPositionTarget) {
      return; // No active transitions
    }

    // Smooth zoom transition
    if (hasZoomTarget) {
      const zoomDiff = this.targetZoom - this.camera.zoom;

      if (Math.abs(zoomDiff) < 0.01) {
        // Close enough, snap to target
        this.camera.setZoom(this.targetZoom);
        this.targetZoom = null;
      } else {
        // Lerp towards target
        const newZoom = this.camera.zoom + zoomDiff * this.transitionSpeed;
        this.camera.setZoom(newZoom);
      }
    }

    // Smooth position transition
    if (hasPositionTarget) {
      const scrollXDiff = this.targetCameraX - this.camera.scrollX;
      const scrollYDiff = this.targetCameraY - this.camera.scrollY;

      const distance = Math.sqrt(scrollXDiff * scrollXDiff + scrollYDiff * scrollYDiff);

      if (distance < this.transitionThreshold) {
        // Close enough, snap to target
        this.camera.setScroll(this.targetCameraX, this.targetCameraY);
        this.targetCameraX = null;
        this.targetCameraY = null;
      } else {
        // Lerp towards target
        const newScrollX = this.camera.scrollX + scrollXDiff * this.transitionSpeed;
        const newScrollY = this.camera.scrollY + scrollYDiff * this.transitionSpeed;
        this.camera.setScroll(newScrollX, newScrollY);
      }
    }
  }

  /**
   * Clean up and remove listeners
   */
  destroy() {
    this.scene.input.off('pointerdown', this.handlePointerDown);
    this.scene.input.off('pointermove', this.handlePointerMove);
    this.scene.input.off('pointerup', this.handlePointerUp);
    this.scene.input.off('wheel', this.handleWheel);

    this.isDragging = false;
    this.targetZoom = null;
    this.targetCameraX = null;
    this.targetCameraY = null;

    console.log('[CameraControlSystem] Destroyed');
  }
}
