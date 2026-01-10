import { test, expect } from '@playwright/test';

test.describe('Films', () => {
  test('films list should show films grouped by month', async ({ page }) => {
    await page.goto('/films/');

    const monthGroups = page.locator('fieldset.month-group');
    const count = await monthGroups.count();
    expect(count).toBeGreaterThan(0);

    const firstLegend = monthGroups.first().locator('legend');
    const monthText = await firstLegend.textContent();
    expect(monthText).toBeTruthy();
  });

  test('all films should render without errors', async ({ page }) => {
    await page.goto('/films/');
    const filmLinks = await page
      .locator('li.note a')
      .evaluateAll((links) => links.map((a) => (a as HTMLAnchorElement).href));

    expect(filmLinks.length).toBeGreaterThan(0);

    for (const link of filmLinks.slice(0, 5)) {
      await page.goto(link);

      const is404 = await page.locator('text=/404|not found/i').count();
      expect(is404).toBe(0);

      await expect(page.locator('article h1')).toBeVisible();
      await expect(page.locator('article .prose')).toBeVisible();
    }
  });

  test('film pages should have film metadata', async ({ page }) => {
    await page.goto('/films/');

    const firstFilmLink = page.locator('li.note a').first();
    await firstFilmLink.click();

    await expect(page.locator('.film-meta')).toBeVisible();
    await expect(page.locator('.meta-list').first()).toContainText('written');
    await expect(page.getByRole('link', { name: /back to films/i })).toBeVisible();
  });

  test('films list should only contain film entries', async ({ page }) => {
    await page.goto('/films/');

    const allLinks = page.locator('li.note a');
    const linkCount = await allLinks.count();
    expect(linkCount).toBeGreaterThan(0);

    const filmLinks = page.locator('li.note a.film');
    const filmCount = await filmLinks.count();
    expect(filmCount).toBe(linkCount);
  });

  test('film pages should have no console errors', async ({ page }) => {
    await page.goto('/films/');
    const firstFilmLink = page.locator('li.note a').first();
    await firstFilmLink.click();

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

  test('film page back link points to films index', async ({ page }) => {
    await page.goto('/films/');
    const firstFilmLink = page.locator('li.note a').first();
    await firstFilmLink.click();

    const backLink = page.getByRole('link', { name: /back to films/i });
    await expect(backLink).toBeVisible();
    await expect(backLink).toHaveAttribute('href', '/films/');
  });

  test('film page shows poster in hero section, not in prose', async ({ page }) => {
    await page.goto('/films/the-royal-tenenbaums-2001/');

    // Hero poster should be visible
    const heroPoster = page.locator('.film-hero .poster');
    await expect(heroPoster).toBeVisible();

    // Prose poster should be hidden (display: none)
    const prosePoster = page.locator('.prose > p:first-child img');
    await expect(prosePoster).toBeHidden();
  });

  test('film page shows letterboxd CTA when URL present', async ({ page }) => {
    await page.goto('/films/the-royal-tenenbaums-2001/');

    const cta = page.locator('.letterboxd-cta');
    await expect(cta).toBeVisible();

    const link = cta.locator('a');
    await expect(link).toHaveAttribute('href', /letterboxd\.com/);
    await expect(link).toHaveAttribute('target', '_blank');
  });
});
