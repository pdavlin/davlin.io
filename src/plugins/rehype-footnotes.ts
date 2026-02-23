import type { Root, Element, Text, ElementContent } from 'hast';
import type { Plugin } from 'unified';
import { visit, SKIP } from 'unist-util-visit';

interface FootnoteDefinition {
  label: string;
  content: ElementContent[];
  hasRef: boolean;
}

const MARKER_PATTERN = /\[(\d+)\]/g;
const DEFINITION_PATTERN = /^\[(\d+)\]:\s*/;

function isElement(node: unknown): node is Element {
  return (
    typeof node === 'object' &&
    node !== null &&
    'type' in node &&
    (node as { type: string }).type === 'element'
  );
}

function isText(node: unknown): node is Text {
  return (
    typeof node === 'object' &&
    node !== null &&
    'type' in node &&
    (node as { type: string }).type === 'text'
  );
}

function extractDefinitions(tree: Root): Map<string, FootnoteDefinition> {
  const definitions = new Map<string, FootnoteDefinition>();
  const indicesToRemove: number[] = [];

  for (let i = tree.children.length - 1; i >= 0; i--) {
    const child = tree.children[i];
    if (!isElement(child) || child.tagName !== 'p') continue;
    if (child.children.length === 0) continue;

    const firstChild = child.children[0];
    if (!isText(firstChild)) continue;

    const match = DEFINITION_PATTERN.exec(firstChild.value);
    if (!match) continue;

    const label = match[1];
    const content: ElementContent[] = [];

    const remainingText = firstChild.value.slice(match[0].length);
    if (remainingText) {
      content.push({ type: 'text', value: remainingText });
    }

    for (let j = 1; j < child.children.length; j++) {
      content.push(child.children[j]);
    }

    definitions.set(label, { label, content, hasRef: false });
    indicesToRemove.push(i);
  }

  for (const idx of indicesToRemove) {
    tree.children.splice(idx, 1);
  }

  // Remove trailing <hr> that served as a separator before the definition block.
  // remark-rehype inserts whitespace text nodes between block elements,
  // so walk backwards past those to find the <hr>.
  let trailIndex = tree.children.length - 1;
  while (trailIndex >= 0) {
    const node = tree.children[trailIndex];
    if (isText(node) && !node.value.trim()) {
      trailIndex--;
    } else {
      break;
    }
  }
  if (trailIndex >= 0) {
    const node = tree.children[trailIndex];
    if (isElement(node) && node.tagName === 'hr') {
      tree.children.splice(trailIndex);
    }
  }

  return definitions;
}

function transformReferences(tree: Root, definitions: Map<string, FootnoteDefinition>): void {
  visit(tree, 'text', (node: Text, index, parent) => {
    if (index === undefined || !parent) return;

    // Skip text inside <code> and <pre>
    if (isElement(parent) && (parent.tagName === 'code' || parent.tagName === 'pre')) {
      return SKIP;
    }

    const text = node.value;
    MARKER_PATTERN.lastIndex = 0;

    const parts: ElementContent[] = [];
    let lastIndex = 0;
    let foundMatch = false;

    let match: RegExpExecArray | null;
    while ((match = MARKER_PATTERN.exec(text)) !== null) {
      const label = match[1];
      const def = definitions.get(label);
      if (!def) continue;

      foundMatch = true;
      def.hasRef = true;

      const before = text.slice(lastIndex, match.index);
      if (before) {
        parts.push({ type: 'text', value: before });
      }

      parts.push({
        type: 'element',
        tagName: 'sup',
        properties: { className: ['footnote-ref'] },
        children: [
          {
            type: 'element',
            tagName: 'a',
            properties: {
              href: `#fn-${label}`,
              id: `fnref-${label}`,
            },
            children: [{ type: 'text', value: label }],
          },
        ],
      });

      lastIndex = match.index + match[0].length;
    }

    if (!foundMatch) return;

    const after = text.slice(lastIndex);
    if (after) {
      parts.push({ type: 'text', value: after });
    }

    (parent.children as ElementContent[]).splice(index, 1, ...parts);
    return SKIP;
  });
}

function appendFootnoteSection(tree: Root, definitions: Map<string, FootnoteDefinition>): void {
  const listItems: Element[] = [];

  for (const [label, def] of definitions) {
    const liChildren: ElementContent[] = [
      {
        type: 'element',
        tagName: 'span',
        properties: { className: ['footnote-label'] },
        children: [{ type: 'text', value: `[${label}]` }],
      },
      { type: 'text', value: ' ' },
      ...def.content,
    ];

    if (def.hasRef) {
      liChildren.push({ type: 'text', value: ' ' });
      liChildren.push({
        type: 'element',
        tagName: 'a',
        properties: {
          className: ['footnote-backref'],
          href: `#fnref-${label}`,
          ariaLabel: 'Back to reference',
        },
        children: [{ type: 'text', value: '\u21a9\ufe0e' }],
      });
    }

    listItems.push({
      type: 'element',
      tagName: 'li',
      properties: { id: `fn-${label}` },
      children: liChildren,
    });
  }

  tree.children.push({
    type: 'element',
    tagName: 'section',
    properties: {
      className: ['footnotes'],
      ariaLabel: 'Footnotes',
    },
    children: [
      {
        type: 'element',
        tagName: 'ul',
        properties: { className: ['footnotes-list'] },
        children: listItems,
      },
    ],
  });
}

const rehypeFootnotes: Plugin<[], Root> = () => {
  return (tree: Root) => {
    const definitions = extractDefinitions(tree);
    if (definitions.size === 0) return;
    transformReferences(tree, definitions);
    appendFootnoteSection(tree, definitions);
  };
};

export default rehypeFootnotes;
