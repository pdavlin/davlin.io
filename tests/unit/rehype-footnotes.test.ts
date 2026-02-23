import { describe, it, expect } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import rehypeFootnotes from '../../src/plugins/rehype-footnotes';

function processMarkdown(md: string): Promise<string> {
  return unified()
    .use(remarkParse)
    .use(remarkRehype)
    .use(rehypeFootnotes)
    .use(rehypeStringify)
    .process(md)
    .then((file) => String(file));
}

describe('rehype-footnotes', () => {
  describe('happy path', () => {
    it('transforms a single footnote with plain text definition', async () => {
      const md = 'See \\[0\\] for details.\n\n\\[0\\]: Some source text';
      const html = await processMarkdown(md);

      expect(html).toContain('<sup class="footnote-ref">');
      expect(html).toContain('<a href="#fn-0" id="fnref-0">0</a>');
      expect(html).toContain('<section class="footnotes"');
      expect(html).toContain('<li id="fn-0">');
      expect(html).toContain('Some source text');
      expect(html).toContain('class="footnote-backref"');
    });

    it('transforms a single footnote with a markdown link definition', async () => {
      const md = 'See \\[0\\] for details.\n\n\\[0\\]: [Example Article](https://example.com)';
      const html = await processMarkdown(md);

      expect(html).toContain('<sup class="footnote-ref">');
      expect(html).toContain('<li id="fn-0">');
      expect(html).toContain('<a href="https://example.com">Example Article</a>');
      expect(html).toContain('class="footnote-backref"');
    });

    it('transforms a single footnote with a bare URL', async () => {
      const md = 'See \\[0\\].\n\n\\[0\\]: https://example.com';
      const html = await processMarkdown(md);

      expect(html).toContain('<li id="fn-0">');
      expect(html).toContain('https://example.com');
    });

    it('transforms multiple footnotes', async () => {
      const md = 'First \\[0\\] and second \\[1\\].\n\n\\[0\\]: Source A\n\n\\[1\\]: Source B';
      const html = await processMarkdown(md);

      expect(html).toContain('<a href="#fn-0" id="fnref-0">0</a>');
      expect(html).toContain('<a href="#fn-1" id="fnref-1">1</a>');
      expect(html).toContain('<li id="fn-0">');
      expect(html).toContain('<li id="fn-1">');
      expect(html).toContain('Source A');
      expect(html).toContain('Source B');
    });

    it('removes the hr separator before definitions', async () => {
      const md = 'See \\[0\\] here.\n\n---\n\n\\[0\\]: Source text';
      const html = await processMarkdown(md);

      expect(html).not.toContain('<hr');
      expect(html).toContain('<section class="footnotes"');
      expect(html).toContain('Source text');
    });
  });

  describe('edge cases', () => {
    it('leaves orphaned marker as literal text when no definition exists', async () => {
      const md = 'See \\[0\\] for details.';
      const html = await processMarkdown(md);

      expect(html).not.toContain('<sup');
      expect(html).not.toContain('<section');
      expect(html).toContain('[0]');
    });

    it('renders orphaned definition without back-link', async () => {
      const md = 'Some text.\n\n\\[0\\]: Source text';
      const html = await processMarkdown(md);

      expect(html).toContain('<section class="footnotes"');
      expect(html).toContain('<li id="fn-0">');
      expect(html).toContain('Source text');
      expect(html).not.toContain('class="footnote-backref"');
    });

    it('does not modify markdown with no footnote patterns', async () => {
      const md = 'Just a normal paragraph.\n\nAnother paragraph.';
      const html = await processMarkdown(md);

      expect(html).not.toContain('<section');
      expect(html).not.toContain('<sup');
      expect(html).toContain('<p>Just a normal paragraph.</p>');
    });

    it('does not transform markers inside code blocks', async () => {
      const md = 'Some `[0]` in code.\n\n\\[0\\]: Source';
      const html = await processMarkdown(md);

      // The [0] inside backticks should remain as literal text in <code>
      expect(html).toContain('<code>[0]</code>');
      // There should be no sup link generated for the code occurrence
      expect(html).not.toContain('<sup');
    });

    it('does not transform markers inside fenced code blocks', async () => {
      const md = '```\n[0]\n```\n\n\\[0\\]: Source';
      const html = await processMarkdown(md);

      expect(html).toContain('<code>[0]\n</code>');
      expect(html).not.toContain('<sup');
    });

    it('handles multiple paragraphs between marker and definition', async () => {
      const md = 'First \\[0\\] here.\n\nMiddle paragraph.\n\nAnother one.\n\n\\[0\\]: Source';
      const html = await processMarkdown(md);

      expect(html).toContain('<a href="#fn-0" id="fnref-0">0</a>');
      expect(html).toContain('<li id="fn-0">');
      expect(html).toContain('class="footnote-backref"');
    });

    it('handles non-sequential numbering', async () => {
      const md = 'First \\[0\\] and second \\[5\\].\n\n\\[0\\]: Source A\n\n\\[5\\]: Source B';
      const html = await processMarkdown(md);

      expect(html).toContain('<a href="#fn-0" id="fnref-0">0</a>');
      expect(html).toContain('<a href="#fn-5" id="fnref-5">5</a>');
      expect(html).toContain('<li id="fn-0">');
      expect(html).toContain('<li id="fn-5">');
    });

    it('handles malformed definition with nothing after colon', async () => {
      const md = 'See \\[0\\].\n\n\\[0\\]:';
      const html = await processMarkdown(md);

      // Should not crash; definition renders with empty content
      expect(html).toContain('<li id="fn-0">');
    });
  });

  describe('regression safety', () => {
    it('does not affect standard markdown links', async () => {
      const md = 'Check [this link](https://example.com) for more.';
      const html = await processMarkdown(md);

      expect(html).toContain('<a href="https://example.com">this link</a>');
      expect(html).not.toContain('<sup');
      expect(html).not.toContain('<section');
    });

    it('does not affect inline images', async () => {
      const md = '![alt text](https://example.com/image.png)';
      const html = await processMarkdown(md);

      expect(html).toContain('<img');
      expect(html).toContain('src="https://example.com/image.png"');
      expect(html).not.toContain('<sup');
    });

    it('does not affect non-numeric reference links', async () => {
      const md = 'Check [this][ref] out.\n\n[ref]: https://example.com';
      const html = await processMarkdown(md);

      expect(html).toContain('<a href="https://example.com">this</a>');
      expect(html).not.toContain('<section class="footnotes"');
    });
  });

  describe('shattered glass pattern', () => {
    it('handles the real-world footnote pattern from the review', async () => {
      const md = [
        'It is basically totally normalized \\[0\\]. The film feels like a swan song.',
        '',
        '---',
        '',
        '\\[0\\]: [arstechnica.com/staff/2026/02/editors-note](https://arstechnica.com/staff/2026/02/editors-note-retraction-of-article-containing-fabricated-quotations/)',
      ].join('\n');

      const html = await processMarkdown(md);

      expect(html).toContain('<sup class="footnote-ref">');
      expect(html).toContain('<a href="#fn-0" id="fnref-0">0</a>');
      expect(html).not.toContain('<hr');
      expect(html).toContain('<section class="footnotes"');
      expect(html).toContain('<li id="fn-0">');
      expect(html).toContain(
        'href="https://arstechnica.com/staff/2026/02/editors-note-retraction-of-article-containing-fabricated-quotations/"'
      );
      expect(html).toContain('class="footnote-backref"');
    });
  });
});
