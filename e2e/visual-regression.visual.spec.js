import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Set a fixed viewport for consistent screenshots
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('main menu screenshot', async ({ page }) => {
    await expect(page).toHaveScreenshot('main-menu.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('game canvas initial state', async ({ page }) => {
    await page.click('button:has-text("New Game")');
    await page.waitForSelector('canvas');
    await page.waitForTimeout(500); // Wait for initial render
    
    await expect(page).toHaveScreenshot('game-initial-state.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('debug panel screenshot', async ({ page }) => {
    await page.click('button:has-text("New Game")');
    await page.waitForSelector('canvas');
    await page.keyboard.press('Control+d');
    await page.waitForSelector('[class*="DebugPanel"]');
    
    await expect(page.locator('[class*="DebugPanel"]')).toHaveScreenshot('debug-panel.png');
  });

  test('power bar states', async ({ page }) => {
    await page.click('button:has-text("New Game")');
    await page.waitForSelector('canvas');
    
    // Screenshot default state
    await expect(page.locator('[class*="PowerBar"]')).toHaveScreenshot('power-bar-default.png');
    
    // Click a power
    await page.click('[class*="PowerBar"] button:first-child');
    await expect(page.locator('[class*="PowerBar"]')).toHaveScreenshot('power-bar-selected.png');
  });

  test('land management panel', async ({ page }) => {
    await page.click('button:has-text("New Game")');
    await page.waitForSelector('canvas');
    
    // Open land management
    await page.click('button:has-text("Land")');
    await page.waitForSelector('[class*="LandManagementPanel"]');
    
    await expect(page.locator('[class*="LandManagementPanel"]')).toHaveScreenshot('land-panel.png');
  });

  test('game with terrain rendering', async ({ page }) => {
    await page.click('button:has-text("New Game")');
    await page.waitForSelector('canvas');
    await page.waitForTimeout(1000); // Wait for terrain generation
    
    // Take screenshot of just the canvas
    const canvas = page.locator('canvas');
    await expect(canvas).toHaveScreenshot('terrain-render.png', {
      animations: 'disabled',
      // Mask dynamic elements
      mask: [page.locator('[class*="InfoPanel"]')],
      maxDiffPixelRatio: 0.1 // Allow 10% difference for terrain variation
    });
  });

  test('zoom levels', async ({ page }) => {
    await page.click('button:has-text("New Game")');
    await page.waitForSelector('canvas');
    await page.waitForTimeout(500);
    
    const canvas = page.locator('canvas');
    
    // Default zoom
    await expect(canvas).toHaveScreenshot('zoom-1x.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.1
    });
    
    // Zoom in
    await canvas.hover();
    await page.mouse.wheel(0, -240); // Zoom in 2x
    await page.waitForTimeout(100);
    await expect(canvas).toHaveScreenshot('zoom-2x.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.1
    });
    
    // Zoom out to world view
    await page.click('button:has-text("World")');
    await page.waitForTimeout(100);
    await expect(canvas).toHaveScreenshot('zoom-world.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.1
    });
  });

  test('responsive layout', async ({ page }) => {
    await page.click('button:has-text("New Game")');
    await page.waitForSelector('canvas');
    
    // Desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(100);
    await expect(page).toHaveScreenshot('layout-desktop.png', {
      fullPage: true,
      animations: 'disabled'
    });
    
    // Tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(100);
    await expect(page).toHaveScreenshot('layout-tablet.png', {
      fullPage: true,
      animations: 'disabled'
    });
    
    // Mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(100);
    await expect(page).toHaveScreenshot('layout-mobile.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });
});