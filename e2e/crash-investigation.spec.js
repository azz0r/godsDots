import { test, expect } from '@playwright/test';

test.describe('Crash Investigation', () => {
  test('should capture crash details', async ({ page, browser }) => {
    const consoleMessages = [];
    const errors = [];
    const pageerrors = [];

    page.on('console', msg => {
      const text = `[${msg.type()}] ${msg.text()}`;
      consoleMessages.push(text);
      console.log(text);
    });

    page.on('pageerror', error => {
      const errorMsg = `PAGE ERROR: ${error.message}\nStack: ${error.stack}`;
      pageerrors.push(errorMsg);
      console.error(errorMsg);
    });

    page.on('crash', () => {
      console.error('!!! PAGE CRASHED !!!');
    });

    try {
      console.log('=== Starting page load ===');
      await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 });
      console.log('=== DOM loaded ===');

      await page.waitForTimeout(5000);
      console.log('=== Waited 5 seconds ===');

      // Try to get game state
      const gameState = await page.evaluate(() => {
        try {
          return {
            hasWindow: typeof window !== 'undefined',
            hasGame: typeof window.phaserGame !== 'undefined',
            gameType: typeof window.phaserGame,
            canvas: !!document.querySelector('canvas')
          };
        } catch (e) {
          return { error: e.message };
        }
      });

      console.log('Game State:', JSON.stringify(gameState, null, 2));

    } catch (error) {
      console.error('Test Error:', error.message);
      console.log('\n=== Console Messages ===');
      consoleMessages.forEach(msg => console.log(msg));

      console.log('\n=== Page Errors ===');
      pageerrors.forEach(err => console.log(err));

      throw error;
    }
  });
});
