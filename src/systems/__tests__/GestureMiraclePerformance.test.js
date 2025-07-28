import { GestureRecognizer } from '../GestureRecognizer';
import { MiracleSystem } from '../MiracleSystem';

describe('Gesture & Miracle Performance Tests', () => {
  let gestureRecognizer;
  let miracleSystem;
  let mockPlayers;

  beforeEach(() => {
    gestureRecognizer = new GestureRecognizer();
    miracleSystem = new MiracleSystem();
    
    // Create multiple mock players for stress testing
    mockPlayers = Array(10).fill(null).map((_, i) => ({
      id: `player${i}`,
      beliefPoints: 10000,
      alignment: 0
    }));
  });

  describe('Gesture Recognition Performance', () => {
    test('should recognize 1000 gestures under 1 second', () => {
      const gestures = [];
      const start = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        // Generate different gesture types
        const gestureType = i % 5;
        let points = [];
        
        switch (gestureType) {
          case 0: // Circle
            points = generateCirclePoints(20);
            break;
          case 1: // Line
            points = generateLinePoints(20);
            break;
          case 2: // Square
            points = generateSquarePoints(20);
            break;
          case 3: // Star
            points = generateStarPoints(20);
            break;
          case 4: // Zigzag
            points = generateZigzagPoints(20);
            break;
        }
        
        const result = gestureRecognizer.recognize(points);
        if (result) gestures.push(result);
      }
      
      const end = performance.now();
      const totalTime = end - start;
      
      expect(totalTime).toBeLessThan(1000); // Under 1 second
      expect(gestures.length).toBeGreaterThan(900); // Most should be recognized
      
      console.log(`Recognized ${gestures.length}/1000 gestures in ${totalTime.toFixed(2)}ms`);
      console.log(`Average: ${(totalTime / 1000).toFixed(2)}ms per gesture`);
    });

    test('should handle very complex gestures efficiently', () => {
      // Create a gesture with many points
      const complexPoints = [];
      for (let i = 0; i < 1000; i++) {
        complexPoints.push({
          x: Math.sin(i * 0.1) * 100 + Math.random() * 10,
          y: Math.cos(i * 0.1) * 100 + Math.random() * 10
        });
      }
      
      const start = performance.now();
      const result = gestureRecognizer.recognize(complexPoints);
      const end = performance.now();
      
      expect(end - start).toBeLessThan(50); // Should still be fast
      expect(result).toBeDefined(); // Should produce some result
    });

    test('should maintain consistent performance over time', () => {
      const timings = [];
      
      for (let batch = 0; batch < 10; batch++) {
        const batchStart = performance.now();
        
        for (let i = 0; i < 100; i++) {
          const points = generateCirclePoints(30);
          gestureRecognizer.recognize(points);
        }
        
        const batchTime = performance.now() - batchStart;
        timings.push(batchTime);
      }
      
      // Check that performance doesn't degrade
      const avgTime = timings.reduce((a, b) => a + b) / timings.length;
      const maxDeviation = Math.max(...timings.map(t => Math.abs(t - avgTime)));
      
      expect(maxDeviation).toBeLessThan(avgTime * 0.5); // No timing should deviate by more than 50%
    });
  });

  describe('Miracle System Performance', () => {
    test('should handle 100 simultaneous miracles', () => {
      const start = performance.now();
      
      // Cast 100 miracles
      for (let i = 0; i < 100; i++) {
        const player = mockPlayers[i % mockPlayers.length];
        const miracleType = i % 3;
        let gesture;
        
        switch (miracleType) {
          case 0:
            gesture = { name: 'circle', score: 0.9 };
            break;
          case 1:
            gesture = { name: 'verticalLine', score: 0.9 };
            break;
          case 2:
            gesture = { name: 'star', score: 0.8 };
            break;
        }
        
        miracleSystem.completeCasting(player, gesture);
      }
      
      const castTime = performance.now() - start;
      expect(castTime).toBeLessThan(100); // Casting 100 miracles under 100ms
      
      // Update all miracles
      const updateStart = performance.now();
      miracleSystem.updateMiracles(16, {}); // One frame
      const updateTime = performance.now() - updateStart;
      
      expect(updateTime).toBeLessThan(16); // Should update within one frame
      expect(miracleSystem.getActiveMiracles().length).toBeGreaterThan(50); // Most should be active
      
      console.log(`Cast 100 miracles in ${castTime.toFixed(2)}ms`);
      console.log(`Updated all miracles in ${updateTime.toFixed(2)}ms`);
    });

    test('should efficiently manage cooldowns for many players', () => {
      // Create 1000 players
      const manyPlayers = Array(1000).fill(null).map((_, i) => ({
        id: `player${i}`,
        beliefPoints: 1000,
        alignment: 0
      }));
      
      // Each player casts a miracle
      const start = performance.now();
      
      manyPlayers.forEach((player, i) => {
        const miracle = {
          ...miracleSystem.MIRACLES.healingRain,
          name: 'healingRain'
        };
        miracleSystem.castMiracle(player, miracle, { x: i * 10, y: 0 });
      });
      
      const castTime = performance.now() - start;
      
      // Check cooldowns for all players
      const cooldownStart = performance.now();
      const allCooldowns = manyPlayers.map(player => 
        miracleSystem.getCooldowns(player.id)
      );
      const cooldownTime = performance.now() - cooldownStart;
      
      expect(castTime).toBeLessThan(500); // Cast 1000 miracles under 500ms
      expect(cooldownTime).toBeLessThan(100); // Check all cooldowns under 100ms
      expect(allCooldowns.filter(cd => cd.healingRain).length).toBe(1000);
    });
  });

  describe('Memory Usage Tests', () => {
    test('should not leak memory with repeated gesture recognition', () => {
      // Note: This is a simplified test. Real memory profiling would require heap snapshots
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform many recognitions
      for (let i = 0; i < 10000; i++) {
        gestureRecognizer.startRecording(0, 0);
        
        for (let j = 0; j < 20; j++) {
          gestureRecognizer.addPoint(j * 10, Math.sin(j) * 50);
        }
        
        gestureRecognizer.stopRecording();
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    test('should clean up expired miracles properly', () => {
      // Cast many short-duration miracles
      for (let i = 0; i < 1000; i++) {
        miracleSystem.activeMiracles.set(`miracle_${i}`, {
          id: `miracle_${i}`,
          name: 'Test Miracle',
          startTime: Date.now() - 10000, // Already expired
          effects: { duration: 5000 },
          location: { x: 0, y: 0 }
        });
      }
      
      expect(miracleSystem.activeMiracles.size).toBe(1000);
      
      // Update should clean them all
      miracleSystem.updateMiracles(16, {});
      
      expect(miracleSystem.activeMiracles.size).toBe(0);
    });
  });

  describe('Concurrent Operations', () => {
    test('should handle multiple players drawing gestures simultaneously', () => {
      const recognizers = mockPlayers.map(() => new GestureRecognizer());
      const results = [];
      
      const start = performance.now();
      
      // Simulate all players drawing at once
      recognizers.forEach((recognizer, i) => {
        recognizer.startRecording(i * 100, 0);
        
        // Each player draws a different gesture
        const gestureType = i % 3;
        let points;
        
        switch (gestureType) {
          case 0:
            points = generateCirclePoints(20);
            break;
          case 1:
            points = generateLinePoints(20);
            break;
          case 2:
            points = generateSquarePoints(20);
            break;
        }
        
        points.forEach(p => recognizer.addPoint(p.x + i * 100, p.y));
        const result = recognizer.stopRecording();
        if (result) results.push(result);
      });
      
      const end = performance.now();
      
      expect(results.length).toBe(recognizers.length);
      expect(end - start).toBeLessThan(100); // All players under 100ms
    });

    test('should handle rapid miracle casting and updates', () => {
      let totalCasts = 0;
      let totalUpdates = 0;
      
      const start = performance.now();
      
      // Simulate 1 second of gameplay
      for (let frame = 0; frame < 60; frame++) {
        // Random players cast miracles
        for (let i = 0; i < 5; i++) {
          if (Math.random() < 0.3) { // 30% chance to cast
            const player = mockPlayers[Math.floor(Math.random() * mockPlayers.length)];
            const gesture = { name: 'circle', score: 0.9 };
            
            const result = miracleSystem.completeCasting(player, gesture);
            if (result.success) totalCasts++;
          }
        }
        
        // Update all miracles
        miracleSystem.updateMiracles(16.67, {});
        totalUpdates++;
      }
      
      const end = performance.now();
      const totalTime = end - start;
      
      expect(totalTime).toBeLessThan(1000); // Should complete in under 1 second
      expect(totalUpdates).toBe(60);
      expect(totalCasts).toBeGreaterThan(0);
      
      console.log(`Simulated 1 second: ${totalCasts} casts, ${totalUpdates} updates in ${totalTime.toFixed(2)}ms`);
    });
  });

  describe('Stress Tests', () => {
    test('should handle gesture spam without crashing', () => {
      const spamRecognizer = new GestureRecognizer();
      
      expect(() => {
        for (let i = 0; i < 1000; i++) {
          // Rapid start/stop
          spamRecognizer.startRecording(Math.random() * 1000, Math.random() * 1000);
          
          // Add random points
          for (let j = 0; j < Math.random() * 50; j++) {
            spamRecognizer.addPoint(Math.random() * 1000, Math.random() * 1000);
          }
          
          // Sometimes stop, sometimes just start new one
          if (Math.random() < 0.5) {
            spamRecognizer.stopRecording();
          }
        }
      }).not.toThrow();
    });

    test('should handle miracle system edge cases under load', () => {
      expect(() => {
        // Null/undefined inputs
        miracleSystem.completeCasting(null, null);
        miracleSystem.completeCasting(mockPlayers[0], null);
        miracleSystem.completeCasting(null, { name: 'circle' });
        
        // Invalid miracle names
        for (let i = 0; i < 100; i++) {
          miracleSystem.completeCasting(mockPlayers[0], { 
            name: `invalid_${i}`, 
            score: 0.9 
          });
        }
        
        // Rapid state changes
        for (let i = 0; i < 100; i++) {
          miracleSystem.startCasting(mockPlayers[0], i, i);
          miracleSystem.cancelCasting();
        }
      }).not.toThrow();
    });
  });

  // Helper functions for generating test gestures
  function generateCirclePoints(count) {
    const points = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      points.push({
        x: Math.cos(angle) * 50,
        y: Math.sin(angle) * 50
      });
    }
    return points;
  }

  function generateLinePoints(count) {
    const points = [];
    for (let i = 0; i < count; i++) {
      points.push({
        x: 0,
        y: (i / count) * 100
      });
    }
    return points;
  }

  function generateSquarePoints(count) {
    const points = [];
    const perSide = Math.floor(count / 4);
    
    // Top
    for (let i = 0; i < perSide; i++) {
      points.push({ x: (i / perSide) * 100, y: 0 });
    }
    // Right
    for (let i = 0; i < perSide; i++) {
      points.push({ x: 100, y: (i / perSide) * 100 });
    }
    // Bottom
    for (let i = 0; i < perSide; i++) {
      points.push({ x: 100 - (i / perSide) * 100, y: 100 });
    }
    // Left
    for (let i = 0; i < perSide; i++) {
      points.push({ x: 0, y: 100 - (i / perSide) * 100 });
    }
    
    return points;
  }

  function generateStarPoints(count) {
    const points = [];
    const numPoints = 5;
    
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 * 2; // Double rotation for star
      const radius = i % 2 === 0 ? 50 : 20; // Alternating radius
      points.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius
      });
    }
    return points;
  }

  function generateZigzagPoints(count) {
    const points = [];
    for (let i = 0; i < count; i++) {
      points.push({
        x: (i / count) * 100,
        y: i % 2 === 0 ? 0 : 50
      });
    }
    return points;
  }
});