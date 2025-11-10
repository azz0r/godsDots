import { test, expect } from '@playwright/test';

test.describe('Page Load Debug', () => {
  test('should load without crashing', async ({ page }) => {
    const consoleMessages = [];
    const errors = [];

    page.on('console', msg => {
      consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
    });

    page.on('pageerror', error => {
      errors.push(error.message);
      console.error('PAGE ERROR:', error.message);
      console.error(error.stack);
    });

    try {
      await page.goto('/', { waitUntil: 'networkidle', timeout: 30000 });
      console.log('✓ Page loaded successfully');

      // Wait a bit for game initialization
      await page.waitForTimeout(3000);

      // Print all console messages
      console.log('\n=== CONSOLE MESSAGES ===');
      consoleMessages.forEach(msg => console.log(msg));

      // Print any errors
      if (errors.length > 0) {
        console.log('\n=== ERRORS ===');
        errors.forEach(err => console.log(err));
      }

      // Take a screenshot
      await page.screenshot({ path: 'test-results/page-load.png', fullPage: true });

      expect(errors.length).toBe(0);
    } catch (error) {
      console.error('FAILED TO LOAD:', error.message);
      console.log('\n=== CONSOLE MESSAGES BEFORE CRASH ===');
      consoleMessages.forEach(msg => console.log(msg));
      throw error;
    }
  });
});
