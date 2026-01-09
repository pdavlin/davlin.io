import { test, expect } from '@playwright/test';

test.describe('Navigation Flow', () => {
  test('should navigate through complete blog flow', async ({ page }) => {
    await page.goto('/');

    await page.click('a[href="/blog/"]');
    await expect(page).toHaveURL(/\/blog\//);
    await expect(page.locator('h1')).toContainText('posts');

    const firstPost = page.locator('li.note a').first();
    const postHref = await firstPost.getAttribute('href');
    expect(postHref).toBeTruthy();

    await firstPost.click();

    await expect(page).toHaveURL(/\/blog\/.+/);
    await expect(page.locator('article h1')).toBeVisible();
  });

  test('should navigate back to blog from post', async ({ page }) => {
    await page.goto('/blog/');

    const firstPost = page.locator('li.note a').first();
    await firstPost.click();
    await expect(page).toHaveURL(/\/blog\/.+/);

    const backLink = page.getByRole('link', { name: /back to blog/i });
    await expect(backLink).toBeVisible();
    await backLink.click();

    await expect(page).toHaveURL(/\/blog\/?$/);
  });

  test('should maintain navigation state across pages', async ({ page }) => {
    await page.goto('/');

    await page.click('a[href="/blog/"]');
    await expect(page).toHaveURL(/\/blog\//);

    const header = page.locator('header');
    await expect(header).toBeVisible();

    await page.click('a[href="/"]');
    await expect(page).toHaveURL('/');
  });
});
