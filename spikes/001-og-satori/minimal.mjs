import { readFileSync } from 'node:fs';
import satori from 'satori';

const font = readFileSync('/home/pdavlin/Development/davlin.io/public/fonts/BerkeleyMono-Regular.woff');

// satori object syntax: { type, props: { style, children } }
const el = (type, style = {}, children = '') => ({ type, props: { style, children } });
const span = (style, text) => el('span', style, text);

const tree = el('div', { display: 'flex', flexDirection: 'column', width: '100%', height: '100%', backgroundColor: '#f4ecec', padding: 64, justifyContent: 'space-between' }, [
  el('div', { display: 'flex', justifyContent: 'space-between' }, [
    span({ fontSize: 24, color: '#585050', letterSpacing: 6 }, 'PATRICK DAVLIN'),
    span({ fontSize: 24, color: '#4b8b8b', letterSpacing: 6 }, 'FILM REVIEWS'),
  ]),
  span({ fontSize: 104, color: '#292424', lineHeight: 1.15 }, 'The Shining'),
  el('div', { display: 'flex', gap: 28, alignItems: 'baseline' }, [
    span({ fontSize: 40, color: '#655d5d' }, '1980'),
    span({ fontSize: 40, color: '#4b8b8b', letterSpacing: 8 }, '*****'),
  ]),
]);

try {
  const svg = await satori(tree, {
    width: 1200, height: 630,
    fonts: [{ name: 'BerkeleyMono', data: font, weight: 400, style: 'normal' }],
  });
  console.log('OK svg bytes:', svg.length);
} catch (err) {
  console.error('FAILED:', err?.message ?? err);
}