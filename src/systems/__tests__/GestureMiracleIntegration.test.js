import { GestureRecognizer } from '../GestureRecognizer';
import { MiracleSystem } from '../MiracleSystem';

describe('Gesture → Miracle Integration Tests', () => {
  let gestureRecognizer;
  let miracleSystem;
  let mockPlayer;
  let mockGameState;

  beforeEach(() => {
    gestureRecognizer = new GestureRecognizer();
    miracleSystem = new MiracleSystem();
    
    mockPlayer = {
      id: 'player1',
      beliefPoints: 1000, // Plenty for testing
      alignment: 0
    };

    mockGameState = {
      entities: [],
      terrain: {},
      buildings: [],
      camera: { x: 0, y: 0, zoom: 1 }
    };

    // Clear any previous state
    miracleSystem.activeMiracles.clear();
    miracleSystem.cooldowns.clear();
  });

  describe('Full Casting Flow', () => {
    test('should cast healing rain from circle gesture', () => {
      // Start gesture recording
      const centerX = 200, centerY = 200;
      gestureRecognizer.startRecording(centerX, centerY);
      miracleSystem.startCasting(mockPlayer, centerX, centerY);

      // Draw a circle
      const radius = 50;
      const points = 32;
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        
        gestureRecognizer.addPoint(x, y);
        miracleSystem.updateCasting(x, y);
      }

      // Complete the gesture
      const gestureResult = gestureRecognizer.stopRecording();
      expect(gestureResult).toBeDefined();
      expect(gestureResult.name).toBe('circle');

      // Cast the miracle
      const miracleResult = miracleSystem.completeCasting(mockPlayer, gestureResult);
      
      expect(miracleResult.success).toBe(true);
      expect(miracleResult.message).toContain('Healing Rain');
      expect(mockPlayer.beliefPoints).toBe(980); // 1000 - 20
      
      // Check miracle is active
      const activeMiracles = miracleSystem.getActiveMiracles();
      expect(activeMiracles).toHaveLength(1);
      expect(activeMiracles[0].name).toBe('Healing Rain');
    });

    test('should cast divine light from vertical line', () => {
      const startX = 300, startY = 100, endY = 400;
      
      gestureRecognizer.startRecording(startX, startY);
      miracleSystem.startCasting(mockPlayer, startX, startY);

      // Draw vertical line
      for (let y = startY; y <= endY; y += 20) {
        gestureRecognizer.addPoint(startX, y);
        miracleSystem.updateCasting(startX, y);
      }

      const gestureResult = gestureRecognizer.stopRecording();
      expect(gestureResult.name).toBe('verticalLine');

      const miracleResult = miracleSystem.completeCasting(mockPlayer, gestureResult);
      
      expect(miracleResult.success).toBe(true);
      expect(miracleResult.message).toContain('Divine Light');
      expect(mockPlayer.beliefPoints).toBe(985); // 1000 - 15
      
      // Check alignment increased (good miracle)
      expect(mockPlayer.alignment).toBe(3);
    });

    test('should cast lightning from zigzag gesture', () => {
      const startX = 100;
      const y = 200;
      
      gestureRecognizer.startRecording(startX, y);
      miracleSystem.startCasting(mockPlayer, startX, y);

      // Draw lightning bolt (Z shape)
      const points = [
        { x: 100, y: 100 },
        { x: 200, y: 100 },
        { x: 100, y: 200 },
        { x: 200, y: 200 }
      ];

      points.forEach(point => {
        gestureRecognizer.addPoint(point.x, point.y);
        miracleSystem.updateCasting(point.x, point.y);
      });

      const gestureResult = gestureRecognizer.stopRecording();
      expect(gestureResult.name).toBe('lightning');

      const miracleResult = miracleSystem.completeCasting(mockPlayer, gestureResult);
      
      expect(miracleResult.success).toBe(true);
      expect(miracleResult.message).toContain('Lightning Strike');
      expect(mockPlayer.beliefPoints).toBe(950); // 1000 - 50
      
      // Check alignment decreased (evil miracle)
      expect(mockPlayer.alignment).toBe(-3);
    });
  });

  describe('Multiple Players', () => {
    test('should handle multiple players casting simultaneously', () => {
      const player1 = { id: 'p1', beliefPoints: 100, alignment: 0 };
      const player2 = { id: 'p2', beliefPoints: 100, alignment: 0 };
      
      // Player 1 draws a circle
      gestureRecognizer.startRecording(100, 100);
      for (let i = 0; i <= 20; i++) {
        const angle = (i / 20) * Math.PI * 2;
        gestureRecognizer.addPoint(
          100 + Math.cos(angle) * 30,
          100 + Math.sin(angle) * 30
        );
      }
      const gesture1 = gestureRecognizer.stopRecording();

      // Player 2 draws a vertical line
      gestureRecognizer.startRecording(200, 100);
      for (let y = 100; y <= 200; y += 10) {
        gestureRecognizer.addPoint(200, y);
      }
      const gesture2 = gestureRecognizer.stopRecording();

      // Both cast their miracles
      const result1 = miracleSystem.completeCasting(player1, gesture1);
      const result2 = miracleSystem.completeCasting(player2, gesture2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.message).toContain('Healing Rain');
      expect(result2.message).toContain('Divine Light');

      // Check independent cooldowns
      const cooldowns1 = miracleSystem.getCooldowns('p1');
      const cooldowns2 = miracleSystem.getCooldowns('p2');
      
      expect(cooldowns1.healingRain).toBeDefined();
      expect(cooldowns2.divineLight).toBeDefined();
      expect(cooldowns1.divineLight).toBeUndefined();
      expect(cooldowns2.healingRain).toBeUndefined();
    });
  });

  describe('Miracle Interactions', () => {
    test('should handle overlapping miracle effects', () => {
      // Mock area effect application
      const affectedEntities = new Set();
      miracleSystem.applyAreaEffect = jest.fn((location, radius, effectFn) => {
        // Simulate entities in area
        const entities = [
          { id: 'e1', x: location.x + 10, y: location.y, type: 'villager', health: 50, happiness: 50 },
          { id: 'e2', x: location.x - 10, y: location.y, type: 'villager', health: 60, happiness: 40 }
        ];
        
        entities.forEach(entity => {
          const dist = Math.sqrt(
            Math.pow(entity.x - location.x, 2) + 
            Math.pow(entity.y - location.y, 2)
          );
          if (dist <= radius) {
            effectFn(entity);
            affectedEntities.add(entity.id);
          }
        });
      });

      // Cast healing rain at (100, 100)
      const gesture1 = { name: 'circle', score: 0.9 };
      miracleSystem.startCasting(mockPlayer, 100, 100);
      const result1 = miracleSystem.completeCasting(mockPlayer, gesture1);
      
      // Cast divine light at (110, 100) - overlapping area
      const gesture2 = { name: 'verticalLine', score: 0.9 };
      miracleSystem.startCasting(mockPlayer, 110, 100);
      const result2 = miracleSystem.completeCasting(mockPlayer, gesture2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(affectedEntities.size).toBe(2); // Both entities affected
    });

    test('should respect miracle cooldowns in sequence', () => {
      // Cast healing rain
      const circleGesture = { name: 'circle', score: 0.9 };
      miracleSystem.completeCasting(mockPlayer, circleGesture);
      
      // Try to cast again immediately
      const result = miracleSystem.completeCasting(mockPlayer, circleGesture);
      
      expect(result.success).toBe(false);
      expect(result.reason).toMatch(/Cooldown/);
      
      // Check cooldown info
      const cooldowns = miracleSystem.getCooldowns(mockPlayer.id);
      expect(cooldowns.healingRain.remaining).toBeGreaterThan(0);
    });

    test('should update miracle effects over time', () => {
      jest.useFakeTimers();
      
      // Cast healing rain
      const gesture = { name: 'circle', score: 0.9 };
      const result = miracleSystem.completeCasting(mockPlayer, gesture);
      
      expect(result.success).toBe(true);
      
      // Simulate time passing
      const healingApplied = [];
      miracleSystem.applyAreaEffect = jest.fn((loc, rad, fn) => {
        healingApplied.push(Date.now());
      });
      
      // Update at different time intervals
      for (let i = 0; i < 10; i++) {
        jest.advanceTimersByTime(500); // Healing rain ticks every 500ms
        miracleSystem.updateMiracles(500, mockGameState);
      }
      
      // Should have healed multiple times
      expect(healingApplied.length).toBeGreaterThan(0);
      
      // Advance past duration
      jest.advanceTimersByTime(10000);
      miracleSystem.updateMiracles(100, mockGameState);
      
      // Miracle should be expired
      expect(miracleSystem.getActiveMiracles()).toHaveLength(0);
      
      jest.useRealTimers();
    });
  });

  describe('Preview System Integration', () => {
    test('should show preview while drawing gesture', () => {
      miracleSystem.recognizeGesture = jest.fn((points) => {
        // Simulate recognizing a circle after enough points
        if (points.length > 10) return 'circle';
        return null;
      });

      gestureRecognizer.startRecording(100, 100);
      miracleSystem.startCasting(mockPlayer, 100, 100);

      // Add points gradually
      for (let i = 0; i < 15; i++) {
        const angle = (i / 20) * Math.PI * 2;
        const x = 100 + Math.cos(angle) * 30;
        const y = 100 + Math.sin(angle) * 30;
        
        gestureRecognizer.addPoint(x, y);
        miracleSystem.updateCasting(x, y);
      }

      // Should have preview after 10+ points
      const preview = miracleSystem.getMiraclePreview();
      expect(preview).toBeDefined();
      expect(preview.name).toBe('Healing Rain');
      expect(preview.cost).toBe(20);
      expect(preview.radius).toBe(150);
    });

    test('should update preview location as gesture moves', () => {
      miracleSystem.recognizeGesture = jest.fn(() => 'verticalLine');
      
      miracleSystem.startCasting(mockPlayer, 100, 100);
      
      // Draw downward and track preview location
      const locations = [];
      for (let y = 100; y <= 300; y += 50) {
        miracleSystem.currentGesture = Array(15).fill({ x: 100, y }); // Enough for preview
        miracleSystem.updateCasting(100, y);
        
        if (miracleSystem.previewActive) {
          locations.push({ ...miracleSystem.previewLocation });
        }
      }

      expect(locations.length).toBeGreaterThan(0);
      expect(locations[locations.length - 1].y).toBeGreaterThan(locations[0].y);
    });
  });

  describe('Error Handling', () => {
    test('should handle incomplete gestures gracefully', () => {
      gestureRecognizer.startRecording(100, 100);
      miracleSystem.startCasting(mockPlayer, 100, 100);
      
      // Only add 2 points (minimum is 3)
      gestureRecognizer.addPoint(110, 100);
      
      const gestureResult = gestureRecognizer.stopRecording();
      const miracleResult = miracleSystem.completeCasting(mockPlayer, gestureResult);
      
      expect(gestureResult).toBeNull();
      expect(miracleResult.success).toBe(false);
      expect(miracleResult.reason).toBe('No gesture recognized');
    });

    test('should handle rapid gesture cancellation', () => {
      // Start and immediately cancel multiple times
      for (let i = 0; i < 10; i++) {
        gestureRecognizer.startRecording(i * 10, i * 10);
        miracleSystem.startCasting(mockPlayer, i * 10, i * 10);
        
        gestureRecognizer.stopRecording();
        miracleSystem.cancelCasting();
      }
      
      expect(gestureRecognizer.isRecording).toBe(false);
      expect(miracleSystem.currentGesture).toBeNull();
      expect(miracleSystem.previewActive).toBe(false);
    });

    test('should handle gesture timeout gracefully', () => {
      jest.useFakeTimers();
      
      gestureRecognizer.startRecording(100, 100);
      miracleSystem.startCasting(mockPlayer, 100, 100);
      
      // Add some points
      gestureRecognizer.addPoint(110, 110);
      gestureRecognizer.addPoint(120, 120);
      
      // Advance time past timeout
      jest.advanceTimersByTime(3000);
      
      // Try to add more points (should stop recording)
      gestureRecognizer.addPoint(130, 130);
      
      const gestureResult = gestureRecognizer.stopRecording();
      expect(gestureResult).toBeNull();
      
      jest.useRealTimers();
    });
  });

  describe('Performance Under Load', () => {
    test('should handle rapid gesture input efficiently', () => {
      const iterations = 100;
      const start = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        // Quick circle gesture
        gestureRecognizer.startRecording(0, 0);
        for (let j = 0; j < 20; j++) {
          const angle = (j / 20) * Math.PI * 2;
          gestureRecognizer.addPoint(
            Math.cos(angle) * 30,
            Math.sin(angle) * 30
          );
        }
        const gesture = gestureRecognizer.stopRecording();
        
        if (gesture) {
          miracleSystem.completeCasting(mockPlayer, gesture);
        }
      }
      
      const end = performance.now();
      const avgTime = (end - start) / iterations;
      
      expect(avgTime).toBeLessThan(10); // Under 10ms per complete flow
    });

    test('should maintain performance with many active miracles', () => {
      // Cast many miracles
      for (let i = 0; i < 50; i++) {
        mockPlayer.beliefPoints = 10000; // Ensure enough points
        
        const gesture = { name: i % 2 === 0 ? 'circle' : 'verticalLine', score: 0.9 };
        miracleSystem.completeCasting(mockPlayer, gesture);
      }
      
      // Measure update performance
      const start = performance.now();
      miracleSystem.updateMiracles(16, mockGameState); // ~60fps frame time
      const end = performance.now();
      
      expect(end - start).toBeLessThan(16); // Should complete within frame budget
    });
  });

  describe('Complex Gesture Scenarios', () => {
    test('should handle gesture with backtracking', () => {
      gestureRecognizer.startRecording(100, 100);
      
      // Draw forward then backward
      for (let x = 100; x <= 200; x += 10) {
        gestureRecognizer.addPoint(x, 100);
      }
      for (let x = 200; x >= 150; x -= 10) {
        gestureRecognizer.addPoint(x, 100);
      }
      
      const result = gestureRecognizer.stopRecording();
      expect(result).toBeDefined(); // Should still recognize something
    });

    test('should handle very small gestures', () => {
      gestureRecognizer.startRecording(100, 100);
      
      // Draw tiny circle (radius 5)
      for (let i = 0; i <= 10; i++) {
        const angle = (i / 10) * Math.PI * 2;
        gestureRecognizer.addPoint(
          100 + Math.cos(angle) * 5,
          100 + Math.sin(angle) * 5
        );
      }
      
      const result = gestureRecognizer.stopRecording();
      // Small gestures are harder to recognize
      if (result) {
        expect(result.score).toBeLessThan(0.9);
      }
    });

    test('should handle very large gestures', () => {
      gestureRecognizer.startRecording(500, 500);
      
      // Draw huge circle (radius 300)
      for (let i = 0; i <= 30; i++) {
        const angle = (i / 30) * Math.PI * 2;
        gestureRecognizer.addPoint(
          500 + Math.cos(angle) * 300,
          500 + Math.sin(angle) * 300
        );
      }
      
      const result = gestureRecognizer.stopRecording();
      expect(result).toBeDefined();
      expect(result.name).toBe('circle');
      // Should normalize large gestures well
      expect(result.score).toBeGreaterThan(0.7);
    });
  });
});