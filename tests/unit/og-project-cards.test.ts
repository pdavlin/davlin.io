/**
 * Project OG cards (DAVLIN-3): sanity of the hand-enumerated project data,
 * footer path derivation, build-day accent mapping, and a real
 * satori/resvg render of both card flavors (listing + detail) asserting the
 * PNG container (signature + 1200×630 IHDR).
 */
import { describe, expect, it } from 'vitest';
import {
  OG_HEIGHT,
  OG_WIDTH,
  dayAccent,
  loadOgFont,
  projectFooterPath,
  renderProjectCard,
} from '../../src/lib/og/card';
import { PROJECT_DETAILS, PROJECTS_LISTING } from '../../src/lib/og/projects';

describe('project card data', () => {
  it('enumerates the listing with an empty slug', () => {
    expect(PROJECTS_LISTING.slug).toBe('');
    expect(PROJECTS_LISTING.name.length).toBeGreaterThan(0);
    expect(PROJECTS_LISTING.tagline.length).toBeGreaterThan(0);
  });

  it('enumerates detail pages with unique kebab-case slugs', () => {
    const slugs = PROJECT_DETAILS.map((p) => p.slug);
    expect(slugs).toContain('twin-predictions');
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    for (const card of PROJECT_DETAILS) {
      expect(card.name.length).toBeGreaterThan(0);
      expect(card.tagline.length).toBeGreaterThan(0);
    }
  });
});

describe('projectFooterPath', () => {
  it('renders the bare listing path when there is no slug', () => {
    expect(projectFooterPath('')).toBe('~/projects');
  });

  it('renders the slug path for detail pages', () => {
    expect(projectFooterPath('twin-predictions')).toBe('~/projects/twin-predictions');
  });
});

describe('dayAccent (project cards key to build day)', () => {
  it('rotates over the 8-color accent set by day of month', () => {
    // Sep 11 → 11 % 8 = 3 → teal, the site's :root default accent.
    expect(dayAccent(new Date('2026-09-11T00:00:00Z'))).toBe('#4b8b8b');
  });
});

/** PNG signature + IHDR dimensions (bytes 16–24, big-endian). */
const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function expectPng(png: Buffer): void {
  expect([...png.subarray(0, 8)]).toEqual(PNG_SIG);
  expect(png.readUInt32BE(16)).toBe(OG_WIDTH);
  expect(png.readUInt32BE(20)).toBe(OG_HEIGHT);
  expect(png.length).toBeGreaterThan(10_000);
}

describe('renderProjectCard', () => {
  it('renders the listing card as a 1200×630 PNG', async () => {
    const font = await loadOgFont();
    const png = await renderProjectCard(PROJECTS_LISTING, font, new Date('2026-09-11T00:00:00Z'));
    expectPng(png);
  });

  it('renders the twin-predictions card as a 1200×630 PNG', async () => {
    const font = await loadOgFont();
    const twin = PROJECT_DETAILS.find((p) => p.slug === 'twin-predictions');
    if (!twin) throw new Error('twin-predictions missing from PROJECT_DETAILS');
    const png = await renderProjectCard(twin, font, new Date('2026-09-11T00:00:00Z'));
    expectPng(png);
  });
});
