import { XMLParser } from 'fast-xml-parser';
import fs from 'fs/promises';
import path from 'path';
import { Temporal } from '@js-temporal/polyfill';

const RSS_URL = 'https://letterboxd.com/pdav/rss/';
const OUTPUT_DIR = './src/content/notes/films';

async function fetchRSS() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(RSS_URL, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.text();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('RSS fetch timeout after 10s');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseRSS(xml) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    cdataPropName: '__cdata',
    parseAttributeValue: false,
    parseTagValue: true,
    trimValues: true,
  });

  const result = parser.parse(xml);
  return result.rss.channel.item;
}

function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function extractReviewNumber(letterboxdUrl) {
  // URLs like /film/wicked-for-good/1/ have a review number
  // First review: /film/wicked-for-good/ (no number)
  // Second review: /film/wicked-for-good/1/
  // Third review: /film/wicked-for-good/2/
  const match = letterboxdUrl.match(/\/film\/[^/]+\/(\d+)\/?$/);
  return match ? parseInt(match[1], 10) : null;
}

function generateSlug(title, year, reviewNumber = null) {
  const baseSlug =
    decodeHtmlEntities(title)
      .toLowerCase()
      .replace(/'s\b/g, 's') // "mickey's" -> "mickeys"
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') +
    '-' +
    year;

  // Append review number for rewatches (1 = second review, 2 = third, etc.)
  if (reviewNumber !== null) {
    return `${baseSlug}-${reviewNumber}`;
  }

  return baseSlug;
}

function convertHtmlToMarkdown(html, filmTitle) {
  if (!html) return '';

  let clean = html.trim();

  // Extract poster image
  const imgMatch = clean.match(/<img[^>]+src="([^"]+)"/);
  const posterUrl = imgMatch ? imgMatch[1] : null;

  // Extract paragraphs
  const paragraphs = [];
  const pMatches = clean.matchAll(/<p>(.*?)<\/p>/gs);

  for (const match of pMatches) {
    let text = match[1];
    if (text.trim().startsWith('<img')) continue;

    // Convert HTML to markdown
    text = text.replace(/<em>(.*?)<\/em>/g, '*$1*');
    text = text.replace(/<i>(.*?)<\/i>/g, '*$1*');
    text = text.replace(/<strong>(.*?)<\/strong>/g, '**$1**');
    text = text.replace(/<b>(.*?)<\/b>/g, '**$1**');
    text = text.replace(/<a[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>/g, '[$2]($1)');
    text = text.replace(/<br\s*\/?>/g, '\n');
    text = text.replace(/<[^>]+>/g, '');

    // Decode HTML entities
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/&#39;/g, "'");
    text = text.replace(/&nbsp;/g, ' ');

    if (text.trim()) {
      paragraphs.push(text.trim());
    }
  }

  // Build markdown
  let markdown = '';
  if (posterUrl) {
    markdown += `![${filmTitle} poster](${posterUrl})\n\n`;
  }
  markdown += paragraphs.join('\n\n');

  return markdown;
}

function formatDate(dateInput, dateOnly = false) {
  if (dateOnly) {
    // For date-only values (like watchedDate "2025-12-25"), use PlainDate
    // This preserves the date exactly without timezone conversion
    const plainDate = Temporal.PlainDate.from(dateInput);
    return `${plainDate.year}-${String(plainDate.month).padStart(2, '0')}-${String(plainDate.day).padStart(2, '0')} 00:00`;
  }

  // For full timestamps (like pubDate), parse as Instant and convert to local time
  const instant = Temporal.Instant.from(new Date(dateInput).toISOString());
  const localDateTime = instant.toZonedDateTimeISO(Temporal.Now.timeZoneId());
  const year = localDateTime.year;
  const month = String(localDateTime.month).padStart(2, '0');
  const day = String(localDateTime.day).padStart(2, '0');
  const hours = String(localDateTime.hour).padStart(2, '0');
  const minutes = String(localDateTime.minute).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function extractExcerpt(content) {
  if (!content) return '';

  const lines = content.split('\n\n');
  const firstPara = lines.find((line) => !line.startsWith('!['));

  if (!firstPara) return '';

  return firstPara.length > 150 ? firstPara.slice(0, 147) + '...' : firstPara;
}

function escapeYamlString(str) {
  if (!str) return '';
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function generateFrontmatter(data) {
  const lines = [
    '---',
    'type: film',
    `title: "${escapeYamlString(data.title)}"`,
    `filmYear: ${data.filmYear}`,
  ];

  if (data.rating !== null && data.rating !== undefined) {
    lines.push(`rating: ${data.rating}`);
  }

  lines.push(
    `added: ${data.added}`,
    `updated: ${data.updated}`,
    `watchedDate: ${data.watchedDate}`,
    `tags: [film]`,
    `excerpt: "${escapeYamlString(data.excerpt)}"`,
    `letterboxdUrl: ${data.letterboxdUrl}`,
    `letterboxdGuid: ${data.guid}`,
    `source: letterboxd`,
    `isRewatch: ${data.isRewatch}`
  );

  if (data.tmdbId) {
    lines.push(`tmdbId: "${data.tmdbId}"`);
  }

  lines.push('---');

  return lines.join('\n');
}

function parseRSSItem(item) {
  const filmTitle = decodeHtmlEntities(item['letterboxd:filmTitle']);
  const filmYear = item['letterboxd:filmYear'];
  const rating = item['letterboxd:memberRating'] ?? null;
  const watchedDate = item['letterboxd:watchedDate'];
  const pubDate = new Date(item.pubDate);
  const guid = typeof item.guid === 'object' ? item.guid['#text'] : String(item.guid);
  const letterboxdUrl = item.link;
  const isRewatch = item['letterboxd:rewatch'] === 'Yes';
  const tmdbId = item['tmdb:movieId'] ? String(item['tmdb:movieId']) : null;

  const htmlContent =
    typeof item.description === 'object' ? item.description.__cdata || '' : item.description || '';

  const content = convertHtmlToMarkdown(htmlContent, filmTitle);
  const excerpt = extractExcerpt(content);
  const reviewNumber = extractReviewNumber(letterboxdUrl);
  const slug = generateSlug(filmTitle, filmYear, reviewNumber);

  return {
    slug,
    guid,
    pubDate,
    frontmatterData: {
      title: filmTitle,
      filmYear,
      rating,
      added: formatDate(pubDate),
      updated: formatDate(pubDate),
      watchedDate: formatDate(watchedDate, true),
      excerpt,
      letterboxdUrl,
      guid,
      isRewatch,
      tmdbId,
    },
    content,
  };
}

async function fileExists(filepath) {
  try {
    await fs.access(filepath);
    return true;
  } catch {
    return false;
  }
}

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]+?)\n---/);
  if (!match) return null;

  const frontmatter = {};
  const lines = match[1].split('\n');

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    let value = line.slice(colonIndex + 1).trim();

    // Parse value
    if (value === 'true') {
      frontmatter[key] = true;
    } else if (value === 'false') {
      frontmatter[key] = false;
    } else if (value.startsWith('"') && value.endsWith('"')) {
      frontmatter[key] = value.slice(1, -1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      frontmatter[key] = value.slice(1, -1);
    } else if (/^\d+$/.test(value)) {
      frontmatter[key] = parseInt(value, 10);
    } else if (/^\d+\.\d+$/.test(value)) {
      frontmatter[key] = parseFloat(value);
    } else {
      frontmatter[key] = value;
    }
  }

  return frontmatter;
}

