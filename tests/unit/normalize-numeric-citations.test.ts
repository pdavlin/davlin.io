import { describe, it, expect } from 'vitest';
import { normalizeNumericCitations } from '../../scripts/import-letterboxd.js';

describe('normalizeNumericCitations - should escape footnote markers', () => {
  it('escapes standalone [0] in body text', () => {
    expect(normalizeNumericCitations('See [0] for details.')).toBe('See \\[0\\] for details.');
  });

  it('escapes [0] before a period', () => {
    expect(normalizeNumericCitations('text [0].')).toBe('text \\[0\\].');
  });

  it('escapes [1] mid-sentence', () => {
    expect(normalizeNumericCitations('foo [1] bar')).toBe('foo \\[1\\] bar');
  });

  it('escapes multiple markers in the same paragraph', () => {
    expect(normalizeNumericCitations('[0] and [1]')).toBe('\\[0\\] and \\[1\\]');
  });

  it('escapes definition line at start of string', () => {
    expect(normalizeNumericCitations('[0]: https://example.com')).toBe(
      '\\[0\\]: https://example.com'
    );
  });

  it('escapes definition line after newline', () => {
    expect(normalizeNumericCitations('Intro paragraph.\n[0]: https://example.com')).toBe(
      'Intro paragraph.\n\\[0\\]: https://example.com'
    );
  });

  it('escapes definition line with leading whitespace', () => {
    expect(normalizeNumericCitations('  [0]: https://example.com')).toBe(
      '  \\[0\\]: https://example.com'
    );
  });

  it('escapes multi-digit numeric markers', () => {
    expect(normalizeNumericCitations('See [12] for details.')).toBe('See \\[12\\] for details.');
  });

  it('handles the Shattered Glass pattern', () => {
    const input =
      'normalized [0]. The film feels...\n\n---\n\n[0]: [text](https://example.com/path)';
    const expected =
      'normalized \\[0\\]. The film feels...\n\n---\n\n\\[0\\]: [text](https://example.com/path)';
    expect(normalizeNumericCitations(input)).toBe(expected);
  });

  it('escapes multiple numeric definitions', () => {
    const input = '[0]: https://a.com\n[1]: https://b.com\n  [12]: https://c.com';
    const expected = '\\[0\\]: https://a.com\n\\[1\\]: https://b.com\n  \\[12\\]: https://c.com';
    expect(normalizeNumericCitations(input)).toBe(expected);
  });
});

describe('normalizeNumericCitations - should NOT escape legitimate markdown', () => {
  it('preserves inline link with numeric text', () => {
    expect(normalizeNumericCitations('[1](https://example.com)')).toBe('[1](https://example.com)');
  });

  it('preserves reference-style link with numeric text', () => {
    expect(normalizeNumericCitations('[2][some-ref]')).toBe('[2][some-ref]');
  });

  it('preserves already-escaped markers', () => {
    expect(normalizeNumericCitations('\\[0]')).toBe('\\[0]');
  });

  it('preserves non-numeric bracket labels', () => {
    expect(normalizeNumericCitations('[foo]')).toBe('[foo]');
  });

  it('preserves non-numeric definitions', () => {
    expect(normalizeNumericCitations('[foo]: https://example.com')).toBe(
      '[foo]: https://example.com'
    );
  });

  it('preserves empty brackets', () => {
    expect(normalizeNumericCitations('[]')).toBe('[]');
  });

  it('preserves brackets with mixed alphanumeric content', () => {
    expect(normalizeNumericCitations('[0a] and [a0]')).toBe('[0a] and [a0]');
  });
});

describe('normalizeNumericCitations - edge cases', () => {
  it('returns null input as-is', () => {
    expect(normalizeNumericCitations(null)).toBeNull();
  });

  it('returns undefined input as-is', () => {
    expect(normalizeNumericCitations(undefined)).toBeUndefined();
  });

  it('returns empty string as-is', () => {
    expect(normalizeNumericCitations('')).toBe('');
  });

  it('passes through markdown with no brackets', () => {
    const input = 'Plain text only.\n\nAnother paragraph.';
    expect(normalizeNumericCitations(input)).toBe(input);
  });

  it('does not escape [0] immediately followed by (', () => {
    expect(normalizeNumericCitations('[0](https://example.com)')).toBe('[0](https://example.com)');
  });

  it('does not escape [0] immediately followed by [', () => {
    expect(normalizeNumericCitations('[0][ref]')).toBe('[0][ref]');
  });

  it('escapes definition at file start with no preceding newline', () => {
    expect(normalizeNumericCitations('[0]: source\n\nBody text')).toBe(
      '\\[0\\]: source\n\nBody text'
    );
  });
});
