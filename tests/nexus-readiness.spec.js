import { test, expect } from '@playwright/test';

const VIEWPORTS = [
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
];

const readDeliveryTotal = async (page) => {
  const patterns = [/Queued\s+(\d+)/i, /Persisted\s+(\d+)/i, /Acked\s+(\d+)/i];
  let total = 0;
  for (const pattern of patterns) {
    const texts = await page.getByText(pattern).allTextContents();
    const value = texts
      .map((text) => Number((text.match(pattern) || [])[1] || 0))
      .reduce((max, next) => Math.max(max, next), 0);
    total += value;
  }
  return total;
};

const clickButtonDirect = async (page, namePattern) => {
  const button = page.getByRole('button', { name: namePattern }).first();
  await expect(button).toBeVisible();
  await button.dispatchEvent('click');
};

test('nexus auth entrypoint is reachable', async ({ page }) => {
  const fatal = [];
  page.on('pageerror', (err) => fatal.push(err?.message || String(err)));

  await page.goto('/access-gate', { waitUntil: 'networkidle' });
  await expect(page.getByText(/verify access/i)).toBeVisible();
  expect(fatal.length).toBe(0);
});

test('nexusos comms focus + side controls are actionable', async ({ page }) => {
  const fatal = [];
  page.on('pageerror', (err) => fatal.push(err?.message || String(err)));

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/NexusOSPreview', { waitUntil: 'networkidle' });
  await expect(page.getByText(/NexusOS Command Surface/i)).toBeVisible();

  await page.keyboard.press('Alt+3');
  await expect(page.getByText(/Comms Network Command/i)).toBeVisible();
  await expect(page.getByText(/Text Comms/i).first()).toBeVisible();
  await expect(page.getByText(/Voice Comms/i).first()).toBeVisible();
  await expect(page.getByText(/Global Voice Controls/i)).toBeVisible();
  await expect(page.getByText(/Command Intent/i).first()).toBeVisible();

  await clickButtonDirect(page, /Reroute Net/i);
  await expect.poll(() => readDeliveryTotal(page), { timeout: 10000 }).toBeGreaterThan(0);

  await clickButtonDirect(page, /Mission Threads/i);
  await expect(page.getByRole('button', { name: /Execute Lane Action/i })).toBeVisible();
  await clickButtonDirect(page, /Execute Lane Action/i);
  await expect.poll(() => readDeliveryTotal(page), { timeout: 10000 }).toBeGreaterThan(1);

  expect(fatal.length).toBe(0);
});

for (const viewport of VIEWPORTS) {
  test(`nexusos preview has no page scroll at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/NexusOSPreview', { waitUntil: 'networkidle' });

    const overflow = await page.evaluate(() => {
      const root = document.documentElement;
      const body = document.body;
      const scrollWidth = Math.max(root.scrollWidth, body?.scrollWidth || 0);
      const scrollHeight = Math.max(root.scrollHeight, body?.scrollHeight || 0);
      return {
        x: scrollWidth - root.clientWidth,
        y: scrollHeight - root.clientHeight,
      };
    });

    expect(overflow.x).toBeLessThanOrEqual(4);
    expect(overflow.y).toBeLessThanOrEqual(4);
  });
}
