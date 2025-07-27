import { test, expect } from '@playwright/test';

test.describe('Gameplay Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("New Game")');
    await page.waitForSelector('canvas');
  });

  test('should place buildings', async ({ page }) => {
    // Select place building power
    await page.click('button:has-text("Build")');
    
    // Click on canvas to place building
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    
    // Belief points should decrease
    const beliefText = await page.locator('text=/Belief Points: (\\d+)/').textContent();
    const beliefPoints = parseInt(beliefText.match(/\d+/)[0]);
    expect(beliefPoints).toBeLessThan(1000);
  });

  test('should spawn villagers', async ({ page }) => {
    // Select spawn villager power
    await page.click('button:has-text("Spawn")');
    
    // Click near temple to spawn
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    await page.mouse.click(box.x + box.width / 2 + 50, box.y + box.height / 2);
    
    // Population should increase
    await expect(page.locator('text=/Population: 1/')).toBeVisible({ timeout: 5000 });
  });

  test('should navigate with camera controls', async ({ page }) => {
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    
    // Pan camera by dragging
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2 + 100);
    await page.mouse.up();
    
    // Camera should have moved (no direct way to test, but ensure no errors)
    await expect(canvas).toBeVisible();
  });

  test('should zoom with mouse wheel', async ({ page }) => {
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    
    // Hover over canvas
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    
    // Zoom in
    await page.mouse.wheel(0, -120);
    await page.waitForTimeout(100);
    
    // Zoom out
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(100);
    
    // Canvas should still be visible
    await expect(canvas).toBeVisible();
  });

  test('should interact with land management', async ({ page }) => {
    // Open land panel
    await page.click('button:has-text("Land")');
    await expect(page.locator('[class*="LandManagementPanel"]')).toBeVisible();
    
    // Should show available plots
    await expect(page.locator('text=/Available Plots:/')).toBeVisible();
    await expect(page.locator('text=/Owned Plots:/')).toBeVisible();
    
    // Close panel
    await page.click('button:has-text("×")');
    await expect(page.locator('[class*="LandManagementPanel"]')).not.toBeVisible();
  });

  test('should save game manually', async ({ page }) => {
    // Click save button
    await page.click('button:has-text("Save")');
    
    // Should show some feedback (console log in this case)
    // In a real app, you'd show a toast or notification
    await page.waitForTimeout(500);
    
    // Game should continue normally
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('should handle world view', async ({ page }) => {
    // Click world view button
    await page.click('button:has-text("World")');
    
    // Should zoom out to show entire map
    await page.waitForTimeout(300);
    
    // Canvas should still be interactive
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
  });

  test('should display hover information', async ({ page }) => {
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    
    // Hover over different parts of the map
    await page.mouse.move(box.x + 100, box.y + 100);
    await page.waitForTimeout(100);
    
    // Should show terrain info in info panel
    const infoPanel = page.locator('[class*="InfoPanel"]');
    await expect(infoPanel).toContainText(/Terrain:/);
  });

  test('should handle rapid actions', async ({ page }) => {
    // Rapidly click different powers
    await page.click('button:has-text("Build")');
    await page.click('button:has-text("Spawn")');
    await page.click('button:has-text("Land")');
    await page.click('button:has-text("Build")');
    
    // Game should remain stable
    await expect(page.locator('canvas')).toBeVisible();
    await expect(page.locator('[class*="PowerBar"]')).toBeVisible();
  });

  test('should update resources over time', async ({ page }) => {
    // Get initial belief points
    const initialText = await page.locator('text=/Belief Points: (\\d+)/').textContent();
    const initialPoints = parseInt(initialText.match(/\d+/)[0]);
    
    // Wait for temple to generate belief
    await page.waitForTimeout(4000);
    
    // Belief points should have increased
    const updatedText = await page.locator('text=/Belief Points: (\\d+)/').textContent();
    const updatedPoints = parseInt(updatedText.match(/\d+/)[0]);
    
    expect(updatedPoints).toBeGreaterThan(initialPoints);
  });
});