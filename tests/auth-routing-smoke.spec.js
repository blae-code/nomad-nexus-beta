import { test, expect } from '@playwright/test';

const looksLikeAccessGate = async (page) => {
  const verify = page.getByText(/verify access/i);
  if (await verify.count()) return true;
  const marker = page.locator('#nn-ready');
  if (await marker.count()) return true;
  const redirecting = page.getByText(/redirecting to authentication/i);
  if (await redirecting.count()) return true;
  return false;
};

const resolvesProtectedRoute = async (page, headingRegex) => {
  const headingCount = await page.getByText(headingRegex).count();
  if (headingCount > 0) return true;
  if (await looksLikeAccessGate(page)) return true;
  const path = page.url().toLowerCase();
  if (path.includes('/accessgate') || path.includes('/access-gate')) return true;
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
  await expect
    .poll(() => resolvesProtectedRoute(page, /comms/i), { timeout: 8000 })
    .toBe(true);

  await page.goto('/events', { waitUntil: 'networkidle' });
  await expect
    .poll(() => resolvesProtectedRoute(page, /events|operation/i), { timeout: 8000 })
    .toBe(true);

  expect(fatal.length).toBe(0);
});
