import { MiracleSystem } from '../MiracleSystem';

describe('MiracleSystem', () => {
  let miracleSystem;
  let mockPlayer;
  let mockGameState;

  beforeEach(() => {
    miracleSystem = new MiracleSystem();
    
    mockPlayer = {
      id: 'player1',
      beliefPoints: 100,
      alignment: 0
    };

    mockGameState = {
      entities: [],
      terrain: {},
      buildings: []
    };

    // Reset time-based states
    miracleSystem.activeMiracles.clear();
    miracleSystem.cooldowns.clear();
  });

  describe('Initialization', () => {
    test('should initialize with all miracle definitions', () => {
      const expectedMiracles = [
        'healingRain', 'divineLight', 'fertileGround', 'forestGrowth',
        'waterCreation', 'lightningStrike', 'shieldOfFaith', 'earthquake',
        'divineInspiration', 'meteorStrike', 'resurrection'
      ];

      expectedMiracles.forEach(miracleName => {
        expect(miracleSystem.MIRACLES[miracleName]).toBeDefined();
        expect(miracleSystem.MIRACLES[miracleName].name).toBeDefined();
        expect(miracleSystem.MIRACLES[miracleName].gesture).toBeDefined();
        expect(miracleSystem.MIRACLES[miracleName].cost).toBeGreaterThan(0);
        expect(miracleSystem.MIRACLES[miracleName].cooldown).toBeGreaterThan(0);
      });
    });

    test('should start with no active miracles', () => {
      expect(miracleSystem.activeMiracles.size).toBe(0);
      expect(miracleSystem.cooldowns.size).toBe(0);
      expect(miracleSystem.currentGesture).toBeNull();
      expect(miracleSystem.previewActive).toBe(false);
    });

    test('should have proper miracle properties', () => {
      const healingRain = miracleSystem.MIRACLES.healingRain;
      
      expect(healingRain.cost).toBe(20);
      expect(healingRain.cooldown).toBe(5000);
      expect(healingRain.radius).toBe(150);
      expect(healingRain.effects.healing).toBe(50);
      expect(healingRain.particleColor).toBe('#4169E1');
      expect(healingRain.sound).toBe('rain');
    });
  });

  describe('Casting Flow', () => {
    test('should start casting properly', () => {
      miracleSystem.startCasting(mockPlayer, 100, 200);
      
      expect(miracleSystem.currentGesture).toEqual([]);
      expect(miracleSystem.gestureStartPos).toEqual({ x: 100, y: 200 });
      expect(miracleSystem.previewActive).toBe(false);
    });

    test('should update casting with gesture points', () => {
      miracleSystem.startCasting(mockPlayer, 0, 0);
      
      for (let i = 0; i < 15; i++) {
        miracleSystem.updateCasting(i * 10, 0);
      }
      
      expect(miracleSystem.currentGesture.length).toBe(15);
      expect(miracleSystem.previewActive).toBe(true); // Should activate after 10 points
    });

    test('should cancel casting', () => {
      miracleSystem.startCasting(mockPlayer, 100, 200);
      miracleSystem.updateCasting(150, 250);
      miracleSystem.previewActive = true;
      
      miracleSystem.cancelCasting();
      
      expect(miracleSystem.currentGesture).toBeNull();
      expect(miracleSystem.gestureStartPos).toBeNull();
      expect(miracleSystem.previewActive).toBe(false);
      expect(miracleSystem.previewMiracle).toBeNull();
    });

    test('should complete casting with valid gesture', () => {
      const gestureResult = { name: 'circle', score: 0.9 };
      
      const result = miracleSystem.completeCasting(mockPlayer, gestureResult);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Healing Rain');
      expect(mockPlayer.beliefPoints).toBe(80); // 100 - 20 cost
    });

    test('should fail casting with no gesture', () => {
      const result = miracleSystem.completeCasting(mockPlayer, null);
      
      expect(result.success).toBe(false);
      expect(result.reason).toBe('No gesture recognized');
      expect(mockPlayer.beliefPoints).toBe(100); // Unchanged
    });

    test('should fail casting with unknown gesture', () => {
      const gestureResult = { name: 'unknown', score: 0.9 };
      
      const result = miracleSystem.completeCasting(mockPlayer, gestureResult);
      
      expect(result.success).toBe(false);
      expect(result.reason).toBe('Unknown miracle gesture');
    });
  });

  describe('Resource Management', () => {
    test('should check belief points before casting', () => {
      mockPlayer.beliefPoints = 10;
      const miracle = miracleSystem.MIRACLES.healingRain;
      
      const canCast = miracleSystem.canCastMiracle(mockPlayer, miracle);
      
      expect(canCast.allowed).toBe(false);
      expect(canCast.reason).toBe('Insufficient belief points');
    });

    test('should deduct belief points on successful cast', () => {
      const miracle = { ...miracleSystem.MIRACLES.healingRain, name: 'healingRain' };
      const location = { x: 100, y: 100 };
      
      miracleSystem.castMiracle(mockPlayer, miracle, location);
      
      expect(mockPlayer.beliefPoints).toBe(80); // 100 - 20
    });

    test('should not deduct points on failed cast', () => {
      mockPlayer.beliefPoints = 10;
      const gestureResult = { name: 'circle', score: 0.9 };
      
      const result = miracleSystem.completeCasting(mockPlayer, gestureResult);
      
      expect(result.success).toBe(false);
      expect(mockPlayer.beliefPoints).toBe(10); // Unchanged
    });
  });

  describe('Cooldown Management', () => {
    test('should set cooldown after casting', () => {
      const miracle = { ...miracleSystem.MIRACLES.healingRain, name: 'healingRain' };
      const location = { x: 100, y: 100 };
      
      miracleSystem.castMiracle(mockPlayer, miracle, location);
      
      const cooldowns = miracleSystem.cooldowns.get(mockPlayer.id);
      expect(cooldowns).toBeDefined();
      expect(cooldowns.healingRain).toBeGreaterThan(Date.now());
    });

    test('should prevent casting during cooldown', () => {
      const miracle = { ...miracleSystem.MIRACLES.healingRain, name: 'healingRain' };
      
      // Set cooldown to future time
      miracleSystem.cooldowns.set(mockPlayer.id, {
        healingRain: Date.now() + 3000
      });
      
      const canCast = miracleSystem.canCastMiracle(mockPlayer, miracle);
      
      expect(canCast.allowed).toBe(false);
      expect(canCast.reason).toMatch(/Cooldown: \d+s remaining/);
    });

    test('should allow casting after cooldown expires', () => {
      const miracle = { ...miracleSystem.MIRACLES.healingRain, name: 'healingRain' };
      
      // Set cooldown to past time
      miracleSystem.cooldowns.set(mockPlayer.id, {
        healingRain: Date.now() - 1000
      });
      
      const canCast = miracleSystem.canCastMiracle(mockPlayer, miracle);
      
      expect(canCast.allowed).toBe(true);
    });

    test('should track multiple cooldowns independently', () => {
      const healingRain = { ...miracleSystem.MIRACLES.healingRain, name: 'healingRain' };
      const divineLight = { ...miracleSystem.MIRACLES.divineLight, name: 'divineLight' };
      const location = { x: 100, y: 100 };
      
      miracleSystem.castMiracle(mockPlayer, healingRain, location);
      
      // Healing Rain should be on cooldown, but Divine Light should be available
      const canCastHealing = miracleSystem.canCastMiracle(mockPlayer, healingRain);
      const canCastLight = miracleSystem.canCastMiracle(mockPlayer, divineLight);
      
      expect(canCastHealing.allowed).toBe(false);
      expect(canCastLight.allowed).toBe(true);
    });

    test('should get cooldown info for UI', () => {
      miracleSystem.cooldowns.set(mockPlayer.id, {
        healingRain: Date.now() + 3000,
        divineLight: Date.now() - 1000 // Expired
      });
      
      const cooldowns = miracleSystem.getCooldowns(mockPlayer.id);
      
      expect(cooldowns.healingRain).toBeDefined();
      expect(cooldowns.healingRain.remaining).toBeGreaterThan(0);
      expect(cooldowns.healingRain.progress).toBeLessThan(1);
      expect(cooldowns.divineLight).toBeUndefined(); // Expired cooldowns not returned
    });
  });

  describe('Active Miracles', () => {
    test('should track active miracles with duration', () => {
      const miracle = { ...miracleSystem.MIRACLES.healingRain, name: 'healingRain' };
      const location = { x: 100, y: 100 };
      
      const result = miracleSystem.castMiracle(mockPlayer, miracle, location);
      
      expect(miracleSystem.activeMiracles.size).toBe(1);
      expect(miracleSystem.activeMiracles.has(result.miracle.id)).toBe(true);
    });

    test('should not track instant miracles', () => {
      const miracle = { 
        ...miracleSystem.MIRACLES.divineInspiration, 
        name: 'divineInspiration',
        effects: { instantComplete: true } // No duration
      };
      const location = { x: 100, y: 100 };
      
      miracleSystem.castMiracle(mockPlayer, miracle, location);
      
      expect(miracleSystem.activeMiracles.size).toBe(0);
    });

    test('should update active miracles', () => {
      // Add a healing rain miracle
      const miracleId = 'test_miracle';
      const startTime = Date.now() - 6000; // Started 6 seconds ago
      
      miracleSystem.activeMiracles.set(miracleId, {
        id: miracleId,
        name: 'Healing Rain',
        startTime,
        effects: { duration: 5000, tickRate: 500, healing: 50 },
        location: { x: 100, y: 100 },
        radius: 150
      });
      
      // Mock applyAreaEffect to count calls
      let healCount = 0;
      miracleSystem.applyAreaEffect = jest.fn(() => { healCount++; });
      
      miracleSystem.updateMiracles(100, mockGameState);
      
      // Should have been removed (expired)
      expect(miracleSystem.activeMiracles.size).toBe(0);
    });

    test('should get active miracles for rendering', () => {
      const miracle1 = {
        id: 'miracle1',
        name: 'Healing Rain',
        active: true
      };
      const miracle2 = {
        id: 'miracle2',
        name: 'Shield of Faith',
        active: true
      };
      
      miracleSystem.activeMiracles.set('miracle1', miracle1);
      miracleSystem.activeMiracles.set('miracle2', miracle2);
      
      const active = miracleSystem.getActiveMiracles();
      
      expect(active).toHaveLength(2);
      expect(active).toContainEqual(miracle1);
      expect(active).toContainEqual(miracle2);
    });
  });

  describe('Miracle Effects', () => {
    test('should apply healing rain effects', () => {
      const miracle = {
        id: 'test',
        name: 'Healing Rain',
        location: { x: 100, y: 100 },
        radius: 150,
        effects: { healing: 50, tickRate: 500, duration: 5000 },
        startTime: Date.now()
      };
      
      // Mock applyAreaEffect
      miracleSystem.applyAreaEffect = jest.fn((location, radius, fn) => {
        const mockEntity = { type: 'villager', health: 50 };
        fn(mockEntity);
        expect(mockEntity.health).toBe(55); // 50 + (50/10)
      });
      
      miracleSystem.applyMiracleEffects(miracle, mockPlayer);
    });

    test('should apply divine light effects', () => {
      const miracle = {
        name: 'Divine Light',
        location: { x: 100, y: 100 },
        radius: 100,
        effects: { happiness: 20, productivity: 1.5, duration: 10000 }
      };
      
      miracleSystem.applyAreaEffect = jest.fn((location, radius, fn) => {
        const mockVillager = { type: 'villager', happiness: 50 };
        fn(mockVillager);
        expect(mockVillager.happiness).toBe(70);
        expect(mockVillager.divineInspiration).toBeDefined();
        expect(mockVillager.divineInspiration.productivity).toBe(1.5);
      });
      
      miracleSystem.applyMiracleEffects(miracle, mockPlayer);
      expect(miracleSystem.applyAreaEffect).toHaveBeenCalled();
    });

    test('should apply fertile ground effects', () => {
      const miracle = {
        name: 'Fertile Ground',
        location: { x: 100, y: 100 },
        radius: 200,
        effects: { fertility: 2.0, cropGrowth: 3.0, permanent: true }
      };
      
      miracleSystem.modifyTerrain = jest.fn((location, radius, fn) => {
        const mockTile = { fertility: 0.5 };
        fn(mockTile);
        expect(mockTile.fertility).toBe(1.0); // Capped at 1.0
        expect(mockTile.fertileBlessing).toBe(true);
      });
      
      miracleSystem.applyMiracleEffects(miracle, mockPlayer);
      expect(miracleSystem.modifyTerrain).toHaveBeenCalled();
    });

    test('should create visual effects', () => {
      const healingRain = {
        name: 'Healing Rain',
        location: { x: 100, y: 100 },
        radius: 150,
        particleColor: '#4169E1',
        effects: { duration: 5000 }
      };
      
      const effects = miracleSystem.createVisualEffects(healingRain);
      
      expect(effects).toHaveLength(1);
      expect(effects[0].type).toBe('rain');
      expect(effects[0].color).toBe('#4169E1');
      expect(effects[0].duration).toBe(5000);
    });

    test('should create lightning visual effects', () => {
      const lightning = {
        name: 'Lightning Strike',
        location: { x: 100, y: 100 },
        particleColor: '#FF00FF'
      };
      
      const effects = miracleSystem.createVisualEffects(lightning);
      
      expect(effects).toHaveLength(1);
      expect(effects[0].type).toBe('lightning');
      expect(effects[0].start.y).toBe(lightning.location.y - 500);
      expect(effects[0].branches).toBe(5);
    });
  });

  describe('Alignment System', () => {
    test('should increase alignment for good miracles', () => {
      const miracle = miracleSystem.MIRACLES.healingRain;
      
      miracleSystem.updateAlignment(mockPlayer, miracle);
      
      expect(mockPlayer.alignment).toBe(5); // 0 + 5
    });

    test('should decrease alignment for evil miracles', () => {
      const miracle = miracleSystem.MIRACLES.meteorStrike;
      mockPlayer.alignment = 0;
      
      miracleSystem.updateAlignment(mockPlayer, miracle);
      
      expect(mockPlayer.alignment).toBe(-8); // 0 - 8
    });

    test('should cap alignment at -100 and 100', () => {
      const goodMiracle = miracleSystem.MIRACLES.resurrection;
      const evilMiracle = miracleSystem.MIRACLES.meteorStrike;
      
      // Test positive cap
      mockPlayer.alignment = 95;
      miracleSystem.updateAlignment(mockPlayer, goodMiracle);
      expect(mockPlayer.alignment).toBe(100); // Capped
      
      // Test negative cap
      mockPlayer.alignment = -95;
      miracleSystem.updateAlignment(mockPlayer, evilMiracle);
      expect(mockPlayer.alignment).toBe(-100); // Capped
    });

    test('should handle miracles with no alignment shift', () => {
      const neutralMiracle = { name: 'UnknownMiracle' };
      const originalAlignment = mockPlayer.alignment;
      
      miracleSystem.updateAlignment(mockPlayer, neutralMiracle);
      
      expect(mockPlayer.alignment).toBe(originalAlignment);
    });
  });

  describe('Gesture Recognition', () => {
    test('should find miracle by gesture name', () => {
      const miracle = miracleSystem.findMiracleByGesture('circle');
      
      expect(miracle).toBeDefined();
      expect(miracle.name).toBe('Healing Rain'); // The actual name in the system
      expect(miracle.gesture).toBe('circle');
    });

    test('should return null for unknown gesture', () => {
      const miracle = miracleSystem.findMiracleByGesture('unknownGesture');
      
      expect(miracle).toBeNull();
    });

    test('should update preview location during gesture', () => {
      miracleSystem.startCasting(mockPlayer, 0, 0);
      
      // Add enough points to trigger preview location update
      for (let i = 0; i < 15; i++) {
        miracleSystem.updateCasting(i * 10, 0);
      }
      
      expect(miracleSystem.previewLocation).toBeDefined();
      expect(miracleSystem.previewLocation.x).toBe(140); // Last x position
    });
  });

  describe('Preview System', () => {
    test('should get miracle preview info', () => {
      miracleSystem.previewActive = true;
      miracleSystem.previewMiracle = miracleSystem.MIRACLES.healingRain;
      miracleSystem.previewLocation = { x: 100, y: 200 };
      
      const preview = miracleSystem.getMiraclePreview();
      
      expect(preview).toBeDefined();
      expect(preview.name).toBe('Healing Rain');
      expect(preview.description).toContain('Heals all units');
      expect(preview.cost).toBe(20);
      expect(preview.radius).toBe(150);
      expect(preview.location).toEqual({ x: 100, y: 200 });
      expect(preview.color).toBe('#4169E1');
    });

    test('should return null when no preview active', () => {
      miracleSystem.previewActive = false;
      
      const preview = miracleSystem.getMiraclePreview();
      
      expect(preview).toBeNull();
    });
  });

  describe('Integration Tests', () => {
    test('should complete full miracle casting flow', () => {
      // Start with sufficient belief points
      mockPlayer.beliefPoints = 100;
      
      // Start casting
      miracleSystem.startCasting(mockPlayer, 100, 100);
      
      // Draw gesture
      for (let i = 0; i < 20; i++) {
        miracleSystem.updateCasting(100 + i * 5, 100);
      }
      
      // Complete with recognized gesture
      const result = miracleSystem.completeCasting(mockPlayer, { 
        name: 'verticalLine', 
        score: 0.9 
      });
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Divine Light');
      expect(mockPlayer.beliefPoints).toBe(85); // 100 - 15
      expect(miracleSystem.cooldowns.get(mockPlayer.id).divineLight).toBeDefined();
    });

    test('should handle multiple players casting simultaneously', () => {
      const player1 = { id: 'p1', beliefPoints: 100, alignment: 0 };
      const player2 = { id: 'p2', beliefPoints: 100, alignment: 0 };
      
      const miracle = { ...miracleSystem.MIRACLES.healingRain, name: 'healingRain' };
      const location = { x: 100, y: 100 };
      
      // Both players cast
      miracleSystem.castMiracle(player1, miracle, location);
      miracleSystem.castMiracle(player2, miracle, location);
      
      // Check independent cooldowns
      expect(miracleSystem.cooldowns.get('p1').healingRain).toBeDefined();
      expect(miracleSystem.cooldowns.get('p2').healingRain).toBeDefined();
      
      // Check both miracles are active
      expect(miracleSystem.activeMiracles.size).toBe(2);
    });

    test('should handle miracle expiration during update', () => {
      // Add multiple miracles with different durations
      miracleSystem.activeMiracles.set('m1', {
        id: 'm1',
        name: 'Healing Rain',
        startTime: Date.now() - 6000, // Expired
        effects: { duration: 5000 }
      });
      
      miracleSystem.activeMiracles.set('m2', {
        id: 'm2',
        name: 'Shield of Faith',
        startTime: Date.now() - 1000, // Still active
        effects: { duration: 30000 }
      });
      
      miracleSystem.updateMiracles(100, mockGameState);
      
      expect(miracleSystem.activeMiracles.size).toBe(1);
      expect(miracleSystem.activeMiracles.has('m1')).toBe(false);
      expect(miracleSystem.activeMiracles.has('m2')).toBe(true);
    });
  });

  describe('Performance Tests', () => {
    test('should handle many active miracles efficiently', () => {
      // Add 100 active miracles
      for (let i = 0; i < 100; i++) {
        miracleSystem.activeMiracles.set(`miracle_${i}`, {
          id: `miracle_${i}`,
          name: 'Healing Rain',
          startTime: Date.now(),
          effects: { duration: 10000, tickRate: 500 },
          location: { x: i * 10, y: i * 10 },
          radius: 150
        });
      }
      
      const start = performance.now();
      miracleSystem.updateMiracles(100, mockGameState);
      const end = performance.now();
      
      expect(end - start).toBeLessThan(50); // Should complete in under 50ms
    });

    test('should cast miracles quickly', () => {
      const miracle = { ...miracleSystem.MIRACLES.healingRain, name: 'healingRain' };
      const location = { x: 100, y: 100 };
      
      const start = performance.now();
      
      for (let i = 0; i < 100; i++) {
        miracleSystem.castMiracle(mockPlayer, miracle, location);
      }
      
      const end = performance.now();
      const avgTime = (end - start) / 100;
      
      expect(avgTime).toBeLessThan(1); // Average under 1ms per cast
    });
  });

  describe('Edge Cases', () => {
    test('should handle casting without starting position', () => {
      miracleSystem.currentGesture = [];
      miracleSystem.gestureStartPos = null;
      
      miracleSystem.updateCasting(100, 100);
      
      expect(miracleSystem.currentGesture).toEqual([]);
    });

    test('should handle missing miracle effects', () => {
      const miracle = {
        id: 'test',
        name: 'Unknown',
        effects: {},
        location: { x: 0, y: 0 }
      };
      
      expect(() => {
        miracleSystem.applyMiracleEffects(miracle, mockPlayer);
      }).not.toThrow();
    });

    test('should handle invalid player ID for cooldowns', () => {
      const cooldowns = miracleSystem.getCooldowns('nonexistent');
      
      expect(cooldowns).toEqual({});
    });

    test('should handle miracle with drawn radius', () => {
      const miracle = {
        name: 'Shield of Faith',
        location: { x: 100, y: 100 },
        radius: 'drawn',
        effects: { damageReduction: 0.8, duration: 30000 }
      };
      
      miracleSystem.getDrawnBounds = jest.fn(() => ({ 
        x: 50, y: 50, width: 100, height: 100 
      }));
      
      miracleSystem.applyMiracleEffects(miracle, mockPlayer);
      
      expect(miracle.shieldBounds).toBeDefined();
    });
  });
});