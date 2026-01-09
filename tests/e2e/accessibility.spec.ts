import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility', () => {
  test('homepage should not have accessibility violations', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('blog list should not have accessibility violations', async ({ page }) => {
    await page.goto('/blog/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('blog post should not have accessibility violations', async ({ page }) => {
    await page.goto('/blog/');
    const firstPostLink = page.locator('li.note a').first();
    await firstPostLink.click();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('all main pages should be keyboard navigable', async ({ page }) => {
    await page.goto('/');

    await page.keyboard.press('Tab');
    const firstFocusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? el.tagName : null;
    });
    expect(firstFocusedElement).toBe('A');

    let foundBlogLink = false;
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      const href = await page.evaluate(() => {
        const el = document.activeElement as HTMLAnchorElement | null;
        return el ? el.href : null;
      });
      if (href?.includes('/blog')) {
        foundBlogLink = true;
        break;
      }
    }
    expect(foundBlogLink).toBe(true);
  });
});
