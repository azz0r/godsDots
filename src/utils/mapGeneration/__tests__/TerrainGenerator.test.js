import { TerrainGenerator } from '../TerrainGenerator';

describe('TerrainGenerator', () => {
  let generator;

  beforeEach(() => {
    generator = new TerrainGenerator(50, 50, 12345); // Fixed seed for consistent tests
  });

  describe('terrain generation', () => {
    it('should generate terrain within bounds', () => {
      const terrain = generator.generate();
      
      expect(terrain).toHaveLength(50);
      expect(terrain[0]).toHaveLength(50);
      
      // All cells should have valid terrain types
      const validTypes = [
        'deep_water', 'water', 'sand', 'grass', 'forest', 'hills',
        'mountains', 'snow', 'desert', 'savanna', 'jungle', 'tundra',
        'taiga', 'snowy_forest', 'rocky_hills', 'tropical_forest'
      ];
      
      terrain.forEach(row => {
        row.forEach(cell => {
          expect(validTypes).toContain(cell.type);
          expect(cell.elevation).toBeGreaterThanOrEqual(0);
          expect(cell.elevation).toBeLessThanOrEqual(1);
          expect(cell.moisture).toBeGreaterThanOrEqual(0);
          expect(cell.moisture).toBeLessThanOrEqual(1);
          expect(cell.temperature).toBeGreaterThanOrEqual(0);
          expect(cell.temperature).toBeLessThanOrEqual(1);
        });
      });
    });

    it('should create island-like terrain with water edges', () => {
      const terrain = generator.generate();
      
      // Check edges have more water
      let edgeWaterCount = 0;
      let centerWaterCount = 0;
      
      // Count water on edges
      for (let x = 0; x < 50; x++) {
        if (terrain[0][x].type.includes('water')) edgeWaterCount++;
        if (terrain[49][x].type.includes('water')) edgeWaterCount++;
      }
      for (let y = 1; y < 49; y++) {
        if (terrain[y][0].type.includes('water')) edgeWaterCount++;
        if (terrain[y][49].type.includes('water')) edgeWaterCount++;
      }
      
      // Count water in center area
      for (let y = 20; y < 30; y++) {
        for (let x = 20; x < 30; x++) {
          if (terrain[y][x].type.includes('water')) centerWaterCount++;
        }
      }
      
      // Edges should have proportionally more water
      const edgeTotal = 196; // Perimeter cells
      const centerTotal = 100; // 10x10 center area
      
      expect(edgeWaterCount / edgeTotal).toBeGreaterThan(centerWaterCount / centerTotal);
    });

    it('should generate consistent terrain with same seed', () => {
      const terrain1 = generator.generate();
      
      // Create new generator with same seed
      const generator2 = new TerrainGenerator(50, 50, 12345);
      const terrain2 = generator2.generate();
      
      // Terrains should be identical
      for (let y = 0; y < 50; y++) {
        for (let x = 0; x < 50; x++) {
          expect(terrain1[y][x].type).toBe(terrain2[y][x].type);
          expect(terrain1[y][x].elevation).toBeCloseTo(terrain2[y][x].elevation, 10);
        }
      }
    });

    it('should generate different terrain with different seeds', () => {
      const terrain1 = generator.generate();
      
      const generator2 = new TerrainGenerator(50, 50, 54321);
      const terrain2 = generator2.generate();
      
      // Count differences
      let differences = 0;
      for (let y = 0; y < 50; y++) {
        for (let x = 0; x < 50; x++) {
          if (terrain1[y][x].type !== terrain2[y][x].type) {
            differences++;
          }
        }
      }
      
      // Should have significant differences
      expect(differences).toBeGreaterThan(500); // At least 20% different
    });
  });

  describe('biome distribution', () => {
    it('should generate appropriate biomes based on elevation and climate', () => {
      const terrain = generator.generate();
      const biomeCount = {};
      
      terrain.forEach(row => {
        row.forEach(cell => {
          biomeCount[cell.type] = (biomeCount[cell.type] || 0) + 1;
        });
      });
      
      // Should have variety of biomes
      expect(Object.keys(biomeCount).length).toBeGreaterThan(5);
      
      // No single biome should dominate too much
      Object.values(biomeCount).forEach(count => {
        expect(count / 2500).toBeLessThan(0.5); // No biome > 50%
      });
    });

    it('should place biomes logically based on conditions', () => {
      const terrain = generator.generate();
      
      terrain.forEach(row => {
        row.forEach(cell => {
          // Water at low elevations
          if (cell.type === 'deep_water' || cell.type === 'water') {
            expect(cell.elevation).toBeLessThan(0.4);
          }
          
          // Mountains at high elevations
          if (cell.type === 'mountains' || cell.type === 'snow') {
            expect(cell.elevation).toBeGreaterThan(0.6);
          }
          
          // Desert in hot, dry areas
          if (cell.type === 'desert') {
            expect(cell.temperature).toBeGreaterThan(0.6);
            expect(cell.moisture).toBeLessThan(0.3);
          }
          
          // Jungle in hot, wet areas
          if (cell.type === 'jungle' || cell.type === 'tropical_forest') {
            expect(cell.temperature).toBeGreaterThan(0.6);
            expect(cell.moisture).toBeGreaterThan(0.6);
          }
          
          // Tundra in cold areas
          if (cell.type === 'tundra') {
            expect(cell.temperature).toBeLessThan(0.3);
          }
        });
      });
    });
  });

  describe('river generation', () => {
    it('should generate rivers that flow from high to low elevation', () => {
      const terrain = generator.generate();
      
      // Find river cells
      const riverCells = [];
      terrain.forEach((row, y) => {
        row.forEach((cell, x) => {
          if (cell.hasRiver) {
            riverCells.push({ x, y, elevation: cell.elevation });
          }
        });
      });
      
      if (riverCells.length > 0) {
        // Rivers should exist
        expect(riverCells.length).toBeGreaterThan(5);
        
        // Check that rivers generally flow downhill
        // (Some uphill movement is ok due to pathfinding constraints)
        let downhillCount = 0;
        for (let i = 1; i < riverCells.length; i++) {
          if (riverCells[i].elevation <= riverCells[i-1].elevation) {
            downhillCount++;
          }
        }
        
        expect(downhillCount / riverCells.length).toBeGreaterThan(0.6);
      }
    });
  });

  describe('performance', () => {
    it('should generate large maps efficiently', () => {
      const largeGenerator = new TerrainGenerator(200, 200, 12345);
      
      const startTime = performance.now();
      const terrain = largeGenerator.generate();
      const endTime = performance.now();
      
      expect(terrain).toHaveLength(200);
      expect(terrain[0]).toHaveLength(200);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
    });
  });
});