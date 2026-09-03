import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/?case=hover');
});

test('opens after the open delay and closes when the pointer leaves', async ({ page }) => {
  await page.getByTestId('reference').hover();
  await expect(page.getByTestId('floating')).toBeVisible();

  await page.mouse.move(0, 0);
  await expect(page.getByTestId('floating')).toHaveCount(0);
});
