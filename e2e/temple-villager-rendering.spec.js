import { test, expect } from '@playwright/test';

test.describe('Temple and Villager Rendering', () => {
  test.beforeEach(async ({ page }) => {
    // Listen for console messages
    page.on('console', msg => {
      if (msg.text().includes('GameInitializer') ||
          msg.text().includes('TempleSystem') ||
          msg.text().includes('VillagerSystem') ||
          msg.text().includes('PlayerSystem')) {
        console.log(`BROWSER: ${msg.text()}`);
      }
    });

    // Listen for errors
    page.on('pageerror', error => {
      console.error(`PAGE ERROR: ${error.message}`);
    });

    await page.goto('/');
  });

  test('should spawn temples and villagers on game start', async ({ page }) => {
    // Check if we have a main menu or go directly to game
    const hasNewGameButton = await page.locator('button:has-text("New Game")').isVisible().catch(() => false);

    if (hasNewGameButton) {
      await page.click('button:has-text("New Game")');
      await page.waitForSelector('canvas', { timeout: 5000 });
    } else {
      // Game might auto-start
      await page.waitForSelector('canvas', { timeout: 5000 });
    }

    // Wait for game initialization
    await page.waitForTimeout(2000);

    // Take a screenshot to see what's rendered
    await page.screenshot({ path: 'test-results/game-initial-state.png', fullPage: true });

    // Check console for spawn logs
    const logs = [];
    page.on('console', msg => logs.push(msg.text()));

    await page.waitForTimeout(500);

    // Evaluate game state in the browser
    const gameState = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      const game = window.phaserGame; // Changed from window.game

      if (!game || !game.scene) {
        return { error: 'Game not initialized', hasGame: !!game, hasScene: !!game?.scene };
      }

      const scene = game.scene.scenes[0];

      return {
        canvasExists: !!canvas,
        canvasWidth: canvas?.width,
        canvasHeight: canvas?.height,
        sceneKey: scene?.sys?.config?.key,
        templeSystemExists: !!scene?.templeSystem,
        villagerSystemExists: !!scene?.villagerSystem,
        playerSystemExists: !!scene?.playerSystem,
        templeCount: scene?.templeSystem?.temples?.length || 0,
        villagerCount: scene?.villagerSystem?.villagers?.length || 0,
        playerCount: scene?.playerSystem?.players?.length || 0,
        gameStarted: scene?.gameStarted || false,
        cameraX: scene?.cameras?.main?.scrollX,
        cameraY: scene?.cameras?.main?.scrollY,
        cameraZoom: scene?.cameras?.main?.zoom,
        worldWidth: scene?.worldWidth,
        worldHeight: scene?.worldHeight
      };
    });

    console.log('GAME STATE:', JSON.stringify(gameState, null, 2));

    // Assertions
    expect(gameState.canvasExists).toBe(true);
    expect(gameState.templeSystemExists).toBe(true);
    expect(gameState.villagerSystemExists).toBe(true);
    expect(gameState.playerSystemExists).toBe(true);
    expect(gameState.gameStarted).toBe(true);

    // Should have 2 players
    expect(gameState.playerCount).toBe(2);

    // Should have 2 temples (one per player)
    expect(gameState.templeCount).toBe(2);

    // Should have 6 villagers (3 per player)
    expect(gameState.villagerCount).toBe(6);
  });

  test('should check temple positions', async ({ page }) => {
    const hasNewGameButton = await page.locator('button:has-text("New Game")').isVisible().catch(() => false);

    if (hasNewGameButton) {
      await page.click('button:has-text("New Game")');
      await page.waitForSelector('canvas', { timeout: 5000 });
    } else {
      await page.waitForSelector('canvas', { timeout: 5000 });
    }

    await page.waitForTimeout(2000);

    const templeData = await page.evaluate(() => {
      const game = window.phaserGame; // Changed from window.game
      if (!game) return { error: 'No game' };

      const scene = game.scene.scenes[0];
      if (!scene || !scene.templeSystem) return { error: 'No temple system' };

      return {
        temples: scene.templeSystem.temples.map(t => ({
          id: t.id,
          playerId: t.playerId,
          position: t.position,
          color: t.playerColor
        })),
        graphics: {
          exists: !!scene.templeSystem.templesGraphics,
          visible: scene.templeSystem.templesGraphics?.visible,
          depth: scene.templeSystem.templesGraphics?.depth
        }
      };
    });

    console.log('TEMPLE DATA:', JSON.stringify(templeData, null, 2));

    expect(templeData.temples).toHaveLength(2);
    expect(templeData.graphics.exists).toBe(true);
  });

  test('should check villager positions and colors', async ({ page }) => {
    const hasNewGameButton = await page.locator('button:has-text("New Game")').isVisible().catch(() => false);

    if (hasNewGameButton) {
      await page.click('button:has-text("New Game")');
      await page.waitForSelector('canvas', { timeout: 5000 });
    } else {
      await page.waitForSelector('canvas', { timeout: 5000 });
    }

    await page.waitForTimeout(2000);

    const villagerData = await page.evaluate(() => {
      const game = window.phaserGame; // Changed from window.game
      if (!game) return { error: 'No game' };

      const scene = game.scene.scenes[0];
      if (!scene || !scene.villagerSystem) return { error: 'No villager system' };

      return {
        villagers: scene.villagerSystem.villagers.map(v => ({
          id: v.id,
          playerId: v.playerId,
          position: { x: v.x, y: v.y },
          color: v.playerColor
        })),
        graphics: {
          exists: !!scene.villagerSystem.villagersGraphics,
          visible: scene.villagerSystem.villagersGraphics?.visible,
          depth: scene.villagerSystem.villagersGraphics?.depth
        }
      };
    });

    console.log('VILLAGER DATA:', JSON.stringify(villagerData, null, 2));

    expect(villagerData.villagers).toHaveLength(6);
    expect(villagerData.graphics.exists).toBe(true);

    // Check that villagers have different player colors
    const colors = new Set(villagerData.villagers.map(v => v.playerColor));
    expect(colors.size).toBe(2); // Should have 2 different colors (human + AI)
  });
});
