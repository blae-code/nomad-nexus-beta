import { test, expect } from '@playwright/test';

test('debug access gate', async ({ page }) => {
  await page.goto('/access-gate');
  await page.screenshot({ path: 'test-results/debug-access-gate.png', fullPage: true });
});
