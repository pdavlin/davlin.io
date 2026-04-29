import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import * as marked from 'marked';
import { Temporal } from '@js-temporal/polyfill';

export async function GET(context: APIContext) {
  const notes = await getCollection('notes');

  const notesWithContent = await Promise.all(
    notes.map(async (note) => {
      const rawContent = note.body ?? '';
      const html = await marked.parse(rawContent);
      const basePath = note.data.type === 'film' ? 'films' : 'blog';

      const fullHtml = `${html}
        <hr />
        <p>Thanks for reading this post via RSS. The <a href="https://davlin.io/${basePath}/${note.id}">original post</a> is available at my website.</p>
      `;

      return {
        ...note,
        htmlContent: fullHtml,
      };
    })
  );

  notesWithContent.sort((a, b) => {
    const dateA = Temporal.PlainDateTime.from(a.data.added.replace(' ', 'T'));
    const dateB = Temporal.PlainDateTime.from(b.data.added.replace(' ', 'T'));
    return Temporal.PlainDateTime.compare(dateB, dateA);
  });

  const notesToRender = notesWithContent.slice(0, 20);

  return rss({
    title: 'Patrick Davlin dot IO',
    description: 'Sometimes, I write stuff',
    site: context.site ?? new URL('https://davlin.io'),
    items: notesToRender.map((note) => {
      const categoryTags = note.data.tags
        .map((tag: string) => `<category><![CDATA[${tag}]]></category>`)
        .join('');
      const basePath = note.data.type === 'film' ? '/films' : '/blog';
      return {
        link: `${basePath}/${note.id}`,
        title: note.data.title,
        pubDate: new Date(note.data.added),
        description: note.htmlContent,
        customData: categoryTags,
      };
    }),
    stylesheet: '/rss-styles.xsl',
  });
}
