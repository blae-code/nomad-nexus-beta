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
  await expect(page.getByText(/^NexusOS$/i).first()).toBeVisible();
  await expect(page.getByText(/Command Surface/i).first()).toBeVisible();

  await page.keyboard.press('Alt+3');
  await expect(page.getByText(/Comms Network Cards/i)).toBeVisible();
  await expect(page.getByText(/^Squad Cards$/i).first()).toBeVisible();
  await expect(page.locator('[data-comms-command-bar=\"true\"]').first()).toBeVisible();
  await expect(page.locator('[data-comms-template-select=\"true\"]').first()).toBeVisible();
  await expect(page.locator('[data-comms-ttl-select=\"true\"]').first()).toBeVisible();
  await expect(page.getByText(/Text Comms/i).first()).toBeVisible();
  await expect(page.getByText(/Voice Comms/i).first()).toBeVisible();
  await expect(page.getByText(/Global Voice Controls/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /Fleet/i }).first()).toBeVisible();

  await clickButtonDirect(page, /Fleet/i);
  const schemaButton = page.getByRole('button', { name: /Schema/i }).first();
  const hasSchemaButton = await schemaButton.isVisible().catch(() => false);
  if (hasSchemaButton) {
    await schemaButton.dispatchEvent('click');
    await expect(page.getByText(/REDSCAR Fleet/i)).toBeVisible();
  }

  const firstSquadCard = page.locator('[data-comms-squad-card=\"true\"]').first();
  await expect(firstSquadCard).toBeVisible();
  await firstSquadCard.getByRole('button').first().dispatchEvent('click');
  await clickButtonDirect(page, /Hail Squad/i);
  await firstSquadCard.locator('button').nth(5).dispatchEvent('click');
  await expect(page.locator('[data-comms-watchlist-pinboard=\"true\"]').first()).toBeVisible();
  const cards = page.locator('[data-comms-squad-card=\"true\"]');
  await cards.nth(0).getByRole('button', { name: /^Bridge$/i }).dispatchEvent('click');
  await cards.nth(1).getByRole('button', { name: /^Bridge$/i }).dispatchEvent('click');

  await page.evaluate(() => {
    window.prompt = () => 'Briefing Template A';
  });
  await clickButtonDirect(page, /^Save$/i);
  const templateSelect = page.locator('[data-comms-template-select=\"true\"]').first();
  const templateValue = await templateSelect.locator('option').nth(1).getAttribute('value');
  await templateSelect.selectOption(String(templateValue || ''));
  await clickButtonDirect(page, /^Apply$/i);

  await page.locator('[data-comms-ttl-select=\"true\"]').first().selectOption('120');
  await clickButtonDirect(page, /Bridge Selected/i);

  await page.evaluate(() => {
    const originalNow = Date.now.bind(Date);
    if (!window.__nexusNowPatched) {
      window.__nexusNowOffset = 0;
      Date.now = () => originalNow() + window.__nexusNowOffset;
      window.__nexusNowPatched = true;
    }
    window.__nexusNowOffset += 190000;
  });
  await clickButtonDirect(page, /Refresh/i);
  await expect(page.locator('[data-comms-split-suggested=\"true\"]').first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Escalate to/i }).first()).toBeVisible();

  await page.evaluate(() => {
    window.confirm = () => true;
  });
  await clickButtonDirect(page, /^Delete$/i);

  await page.keyboard.press('Alt+2');
  await expect(page.getByText(/Operation Focus/i).first()).toBeVisible();
  const opsCommsTab = page.locator('main').getByRole('button', { name: /^COMMS$/i }).first();
  const hasCommsTab = await opsCommsTab.isVisible().catch(() => false);
  if (hasCommsTab) {
    await expect(opsCommsTab).toBeVisible();
    await opsCommsTab.dispatchEvent('click');
    await expect(page.getByText(/Operational Comms Control/i)).toBeVisible();
    await expect(page.getByText(/Net Control/i).first()).toBeVisible();
    await expect(page.getByText(/Orders Feed/i).first()).toBeVisible();
    await expect.poll(() => readDeliveryTotal(page), { timeout: 10000 }).toBeGreaterThan(0);
  } else {
    await expect(page.getByText(/No operation available|Operation context required/i).first()).toBeVisible();
  }

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
