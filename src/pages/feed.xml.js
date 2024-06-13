import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import * as marked from "marked";

const notes = await getCollection("notes");

const notesWithContent = await Promise.all(
  notes.map(async (note) => {
    let rawContent = note.body;

    const titleEncoded = encodeURIComponent(`re: ${note.data.title}`);

    let html = marked.parse(rawContent);

    html += `
      <hr />
      <p>Thanks for reading this post via RSS. The <a href="https://davlin.io/${note.slug}">original post</a> is available at my website.</p>
      `;

    return {
      ...note,
      htmlContent: html,
    };
  }),
);

notesWithContent.sort((a, b) => {
  return new Date(b.data.added) - new Date(a.data.added);
});

const notesToRender = notesWithContent.slice(0, 20);

export function GET(context) {
  return rss({
    title: "Patrick Davlin dot IO",
    description: "Sometimes, I write stuff",
    site: context.site,
    items: notesToRender.map((note) => {
      const categoryTags = note.data.tags
        .map((tag) => `<category><![CDATA[${tag}]]></category>`)
        .join("");
      return {
        link: `/${note.slug}`,
        title: note.data.title,
        pubDate: note.data.added,
        description: note.htmlContent,
        customData: categoryTags,
      };
    }),
    // stylesheet: "/rss-styles.xsl",
  });
}
