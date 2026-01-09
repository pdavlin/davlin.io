import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load successfully', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Patrick Davlin/);
  });

  test('should have visible heading', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('davlin');
  });

  test('should have navigation links', async ({ page }) => {
    await page.goto('/');

    const homeLink = page.getByRole('link', { name: /home/i });
    await expect(homeLink).toBeVisible();

    const blogLink = page.getByRole('link', { name: /blog/i });
    await expect(blogLink).toBeVisible();
  });

  test('should navigate to blog from homepage', async ({ page }) => {
    await page.goto('/');
    await page.click('a[href="/blog/"]');
    await expect(page).toHaveURL(/\/blog\//);
  });

  test('should have no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    expect(errors).toEqual([]);
  });
});
