import { test, expect } from '@playwright/test';

const pages = [
  { name: 'hub', path: '/hub' },
  { name: 'events', path: '/events' },
  { name: 'war-academy', path: '/war-academy' },
  { name: 'comms-console', path: '/comms-console' },
  { name: 'intel-nexus', path: '/intel-nexus' },
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('recentCommands', JSON.stringify(['help-ctrl-k', 'status-online']));
    localStorage.setItem('pinnedCommands', JSON.stringify(['help-ctrl-k']));
  });
});

const disableAnimations = async (page) => {
  await page.addStyleTag({
    content: `*, *::before, *::after {
      animation-duration: 0s !important;
      animation-delay: 0s !important;
      transition-duration: 0s !important;
      transition-delay: 0s !important;
    }`,
  });
};

for (const pageConfig of pages) {
  test(`visual snapshot - ${pageConfig.name}`, async ({ page }) => {
    await page.goto(pageConfig.path, { waitUntil: 'networkidle' });
    await disableAnimations(page);
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot(`${pageConfig.name}.png`, { fullPage: true });
  });
}

test('visual snapshot - command palette', async ({ page }) => {
  await page.goto('/hub', { waitUntil: 'networkidle' });
  await disableAnimations(page);
  await page.waitForTimeout(1000);
  await page.keyboard.press('Control+K');
  await page.waitForTimeout(300);
  await expect(page).toHaveScreenshot('command-palette.png', { fullPage: true });
});
