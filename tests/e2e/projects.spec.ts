import { test, expect } from '@playwright/test';

test.describe('Projects', () => {
  test('projects list renders entries grouped by year', async ({ page }) => {
    await page.goto('/projects/');

    const yearGroups = page.locator('fieldset');
    expect(await yearGroups.count()).toBeGreaterThan(0);

    const links = page.locator('li a');
    expect(await links.count()).toBeGreaterThan(0);
  });

  // Regression guard: Astro 7's `compressHTML: 'jsx'` drops whitespace between elements,
  // which silently collapsed "janitor-bot ↗" to "janitor-bot↗". innerText (not textContent)
  // is what catches this -- it reflects the space the browser actually renders.
  test('external project link keeps a space before its arrow', async ({ page }) => {
    await page.goto('/projects/');

    const external = page.locator('li a:has(.external)');
    expect(await external.count()).toBeGreaterThan(0);

    const text = await external.first().innerText();
    expect(text).toMatch(/\s↗/);
  });

  test('external project links open safely in a new tab', async ({ page }) => {
    await page.goto('/projects/');

    const external = page.locator('li a:has(.external)').first();
    await expect(external).toHaveAttribute('target', '_blank');
    await expect(external).toHaveAttribute('rel', /noopener/);
  });

  // The leaderboard is reveal-gated: scripts/fetch-actuals.mjs never fetches the actuals
  // when REVEAL is off, so a default build must ship no leaderboard at all. The dashboard
  // island (public ballots) is expected either way.
  test('twin-predictions ships the dashboard but no leaderboard when reveal is off', async ({
    page,
  }) => {
    await page.goto('/projects/twin-predictions/');

    // The dashboard island renders regardless; the leaderboard adds a second .tp-embed.
    await expect(page.locator('.tp-embed').first()).toBeVisible();
    expect(await page.locator('.tp-embed').count()).toBe(1);

    // Copy rendered only by Leaderboard.jsx, so its absence means no leaderboard shipped.
    expect(await page.getByText('closest guesses').count()).toBe(0);
    expect(await page.getByText('the results are in').count()).toBe(0);
  });
});
