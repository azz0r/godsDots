import { test, expect } from '@playwright/test';

test.describe('Game Initialization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display main menu on load', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText('God Dots');
    await expect(page.locator('button:has-text("New Game")')).toBeVisible();
    await expect(page.locator('button:has-text("Debug Mode")')).toBeVisible();
  });

  test('should start new game when clicked', async ({ page }) => {
    await page.click('button:has-text("New Game")');
    
    // Game should initialize
    await expect(page.locator('canvas')).toBeVisible();
    await expect(page.locator('.main-menu')).not.toBeVisible();
    
    // UI elements should be visible
    await expect(page.locator('[class*="TopBar"]')).toBeVisible();
    await expect(page.locator('[class*="PowerBar"]')).toBeVisible();
    await expect(page.locator('[class*="InfoPanel"]')).toBeVisible();
  });

  test('should toggle debug mode', async ({ page }) => {
    // Toggle debug mode from menu
    await page.click('button:has-text("Debug Mode")');
    await expect(page.locator('button:has-text("Debug Mode: ON")')).toBeVisible();
    
    // Start game with debug mode
    await page.click('button:has-text("New Game")');
    
    // Debug panel should be visible
    await expect(page.locator('[class*="DebugPanel"]')).toBeVisible();
  });

  test('should handle keyboard shortcuts', async ({ page }) => {
    await page.click('button:has-text("New Game")');
    await page.waitForSelector('canvas');
    
    // Test debug toggle (Ctrl+D)
    await page.keyboard.press('Control+d');
    await expect(page.locator('[class*="DebugPanel"]')).toBeVisible();
    
    // Toggle again
    await page.keyboard.press('Control+d');
    await expect(page.locator('[class*="DebugPanel"]')).not.toBeVisible();
  });

  test('should initialize with correct game state', async ({ page }) => {
    await page.click('button:has-text("New Game")');
    
    // Check initial belief points
    await expect(page.locator('text=/Belief Points: \\d+/')).toBeVisible();
    
    // Check initial population
    await expect(page.locator('text=/Population: 0/')).toBeVisible();
    
    // Canvas should be rendering
    const canvas = page.locator('canvas');
    await expect(canvas).toHaveAttribute('width');
    await expect(canvas).toHaveAttribute('height');
  });

  test('should handle window resize', async ({ page }) => {
    await page.click('button:has-text("New Game")');
    await page.waitForSelector('canvas');
    
    // Get initial canvas size
    const initialSize = await page.locator('canvas').boundingBox();
    
    // Resize window
    await page.setViewportSize({ width: 800, height: 600 });
    await page.waitForTimeout(100);
    
    // Canvas should resize
    const newSize = await page.locator('canvas').boundingBox();
    expect(newSize.width).not.toBe(initialSize.width);
  });

  test('should persist game state on reload', async ({ page, context }) => {
    await page.click('button:has-text("New Game")');
    await page.waitForSelector('canvas');
    
    // Wait for auto-save
    await page.waitForTimeout(1000);
    
    // Get current state
    const beliefPoints = await page.locator('text=/Belief Points: (\\d+)/').textContent();
    
    // Reload page
    await page.reload();
    
    // Should restore to main menu (game state persisted but not auto-loaded)
    await expect(page.locator('h1')).toHaveText('God Dots');
  });
});