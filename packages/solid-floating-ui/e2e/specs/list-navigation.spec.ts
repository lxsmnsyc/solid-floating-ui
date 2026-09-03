import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/?case=list-navigation');
});

test('registers each item with its DOM index', async ({ page }) => {
  await page.getByTestId('reference').click();

  await expect(page.getByTestId('item-Apple')).toHaveAttribute('data-index', '0');
  await expect(page.getByTestId('item-Damson')).toHaveAttribute('data-index', '3');
});

test('moves focus with the arrow keys and loops', async ({ page }) => {
  await page.getByTestId('reference').click();
  await expect(page.getByTestId('menu')).toBeVisible();

  await page.keyboard.press('ArrowDown');
  await expect(page.getByTestId('item-Apple')).toBeFocused();

  await page.keyboard.press('ArrowDown');
  await expect(page.getByTestId('item-Banana')).toBeFocused();

  await page.keyboard.press('ArrowUp');
  await expect(page.getByTestId('item-Apple')).toBeFocused();
});

test('jumps to a matching item as the user types', async ({ page }) => {
  await page.getByTestId('reference').click();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByTestId('item-Apple')).toBeFocused();

  await page.keyboard.type('ch');
  await expect(page.getByTestId('item-Cherry')).toBeFocused();
});

test('selects the focused item with Enter', async ({ page }) => {
  await page.getByTestId('reference').click();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');

  await expect(page.getByTestId('selected')).toHaveText('Banana');
});
