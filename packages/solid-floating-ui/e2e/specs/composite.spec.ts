import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/?case=composite');
});

test('exposes a single tab stop', async ({ page }) => {
  await expect(page.getByTestId('item-One')).toHaveAttribute('tabindex', '0');
  await expect(page.getByTestId('item-Two')).toHaveAttribute('tabindex', '-1');
});

test('moves between items with the arrow keys and loops', async ({ page }) => {
  await page.getByTestId('item-One').focus();

  await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('item-Two')).toBeFocused();

  await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('item-Three')).toBeFocused();

  await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('item-One')).toBeFocused();
});
