import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/?case=click');
});

test('toggles the floating element on click', async ({ page }) => {
  await expect(page.getByTestId('floating')).toHaveCount(0);

  await page.getByTestId('reference').click();
  await expect(page.getByTestId('floating')).toBeVisible();

  await page.getByTestId('reference').click();
  await expect(page.getByTestId('floating')).toHaveCount(0);
});

test('sets the aria attributes for the role', async ({ page }) => {
  const reference = page.getByTestId('reference');
  await expect(reference).toHaveAttribute('aria-expanded', 'false');

  await reference.click();
  await expect(reference).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByTestId('floating')).toHaveAttribute('role', 'dialog');

  const controls = await reference.getAttribute('aria-controls');
  await expect(page.getByTestId('floating')).toHaveAttribute('id', controls!);
});

test('closes on escape', async ({ page }) => {
  await page.getByTestId('reference').click();
  await expect(page.getByTestId('floating')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByTestId('floating')).toHaveCount(0);
});

test('closes when pressing outside', async ({ page }) => {
  await page.getByTestId('reference').click();
  await expect(page.getByTestId('floating')).toBeVisible();

  await page.getByTestId('outside').click();
  await expect(page.getByTestId('floating')).toHaveCount(0);
});
