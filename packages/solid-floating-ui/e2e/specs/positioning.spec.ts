import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/?case=positioning');
});

test('places the floating element below the reference', async ({ page }) => {
  const floating = page.getByTestId('floating');
  await expect(floating).toHaveAttribute('data-placement', 'bottom-start');
  await expect(floating).toHaveAttribute('data-positioned', 'true');

  const reference = await page.getByTestId('reference').boundingBox();
  const box = await floating.boundingBox();

  expect(reference).not.toBeNull();
  expect(box).not.toBeNull();
  expect(box!.y).toBeGreaterThan(reference!.y + reference!.height);
  expect(Math.round(box!.x)).toBe(Math.round(reference!.x));
});

test('re-positions when the placement option changes', async ({ page }) => {
  await page.getByTestId('to-right').click();

  const floating = page.getByTestId('floating');
  await expect(floating).toHaveAttribute('data-placement', 'right');

  const reference = await page.getByTestId('reference').boundingBox();
  const box = await floating.boundingBox();

  expect(box!.x).toBeGreaterThan(reference!.x + reference!.width);
});
