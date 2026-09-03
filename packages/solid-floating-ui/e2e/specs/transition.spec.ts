import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/?case=transition');
});

test('fades the floating element in when it opens', async ({ page }) => {
  await page.getByTestId('reference').click();

  const floating = page.getByTestId('floating');
  await expect(floating).toHaveCSS('opacity', '1');
  await expect(floating).toHaveCSS('transition-duration', '0.12s');
});

test('keeps the floating element mounted until the close transition ends', async ({ page }) => {
  await page.getByTestId('reference').click();
  await expect(page.getByTestId('floating')).toHaveCSS('opacity', '1');

  await page.getByTestId('reference').click();
  // Still mounted while fading out.
  await expect(page.getByTestId('floating')).toHaveCount(1);

  await expect(page.getByTestId('floating')).toHaveCount(0);
});
