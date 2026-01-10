import { test, expect } from '@playwright/test';

test.describe('Daily accent color legibility', () => {
  const colors = ['8', '9', 'a', 'b', 'c', 'd', 'e', 'f'] as const;
  const modes = ['light', 'dark'] as const;

  for (const color of colors) {
    for (const mode of modes) {
      test(`date shadow legible with base_0${color} in ${mode} mode`, async ({ page }) => {
        await page.emulateMedia({
          colorScheme: mode,
        });

        await page.addInitScript((hex: string) => {
          document.documentElement.style.setProperty('--accent-color', `var(--base_0${hex})`);
        }, color);

        await page.goto('/blog/');

        await page.waitForLoadState('networkidle');

        const dateElement = page.locator('.date').first();
        await expect(dateElement).toBeVisible();

        await expect(dateElement).toHaveScreenshot(`date-base0${color}-${mode}.png`, {
          threshold: 0.1,
        });
      });
    }
  }
});
