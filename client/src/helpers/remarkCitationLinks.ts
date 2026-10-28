import { type ChatSource } from '@gap-product-guru/shared';

/** The few mdast fields this plugin reads or writes. */
type MarkdownNode = {
  type: string;
  value?: string;
  url?: string;
  title?: string;
  children?: MarkdownNode[];
};

type Options = { sources: ChatSource[] };

const CITATION_PATTERN = /\[(\d+)\]/g;

/**
 * remark plugin: each `[n]` in the answer's plain text becomes a link to source n's page.
 * Code is a separate node type, so `items[1]` in a code block is never touched; numbers
 * without a source (or a source without a `url`) stay plain text.
 */
export function remarkCitationLinks({ sources }: Options) {
  const sourcesByNumber = new Map(
    sources.filter((source) => source.url).map((source) => [source.n, source]),
  );
  return (tree: MarkdownNode): void => {
    if (sourcesByNumber.size > 0) linkCitations(tree, sourcesByNumber);
  };
}

function linkCitations(node: MarkdownNode, sources: Map<number, ChatSource>): void {
  if (!node.children || node.type === 'link' || node.type === 'linkReference') return;

  node.children = node.children.flatMap((child) => {
    if (child.type === 'text') return splitCitations(child, sources);
    linkCitations(child, sources);
    return [child];
  });
}

function splitCitations(node: MarkdownNode, sources: Map<number, ChatSource>): MarkdownNode[] {
  const text = node.value ?? '';
  const parts: MarkdownNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(CITATION_PATTERN)) {
    const source = sources.get(Number(match[1]));
    if (!source?.url) continue;

    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    parts.push({
      type: 'link',
      url: source.url,
      title: source.title,
      children: [{ type: 'text', value: match[0] }],
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex === 0) return [node];
  if (lastIndex < text.length) parts.push({ type: 'text', value: text.slice(lastIndex) });
  return parts;
}
