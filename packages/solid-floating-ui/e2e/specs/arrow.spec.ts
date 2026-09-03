import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/?case=arrow');
});

test('renders the arrow between the reference and the floating element', async ({ page }) => {
  const arrow = page.getByTestId('arrow');
  await expect(arrow).toBeVisible();
  await expect(arrow).toHaveCSS('position', 'absolute');

  const reference = await page.getByTestId('reference').boundingBox();
  const floating = await page.getByTestId('floating').boundingBox();
  const box = await arrow.boundingBox();

  expect(box).not.toBeNull();
  // The arrow points back at the reference from the floating element's edge.
  expect(box!.y + box!.height).toBeGreaterThan(reference!.y + reference!.height);
  expect(box!.y).toBeLessThan(floating!.y + 1);
  // It stays horizontally aligned with the reference.
  expect(box!.x).toBeGreaterThanOrEqual(reference!.x - 1);
});
