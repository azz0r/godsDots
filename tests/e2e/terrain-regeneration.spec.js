/**
 * Playwright E2E Test: Terrain Regeneration
 *
 * Tests the terrain generation and regeneration functionality in the browser.
 * This catches issues that unit tests can't, like React ref timing and console errors.
 */

import { test, expect } from '@playwright/test';

test.describe('Terrain Generation E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173');
  });

  test('should load without console errors', async ({ page }) => {
    const errors = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait for terrain to generate
    await page.waitForTimeout(3000);

    // Check for errors (excluding known warnings)
    const criticalErrors = errors.filter(error =>
      !error.includes('Warning:') &&
      !error.includes('deprecated')
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test('should generate initial terrain on load', async ({ page }) => {
    const logs = [];

    page.on('console', (msg) => {
      logs.push(msg.text());
    });

    // Wait for terrain generation
    await page.waitForTimeout(3000);

    // Check for terrain generation logs
    const terrainLogs = logs.filter(log =>
      log.includes('[MainScene] ✓ Terrain generation complete!')
    );

    expect(terrainLogs.length).toBeGreaterThan(0);
  });

  test('should have dev panel visible', async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(2000);

    // Check for dev panel
    const devPanel = await page.locator('.terrain-dev-panel');
    await expect(devPanel).toBeVisible();
  });

  test('regenerate button should work', async ({ page }) => {
    const logs = [];

    page.on('console', (msg) => {
      logs.push(msg.text());
    });

    // Wait for initial terrain
    await page.waitForTimeout(3000);

    // Clear logs
    logs.length = 0;

    // Click regenerate button
    const regenerateBtn = await page.locator('button:has-text("Regenerate Terrain")');
    await regenerateBtn.click();

    // Wait for regeneration
    await page.waitForTimeout(2000);

    // Check that regeneration happened
    const regenerationLogs = logs.filter(log =>
      log.includes('[MainScene] regenerateTerrain() called')
    );

    expect(regenerationLogs.length).toBeGreaterThan(0);

    // Check that new terrain was generated
    const completeLogs = logs.filter(log =>
      log.includes('[MainScene] ✓ Terrain generation complete!')
    );

    expect(completeLogs.length).toBeGreaterThan(0);

    // Ensure no errors during regeneration
    const errors = logs.filter(log =>
      log.includes('[TerrainDevPanel] No game instance available!')
    );

    expect(errors).toHaveLength(0);
  });

  test('seed input should generate new terrain', async ({ page }) => {
    const logs = [];

    page.on('console', (msg) => {
      logs.push(msg.text());
    });

    // Wait for initial terrain
    await page.waitForTimeout(3000);

    // Clear logs
    logs.length = 0;

    // Find seed input
    const seedInput = await page.locator('input#seed-input');

    // Enter custom seed
    await seedInput.fill('12345');
    await seedInput.blur();

    // Wait for generation
    await page.waitForTimeout(2000);

    // Check that terrain was generated with seed
    const seedLogs = logs.filter(log =>
      log.includes('generateTerrain() called with seed: 12345')
    );

    expect(seedLogs.length).toBeGreaterThan(0);
  });

  test('should display biome legend', async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(2000);

    // Check for biome legend
    const biomeLegend = await page.locator('.biome-legend');
    await expect(biomeLegend).toBeVisible();

    // Check for at least 5 biomes
    const biomeItems = await page.locator('.biome-item').count();
    expect(biomeItems).toBeGreaterThanOrEqual(5);
  });

  test('should display correct map stats', async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(2000);

    // Check stats section
    const statsSection = await page.locator('.stats-section');
    await expect(statsSection).toBeVisible();

    // Check that map size is displayed
    const mapSizeStat = await page.locator('.stat-item:has-text("Map Size")');
    await expect(mapSizeStat).toBeVisible();

    const statText = await mapSizeStat.textContent();
    expect(statText).toMatch(/\d+ × \d+ tiles/);
  });
});