async function shouldWriteFile(filepath, newGuid) {
  const exists = await fileExists(filepath);

  if (!exists) {
    return { write: true, reason: 'new file' };
  }

  const existingContent = await fs.readFile(filepath, 'utf-8');
  const existingFrontmatter = parseFrontmatter(existingContent);

  if (!existingFrontmatter) {
    console.warn(`Warning: Could not parse frontmatter in ${filepath}`);
    return { write: false, reason: 'malformed frontmatter' };
  }

  // Check source flag - never overwrite manual content
  const source = existingFrontmatter.source;
  if (source !== 'letterboxd') {
    return { write: false, reason: 'manual content (source !== letterboxd)' };
  }

  // Check GUID match
  const existingGuid = existingFrontmatter.letterboxdGuid;
  if (existingGuid !== newGuid) {
    console.warn(`Warning: GUID mismatch in ${filepath}`);
    return { write: false, reason: 'GUID mismatch' };
  }

  // Same file, no update needed
  return { write: false, reason: 'up to date' };
}

async function writeMarkdownFile(parsedItem, outputDir) {
  await fs.mkdir(outputDir, { recursive: true });

  const filename = `${parsedItem.slug}.md`;
  const filepath = path.join(outputDir, filename);

  const decision = await shouldWriteFile(filepath, parsedItem.guid);

  if (!decision.write) {
    return { filepath, written: false, reason: decision.reason };
  }

  const frontmatter = generateFrontmatter(parsedItem.frontmatterData);
  const markdown = frontmatter + '\n\n' + parsedItem.content;

  await fs.writeFile(filepath, markdown, 'utf-8');

  return { filepath, written: true, reason: decision.reason };
}

async function main() {
  try {
    console.log('Fetching Letterboxd RSS...');
    const xml = await fetchRSS();
    console.log('Parsing XML...');
    const items = parseRSS(xml);
    console.log(`Found ${items.length} entries`);

    // Filter only film reviews
    const filmReviews = items.filter((item) => item.link && item.link.includes('/film/'));
    console.log(`Found ${filmReviews.length} film reviews\n`);

    let newCount = 0;
    let skippedCount = 0;

    for (const item of filmReviews) {
      const parsed = parseRSSItem(item);
      const result = await writeMarkdownFile(parsed, OUTPUT_DIR);

      if (result.written) {
        console.log(`+ ${result.filepath} (${result.reason})`);
        newCount++;
      } else {
        console.log(`  ${path.basename(result.filepath)} - ${result.reason}`);
        skippedCount++;
      }
    }

    console.log(`\nImport complete: ${newCount} new, ${skippedCount} skipped`);
  } catch (error) {
    console.error('Import failed:', error.message);
    process.exit(1);
  }
}

main();
