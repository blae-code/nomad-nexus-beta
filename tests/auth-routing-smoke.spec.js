import { test, expect } from '@playwright/test';

const looksLikeAccessGate = async (page) => {
  const verify = page.getByText(/verify access/i);
  if (await verify.count()) return true;
  const marker = page.locator('#nn-ready');
  if (await marker.count()) return true;
  return false;
};

test('access gate renders for unauthenticated session', async ({ page }) => {
  await page.goto('/access-gate', { waitUntil: 'networkidle' });
  await expect(page.getByText(/verify access/i)).toBeVisible();
});

test('onboarding route guards back to access gate when unauthenticated', async ({ page }) => {
  await page.goto('/onboarding', { waitUntil: 'networkidle' });
  const isGate = await looksLikeAccessGate(page);
  expect(isGate).toBe(true);
});

test('protected comms/events routes load without fatal routing errors', async ({ page }) => {
  const fatal = [];
  page.on('pageerror', (err) => fatal.push(err?.message || String(err)));

  await page.goto('/comms-console', { waitUntil: 'networkidle' });
  const commsGate = await looksLikeAccessGate(page);
  const commsHeading = await page.getByText(/comms/i).count();
  expect(commsGate || commsHeading > 0).toBe(true);

  await page.goto('/events', { waitUntil: 'networkidle' });
  const eventsGate = await looksLikeAccessGate(page);
  const eventsHeading = await page.getByText(/events|operation/i).count();
  expect(eventsGate || eventsHeading > 0).toBe(true);

  expect(fatal.length).toBe(0);
});
