import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/?case=focus-manager');
});

test('moves focus into the dialog when it opens', async ({ page }) => {
  await page.getByTestId('reference').click();

  await expect(page.getByTestId('dialog')).toBeVisible();
  await expect(page.getByTestId('cancel')).toBeFocused();
});

test('traps Tab inside the dialog', async ({ page }) => {
  await page.getByTestId('reference').click();
  await expect(page.getByTestId('cancel')).toBeFocused();

  await page.keyboard.press('Tab');
  await expect(page.getByTestId('confirm')).toBeFocused();

  await page.keyboard.press('Tab');
  await expect(page.getByTestId('cancel')).toBeFocused();
});

test('returns focus to the reference when it closes', async ({ page }) => {
  await page.getByTestId('reference').click();
  await expect(page.getByTestId('dialog')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByTestId('dialog')).toHaveCount(0);
  await expect(page.getByTestId('reference')).toBeFocused();
});

test('renders the dialog in a portal outside the app root', async ({ page }) => {
  await page.getByTestId('reference').click();

  const insideRoot = await page
    .getByTestId('dialog')
    .evaluate((element) => document.getElementById('root')?.contains(element) ?? false);

  expect(insideRoot).toBe(false);
});

test('locks scrolling on the body while the overlay is open', async ({ page }) => {
  await page.getByTestId('reference').click();
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');

  await page.keyboard.press('Escape');
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
});
