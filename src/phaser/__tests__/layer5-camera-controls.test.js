/**
 * Layer 5: Camera Control System Tests
 *
 * Tests for Black & White style camera controls:
 * - Left-click drag to pan camera
 * - Mouse wheel zoom in/out
 * - Double-click to zoom to location
 * - Smooth camera transitions
 * - Zoom limits and bounds
 */

import CameraControlSystem from '../systems/CameraControlSystem';

describe('Layer 5: Camera Control System', () => {
  describe('CameraControlSystem Initialization', () => {
    test('should initialize with default settings', () => {
      const mockCamera = {
        scrollX: 0,
        scrollY: 0,
        zoom: 1,
        setZoom: jest.fn(),
        setScroll: jest.fn(),
        centerOn: jest.fn()
      };

      const mockScene = {
        cameras: { main: mockCamera },
        input: {
          on: jest.fn(),
          off: jest.fn()
        }
      };

      const system = new CameraControlSystem(mockScene);

      expect(system).toBeDefined();
      expect(system.scene).toBe(mockScene);
      expect(system.camera).toBe(mockCamera);
      expect(system.isDragging).toBe(false);
    });

    test('should store zoom limits', () => {
      const mockCamera = {
        zoom: 1,
        setZoom: jest.fn()
      };

      const mockScene = {
        cameras: { main: mockCamera },
        input: {
          on: jest.fn(),
          off: jest.fn()
        }
      };

      const system = new CameraControlSystem(mockScene);

      expect(system.minZoom).toBeDefined();
      expect(system.maxZoom).toBeDefined();
      expect(system.minZoom).toBeGreaterThan(0);
      expect(system.maxZoom).toBeGreaterThan(system.minZoom);
    });

    test('should register input listeners on initialization', () => {
      const mockInput = {
        on: jest.fn(),
        off: jest.fn()
      };

      const mockScene = {
        cameras: { main: { zoom: 1 } },
        input: mockInput
      };

      new CameraControlSystem(mockScene);

      // Should register pointer events
      expect(mockInput.on).toHaveBeenCalledWith('pointerdown', expect.any(Function));
      expect(mockInput.on).toHaveBeenCalledWith('pointermove', expect.any(Function));
      expect(mockInput.on).toHaveBeenCalledWith('pointerup', expect.any(Function));
      expect(mockInput.on).toHaveBeenCalledWith('wheel', expect.any(Function));
    });
  });

  describe('Camera Drag (Pan)', () => {
    test('should start dragging on left mouse button down', () => {
      const mockCamera = {
        scrollX: 0,
        scrollY: 0,
        zoom: 1,
        setScroll: jest.fn()
      };

      const mockScene = {
        cameras: { main: mockCamera },
        input: {
          on: jest.fn(),
          off: jest.fn()
        }
      };

      const system = new CameraControlSystem(mockScene);

      // Simulate left mouse button down
      const pointer = {
        leftButtonDown: () => true,
        x: 100,
        y: 100,
        button: 0
      };

      system.handlePointerDown(pointer);

      expect(system.isDragging).toBe(true);
      expect(system.dragStartX).toBe(100);
      expect(system.dragStartY).toBe(100);
    });

    test('should not start dragging on right mouse button', () => {
      const mockCamera = {
        zoom: 1
      };

      const mockScene = {
        cameras: { main: mockCamera },
        input: {
          on: jest.fn(),
          off: jest.fn()
        }
      };

      const system = new CameraControlSystem(mockScene);

      // Simulate right mouse button down
      const pointer = {
        leftButtonDown: () => false,
        rightButtonDown: () => true,
        x: 100,
        y: 100,
        button: 2
      };

      system.handlePointerDown(pointer);

      expect(system.isDragging).toBe(false);
    });

    test('should pan camera when dragging', () => {
      const mockCamera = {
        scrollX: 100,
        scrollY: 100,
        zoom: 1,
        setScroll: jest.fn()
      };

      const mockScene = {
        cameras: { main: mockCamera },
        input: {
          on: jest.fn(),
          off: jest.fn()
        }
      };

      const system = new CameraControlSystem(mockScene);
      system.isDragging = true;
      system.dragStartX = 100;
      system.dragStartY = 100;
      system.cameraStartX = 100;
      system.cameraStartY = 100;

      // Drag 50 pixels to the right and down
      const pointer = {
        x: 150,
        y: 150,
        leftButtonDown: () => true
      };

      system.handlePointerMove(pointer);

      // Camera should move opposite to drag direction
      expect(mockCamera.setScroll).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number)
      );
    });

    test('should stop dragging on pointer up', () => {
      const mockCamera = {
        zoom: 1
      };

      const mockScene = {
        cameras: { main: mockCamera },
        input: {
          on: jest.fn(),
          off: jest.fn()
        }
      };

      const system = new CameraControlSystem(mockScene);
      system.isDragging = true;

      system.handlePointerUp();

      expect(system.isDragging).toBe(false);
    });

    test('should scale drag movement by zoom level', () => {
      const mockCamera = {
        scrollX: 0,
        scrollY: 0,
        zoom: 2, // 2x zoom
        setScroll: jest.fn()
      };

      const mockScene = {
        cameras: { main: mockCamera },
        input: {
          on: jest.fn(),
          off: jest.fn()
        }
      };

      const system = new CameraControlSystem(mockScene);
      system.isDragging = true;
      system.dragStartX = 0;
      system.dragStartY = 0;
      system.cameraStartX = 0;
      system.cameraStartY = 0;

      const pointer = {
        x: 100,
        y: 100,
        leftButtonDown: () => true
      };

      system.handlePointerMove(pointer);

      // At 2x zoom, camera should move half as much as cursor
      const callArgs = mockCamera.setScroll.mock.calls[0];
      expect(Math.abs(callArgs[0])).toBeLessThan(100);
      expect(Math.abs(callArgs[1])).toBeLessThan(100);
    });
  });

  describe('Mouse Wheel Zoom', () => {
    test('should zoom in on wheel up', () => {
      const mockCamera = {
        scrollX: 0,
        scrollY: 0,
        zoom: 1,
        setZoom: jest.fn(),
        setScroll: jest.fn()
      };

      const mockScene = {
        cameras: { main: mockCamera },
        input: {
          on: jest.fn(),
          off: jest.fn(),
          mousePointer: {
            x: 400,
            y: 300
          }
        }
      };

      const system = new CameraControlSystem(mockScene);
      const initialZoom = mockCamera.zoom;

      // Simulate wheel up (zoom in)
      const event = {
        deltaY: -100
      };

      system.handleWheel(event);

      expect(mockCamera.setZoom).toHaveBeenCalled();
      const newZoom = mockCamera.setZoom.mock.calls[0][0];
      expect(newZoom).toBeGreaterThan(initialZoom);
    });

    test('should zoom out on wheel down', () => {
      const mockCamera = {
        scrollX: 0,
        scrollY: 0,
        zoom: 1,
        setZoom: jest.fn(),
        setScroll: jest.fn()
      };

      const mockScene = {
        cameras: { main: mockCamera },
        input: {
          on: jest.fn(),
          off: jest.fn(),
          mousePointer: {
            x: 400,
            y: 300
          }
        }
      };

      const system = new CameraControlSystem(mockScene);
      const initialZoom = mockCamera.zoom;

      // Simulate wheel down (zoom out)
      const event = {
        deltaY: 100
      };

      system.handleWheel(event);

      expect(mockCamera.setZoom).toHaveBeenCalled();
      const newZoom = mockCamera.setZoom.mock.calls[0][0];
      expect(newZoom).toBeLessThan(initialZoom);
    });

    test('should respect minimum zoom limit', () => {
      const mockCamera = {
        scrollX: 0,
        scrollY: 0,
        zoom: 0.3, // Near minimum
        setZoom: jest.fn(),
        setScroll: jest.fn()
      };

      const mockScene = {
        cameras: { main: mockCamera },
        input: {
          on: jest.fn(),
          off: jest.fn(),
          mousePointer: {
            x: 400,
            y: 300
          }
        }
      };

      const system = new CameraControlSystem(mockScene);

      // Try to zoom out past minimum
      const event = {
        deltaY: 1000 // Large zoom out
      };

      system.handleWheel(event);

      const newZoom = mockCamera.setZoom.mock.calls[0][0];
      expect(newZoom).toBeGreaterThanOrEqual(system.minZoom);
    });

    test('should respect maximum zoom limit', () => {
      const mockCamera = {
        scrollX: 0,
        scrollY: 0,
        zoom: 3, // Near maximum
        setZoom: jest.fn(),
        setScroll: jest.fn()
      };

      const mockScene = {
        cameras: { main: mockCamera },
        input: {
          on: jest.fn(),
          off: jest.fn(),
          mousePointer: {
            x: 400,
            y: 300
          }
        }
      };

      const system = new CameraControlSystem(mockScene);

      // Try to zoom in past maximum
      const event = {
        deltaY: -1000 // Large zoom in
      };

      system.handleWheel(event);

      const newZoom = mockCamera.setZoom.mock.calls[0][0];
      expect(newZoom).toBeLessThanOrEqual(system.maxZoom);
    });

    test('should zoom towards cursor position', () => {
      const mockCamera = {
        scrollX: 0,
        scrollY: 0,
        zoom: 1,
        setZoom: jest.fn(),
        setScroll: jest.fn()
      };

      const cursorX = 400;
      const cursorY = 300;

      const mockScene = {
        cameras: { main: mockCamera },
        input: {
          on: jest.fn(),
          off: jest.fn(),
          mousePointer: {
            x: cursorX,
            y: cursorY
          }
        }
      };

      const system = new CameraControlSystem(mockScene);

      const event = {
        deltaY: -100
      };

      system.handleWheel(event);

      // Camera should adjust scroll position to zoom towards cursor
      expect(mockCamera.setScroll).toHaveBeenCalled();
    });
  });

  describe('Double-Click Zoom', () => {
    test('should detect double-click', () => {
      const mockCamera = {
        scrollX: 0,
        scrollY: 0,
        zoom: 1,
        setZoom: jest.fn(),
        setScroll: jest.fn()
      };

      const mockScene = {
        cameras: { main: mockCamera },
        input: {
          on: jest.fn(),
          off: jest.fn()
        }
      };

      const system = new CameraControlSystem(mockScene);

      const pointer = {
        x: 400,
        y: 300,
        leftButtonDown: () => true,
        button: 0,
        downTime: 100
      };

      // First click
      system.handlePointerDown(pointer);
      system.handlePointerUp();

      // Second click (within double-click time)
      pointer.downTime = 250; // 150ms later
      system.handlePointerDown(pointer);

      expect(system.isDoubleClick).toBe(true);
    });

    test('should not detect double-click if too slow', () => {
      const mockCamera = {
        zoom: 1
      };

      const mockScene = {
        cameras: { main: mockCamera },
        input: {
          on: jest.fn(),
          off: jest.fn()
        }
      };

      const system = new CameraControlSystem(mockScene);

      const pointer = {
        x: 400,
        y: 300,
        leftButtonDown: () => true,
        button: 0,
        downTime: 100
      };

      // First click
      system.handlePointerDown(pointer);
      system.handlePointerUp();

      // Second click (too late)
      pointer.downTime = 600; // 500ms later
      system.handlePointerDown(pointer);

      expect(system.isDoubleClick).toBe(false);
    });

    test('should zoom to clicked location on double-click', () => {
      const mockCamera = {
        scrollX: 0,
        scrollY: 0,
        zoom: 1,
        setZoom: jest.fn(),
        setScroll: jest.fn()
      };

      const mockScene = {
        cameras: { main: mockCamera },
        input: {
          on: jest.fn(),
          off: jest.fn()
        }
      };

      const system = new CameraControlSystem(mockScene);

      const targetX = 400;
      const targetY = 300;

      system.zoomToLocation(targetX, targetY, 2);

      // Should center camera on target location with new zoom
      expect(system.targetZoom).toBe(2);
      expect(system.targetCameraX).toBeDefined();
      expect(system.targetCameraY).toBeDefined();
    });

    test('should use default zoom level for double-click', () => {
      const mockCamera = {
        scrollX: 0,
        scrollY: 0,
        zoom: 0.5, // Zoomed out
        setZoom: jest.fn(),
        setScroll: jest.fn()
      };

      const mockScene = {
        cameras: { main: mockCamera },
        input: {
          on: jest.fn(),
          off: jest.fn()
        }
      };

      const system = new CameraControlSystem(mockScene);

      system.zoomToLocation(400, 300);

      // Should have a target zoom set
      expect(system.targetZoom).toBeGreaterThan(mockCamera.zoom);
      expect(system.targetZoom).toBeDefined();
    });
  });

  describe('Smooth Camera Transitions', () => {
    test('should smoothly interpolate to target zoom', () => {
      const mockCamera = {
        scrollX: 0,
        scrollY: 0,
        zoom: 1,
        setZoom: jest.fn(),
        setScroll: jest.fn()
      };

      const mockScene = {
        cameras: { main: mockCamera },
        input: {
          on: jest.fn(),
          off: jest.fn()
        }
      };

      const system = new CameraControlSystem(mockScene);
      system.targetZoom = 2;
      system.targetCameraX = 0;
      system.targetCameraY = 0;

      // Simulate update with delta time
      system.update(16); // 60 FPS frame

      expect(mockCamera.setZoom).toHaveBeenCalled();
      const newZoom = mockCamera.setZoom.mock.calls[0][0];

      // Should move towards target but not instantly
      expect(newZoom).toBeGreaterThan(1);
      expect(newZoom).toBeLessThanOrEqual(2);
    });

    test('should smoothly interpolate camera position', () => {
      const mockCamera = {
        scrollX: 0,
        scrollY: 0,
        zoom: 1,
        setZoom: jest.fn(),
        setScroll: jest.fn()
      };

      const mockScene = {
        cameras: { main: mockCamera },
        input: {
          on: jest.fn(),
          off: jest.fn()
        }
      };

      const system = new CameraControlSystem(mockScene);
      system.targetCameraX = 1000;
      system.targetCameraY = 1000;
      system.targetZoom = mockCamera.zoom;

      system.update(16);

      expect(mockCamera.setScroll).toHaveBeenCalled();
      const scrollX = mockCamera.setScroll.mock.calls[0][0];
      const scrollY = mockCamera.setScroll.mock.calls[0][1];

      // Should move towards target
      expect(scrollX).toBeGreaterThan(0);
      expect(scrollY).toBeGreaterThan(0);
    });

    test('should clear targets when transition is complete', () => {
      const mockCamera = {
        scrollX: 999.8,
        scrollY: 999.8,
        zoom: 1.995,
        setZoom: jest.fn(),
        setScroll: jest.fn()
      };

      const mockScene = {
        cameras: { main: mockCamera },
        input: {
          on: jest.fn(),
          off: jest.fn()
        }
      };

      const system = new CameraControlSystem(mockScene);
      system.targetCameraX = 1000;
      system.targetCameraY = 1000;
      system.targetZoom = 2;

      system.update(16);

      // Should clear targets when close enough
      expect(system.targetCameraX).toBeNull();
      expect(system.targetCameraY).toBeNull();
      expect(system.targetZoom).toBeNull();
    });

    test('should not update camera if no active transition', () => {
      const mockCamera = {
        scrollX: 0,
        scrollY: 0,
        zoom: 1,
        setZoom: jest.fn(),
        setScroll: jest.fn()
      };

      const mockScene = {
        cameras: { main: mockCamera },
        input: {
          on: jest.fn(),
          off: jest.fn()
        }
      };

      const system = new CameraControlSystem(mockScene);

      system.update(16);

      // Should not call camera methods if no targets
      expect(mockCamera.setZoom).not.toHaveBeenCalled();
      expect(mockCamera.setScroll).not.toHaveBeenCalled();
    });
  });

  describe('Zoom to Villager', () => {
    test('should zoom to villager position', () => {
      const mockCamera = {
        scrollX: 0,
        scrollY: 0,
        zoom: 1,
        setZoom: jest.fn(),
        setScroll: jest.fn()
      };

      const mockScene = {
        cameras: { main: mockCamera },
        input: {
          on: jest.fn(),
          off: jest.fn()
        }
      };

      const system = new CameraControlSystem(mockScene);

      const villager = {
        x: 100,
        y: 100
      };

      system.zoomToVillager(villager);

      expect(system.targetCameraX).toBeDefined();
      expect(system.targetCameraY).toBeDefined();
      expect(system.targetZoom).toBeGreaterThan(1);
    });

    test('should convert tile coordinates to world coordinates', () => {
      const mockCamera = {
        scrollX: 0,
        scrollY: 0,
        zoom: 1,
        width: 800,
        height: 600,
        setZoom: jest.fn(),
        setScroll: jest.fn()
      };

      const mockScene = {
        cameras: { main: mockCamera },
        input: {
          on: jest.fn(),
          off: jest.fn()
        }
      };

      const system = new CameraControlSystem(mockScene);

      const villager = {
        x: 10, // Tile position
        y: 10
      };

      system.zoomToVillager(villager);

      // Should convert tile coordinates to world pixel coordinates and center camera
      expect(system.targetCameraX).toBeDefined();
      expect(system.targetCameraY).toBeDefined();
      expect(typeof system.targetCameraX).toBe('number');
      expect(typeof system.targetCameraY).toBe('number');
      expect(isNaN(system.targetCameraX)).toBe(false);
      expect(isNaN(system.targetCameraY)).toBe(false);
    });
  });

  describe('Cleanup', () => {
    test('should remove event listeners on destroy', () => {
      const mockInput = {
        on: jest.fn(),
        off: jest.fn()
      };

      const mockScene = {
        cameras: { main: { zoom: 1 } },
        input: mockInput
      };

      const system = new CameraControlSystem(mockScene);
      system.destroy();

      expect(mockInput.off).toHaveBeenCalledWith('pointerdown', expect.any(Function));
      expect(mockInput.off).toHaveBeenCalledWith('pointermove', expect.any(Function));
      expect(mockInput.off).toHaveBeenCalledWith('pointerup', expect.any(Function));
      expect(mockInput.off).toHaveBeenCalledWith('wheel', expect.any(Function));
    });

    test('should clear all state on destroy', () => {
      const mockScene = {
        cameras: { main: { zoom: 1 } },
        input: {
          on: jest.fn(),
          off: jest.fn()
        }
      };

      const system = new CameraControlSystem(mockScene);
      system.isDragging = true;
      system.targetZoom = 2;

      system.destroy();

      expect(system.isDragging).toBe(false);
      expect(system.targetZoom).toBeNull();
    });
  });
});
