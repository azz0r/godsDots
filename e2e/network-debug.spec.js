import { test, expect } from '@playwright/test';

test('capture failing network request', async ({ page }) => {
  const failedRequests = [];
  const allRequests = [];

  page.on('request', request => {
    allRequests.push({
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType()
    });
  });

  page.on('requestfailed', request => {
    failedRequests.push({
      url: request.url(),
      failure: request.failure()?.errorText || 'Unknown error'
    });
    console.log(`FAILED REQUEST: ${request.url()} - ${request.failure()?.errorText}`);
  });

  try {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForTimeout(2000);
  } catch (e) {
    console.log('Page load error:', e.message);
  }

  console.log('\n=== All Requests ===');
  allRequests.forEach((req, i) => {
    console.log(`${i + 1}. [${req.resourceType}] ${req.method} ${req.url}`);
  });

  console.log('\n=== Failed Requests ===');
  failedRequests.forEach((req, i) => {
    console.log(`${i + 1}. ${req.url}`);
    console.log(`   Error: ${req.failure}`);
  });

  if (failedRequests.length > 0) {
    console.log(`\nTotal failed requests: ${failedRequests.length}`);
  }
});
