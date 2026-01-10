import { test, expect } from '@playwright/test';

test.describe('Blog Posts', () => {
  test('blog list should show posts grouped by month', async ({ page }) => {
    await page.goto('/blog/');

    const monthGroups = page.locator('fieldset.month-group');
    const count = await monthGroups.count();
    expect(count).toBeGreaterThan(0);

    const firstLegend = monthGroups.first().locator('legend');
    const monthText = await firstLegend.textContent();
    expect(monthText).toBeTruthy();
  });

  test('all blog posts should render without errors', async ({ page }) => {
    await page.goto('/blog/');
    const postLinks = await page
      .locator('li.note a')
      .evaluateAll((links) => links.map((a) => (a as HTMLAnchorElement).href));

    expect(postLinks.length).toBeGreaterThan(0);

    for (const link of postLinks) {
      await page.goto(link);

      const is404 = await page.locator('text=/404|not found/i').count();
      expect(is404).toBe(0);

      await expect(page.locator('article h1')).toBeVisible();
      await expect(page.locator('article .prose')).toBeVisible();
    }
  });

  test('blog posts should have correct metadata', async ({ page }) => {
    await page.goto('/blog/');

    const firstPostLink = page.locator('li.note a').first();
    await firstPostLink.click();

    await expect(page.locator('.meta-list')).toContainText('added');

    await expect(page.getByRole('link', { name: /back to posts/i })).toBeVisible();
  });

  test('blog posts should have no console errors', async ({ page }) => {
    await page.goto('/blog/');
    const firstPostLink = page.locator('li.note a').first();
    await firstPostLink.click();

    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    expect(errors).toEqual([]);
  });

  test('blog list should not contain film entries', async ({ page }) => {
    await page.goto('/blog/');

    const filmLinks = page.locator('li.note a.film');
    const filmCount = await filmLinks.count();
    expect(filmCount).toBe(0);
  });
});
