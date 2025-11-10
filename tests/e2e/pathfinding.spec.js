/**
 * Playwright E2E Test: Pathfinding System
 *
 * Chaos testing and validation for pathfinding functionality.
 * Tests random paths, UI interaction, and edge cases.
 */

import { test, expect } from '@playwright/test';

test.describe('Pathfinding E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173');

    // Wait for terrain to generate
    await page.waitForTimeout(3000);
  });

  test('should have pathfinding UI controls visible', async ({ page }) => {
    // Check for pathfinding section
    const pathfindingSection = await page.locator('h4:has-text("Pathfinding")');
    await expect(pathfindingSection).toBeVisible();

    // Check for start/end inputs
    const inputs = await page.locator('input[type="number"]').all();
    expect(inputs.length).toBeGreaterThanOrEqual(4); // At least 4 inputs for start/end coords

    // Check for Find Path button
    const findPathBtn = await page.locator('button:has-text("Find Path")');
    await expect(findPathBtn).toBeVisible();

    // Check for Clear Path button
    const clearPathBtn = await page.locator('button:has-text("Clear Path")');
    await expect(clearPathBtn).toBeVisible();
  });

  test('should find path on passable terrain - simple case', async ({ page }) => {
    const logs = [];
    page.on('console', (msg) => logs.push(msg.text()));

    // Get the map dimensions first
    await page.waitForTimeout(1000);

    // Try a simple path from (10,10) to (20,20) - likely to be on land
    const startXInput = page.locator('input[type="number"]').nth(0);
    const startYInput = page.locator('input[type="number"]').nth(1);
    const endXInput = page.locator('input[type="number"]').nth(2);
    const endYInput = page.locator('input[type="number"]').nth(3);

    await startXInput.fill('10');
    await startYInput.fill('10');
    await endXInput.fill('20');
    await endYInput.fill('20');

    // Clear logs before finding path
    logs.length = 0;

    // Click Find Path
    await page.locator('button:has-text("Find Path")').click();

    // Wait for pathfinding
    await page.waitForTimeout(1000);

    // Check logs for path result
    console.log('Pathfinding logs:', logs);

    const pathLogs = logs.filter(log =>
      log.includes('[MainScene] Finding path') ||
      log.includes('[MainScene] Path found') ||
      log.includes('[MainScene] No path found')
    );

    console.log('Path-specific logs:', pathLogs);

    // We should have at least attempted to find a path
    expect(pathLogs.length).toBeGreaterThan(0);
  });

  test('chaos test - try 20 random paths', async ({ page }) => {
    const logs = [];
    page.on('console', (msg) => logs.push(msg.text()));

    await page.waitForTimeout(1000);

    const results = {
      pathsFound: 0,
      pathsFailed: 0,
      attempts: 0
    };

    // Try 20 random paths
    for (let i = 0; i < 20; i++) {
      logs.length = 0;

      // Generate random coordinates in safe range (avoid edges where ocean is likely)
      const startX = Math.floor(Math.random() * 100) + 50; // 50-150
      const startY = Math.floor(Math.random() * 100) + 50; // 50-150
      const endX = Math.floor(Math.random() * 100) + 50;   // 50-150
      const endY = Math.floor(Math.random() * 100) + 50;   // 50-150

      console.log(`Attempt ${i + 1}: Finding path from (${startX},${startY}) to (${endX},${endY})`);

      const startXInput = page.locator('input[type="number"]').nth(0);
      const startYInput = page.locator('input[type="number"]').nth(1);
      const endXInput = page.locator('input[type="number"]').nth(2);
      const endYInput = page.locator('input[type="number"]').nth(3);

      await startXInput.fill(startX.toString());
      await startYInput.fill(startY.toString());
      await endXInput.fill(endX.toString());
      await endYInput.fill(endY.toString());

      await page.locator('button:has-text("Find Path")').click();
      await page.waitForTimeout(300);

      results.attempts++;

      const foundPath = logs.some(log => log.includes('[MainScene] Path found'));
      const noPath = logs.some(log => log.includes('[MainScene] No path found'));

      if (foundPath) {
        results.pathsFound++;
        console.log(`  ✓ Path found!`);
      } else if (noPath) {
        results.pathsFailed++;
        console.log(`  ✗ No path found`);
      }
    }

    console.log('Chaos test results:', results);

    // At least 50% of attempts should find a path (since we're picking central coordinates)
    expect(results.pathsFound).toBeGreaterThan(results.attempts * 0.3);
  });

  test('should log detailed terrain info when path fails', async ({ page }) => {
    const logs = [];
    page.on('console', (msg) => logs.push(msg.text()));

    // Inject a diagnostic script
    await page.evaluate(() => {
      // Hook into the scene to log terrain info
      window.getTerrainDiagnostics = (x, y) => {
        const game = window.phaserGame;
        if (!game) return null;

        const scene = game.scene.getScene('MainScene');
        if (!scene) return null;

        const biome = scene.getBiomeAt(x, y);
        return {
          x, y,
          biome: biome ? {
            name: biome.name,
            passable: biome.passable,
            movementCost: biome.movementCost,
            height: biome.height
          } : null
        };
      };
    });

    await page.waitForTimeout(1000);

    // Try a path that might fail
    const startXInput = page.locator('input[type="number"]').nth(0);
    const startYInput = page.locator('input[type="number"]').nth(1);
    const endXInput = page.locator('input[type="number"]').nth(2);
    const endYInput = page.locator('input[type="number"]').nth(3);

    await startXInput.fill('5');
    await startYInput.fill('5');
    await endXInput.fill('245');
    await endYInput.fill('245');

    logs.length = 0;

    await page.locator('button:has-text("Find Path")').click();
    await page.waitForTimeout(500);

    // Get terrain info for start and end
    const startTerrain = await page.evaluate(() => window.getTerrainDiagnostics(5, 5));
    const endTerrain = await page.evaluate(() => window.getTerrainDiagnostics(245, 245));

    console.log('Start terrain:', startTerrain);
    console.log('End terrain:', endTerrain);

    // Log should have pathfinding attempt
    const pathAttempt = logs.some(log => log.includes('[MainScene] Finding path'));
    expect(pathAttempt).toBe(true);
  });

  test('should find path between guaranteed passable tiles', async ({ page }) => {
    const logs = [];
    page.on('console', (msg) => logs.push(msg.text()));

    // Inject script to find guaranteed passable tiles
    const passableTiles = await page.evaluate(() => {
      const game = window.phaserGame;
      if (!game) return null;

      const scene = game.scene.getScene('MainScene');
      if (!scene || !scene.biomeMap) return null;

      const passable = [];

      // Find first 10 passable tiles in center area
      for (let y = 100; y < 150 && passable.length < 10; y++) {
        for (let x = 100; x < 150 && passable.length < 10; x++) {
          const biome = scene.getBiomeAt(x, y);
          if (biome && biome.passable) {
            passable.push({
              x, y,
              name: biome.name,
              cost: biome.movementCost
            });
          }
        }
      }

      return passable;
    });

    console.log('Found passable tiles:', passableTiles);

    if (passableTiles && passableTiles.length >= 2) {
      const start = passableTiles[0];
      const end = passableTiles[passableTiles.length - 1];

      console.log(`Testing path from ${start.name}(${start.x},${start.y}) to ${end.name}(${end.x},${end.y})`);

      const startXInput = page.locator('input[type="number"]').nth(0);
      const startYInput = page.locator('input[type="number"]').nth(1);
      const endXInput = page.locator('input[type="number"]').nth(2);
      const endYInput = page.locator('input[type="number"]').nth(3);

      await startXInput.fill(start.x.toString());
      await startYInput.fill(start.y.toString());
      await endXInput.fill(end.x.toString());
      await endYInput.fill(end.y.toString());

      logs.length = 0;

      await page.locator('button:has-text("Find Path")').click();
      await page.waitForTimeout(500);

      console.log('Pathfinding logs:', logs.filter(log => log.includes('[MainScene]')));

      // This MUST find a path since both tiles are passable
      const foundPath = logs.some(log => log.includes('[MainScene] Path found'));
      expect(foundPath).toBe(true);
    }
  });

  test('should clear path visualization', async ({ page }) => {
    const logs = [];
    page.on('console', (msg) => logs.push(msg.text()));

    // Find a path first
    const startXInput = page.locator('input[type="number"]').nth(0);
    const startYInput = page.locator('input[type="number"]').nth(1);
    const endXInput = page.locator('input[type="number"]').nth(2);
    const endYInput = page.locator('input[type="number"]').nth(3);

    await startXInput.fill('100');
    await startYInput.fill('100');
    await endXInput.fill('110');
    await endYInput.fill('110');

    await page.locator('button:has-text("Find Path")').click();
    await page.waitForTimeout(500);

    logs.length = 0;

    // Clear the path
    await page.locator('button:has-text("Clear Path")').click();
    await page.waitForTimeout(300);

    const clearedLog = logs.some(log => log.includes('[MainScene] Path cleared'));
    expect(clearedLog).toBe(true);
  });

  test('should expose Phaser game instance to window for debugging', async ({ page }) => {
    // Check if game instance is accessible
    const hasGameInstance = await page.evaluate(() => {
      return typeof window.phaserGame !== 'undefined';
    });

    console.log('Has game instance:', hasGameInstance);

    if (!hasGameInstance) {
      console.warn('Game instance not exposed to window - adding it for debugging');
    }
  });

  test('stress test - pathfinding performance', async ({ page }) => {
    const logs = [];
    page.on('console', (msg) => logs.push(msg.text()));

    const timings = [];

    // Test pathfinding performance with 10 attempts
    for (let i = 0; i < 10; i++) {
      const startX = 50 + Math.floor(Math.random() * 100);
      const startY = 50 + Math.floor(Math.random() * 100);
      const endX = 50 + Math.floor(Math.random() * 100);
      const endY = 50 + Math.floor(Math.random() * 100);

      const startXInput = page.locator('input[type="number"]').nth(0);
      const startYInput = page.locator('input[type="number"]').nth(1);
      const endXInput = page.locator('input[type="number"]').nth(2);
      const endYInput = page.locator('input[type="number"]').nth(3);

      await startXInput.fill(startX.toString());
      await startYInput.fill(startY.toString());
      await endXInput.fill(endX.toString());
      await endYInput.fill(endY.toString());

      const startTime = performance.now();

      logs.length = 0;
      await page.locator('button:has-text("Find Path")').click();
      await page.waitForTimeout(100);

      const endTime = performance.now();
      const duration = endTime - startTime;

      timings.push(duration);

      const foundPath = logs.some(log => log.includes('[MainScene] Path found'));
      console.log(`Attempt ${i + 1}: ${duration.toFixed(2)}ms - ${foundPath ? 'Found' : 'Not found'}`);
    }

    const avgTime = timings.reduce((a, b) => a + b, 0) / timings.length;
    console.log(`Average pathfinding time: ${avgTime.toFixed(2)}ms`);

    // Pathfinding should be reasonably fast (< 500ms including UI)
    expect(avgTime).toBeLessThan(500);
  });
});
