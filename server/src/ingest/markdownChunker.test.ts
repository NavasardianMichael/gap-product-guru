import { describe, expect, it } from 'vitest';

import { CHUNK_MAX_TOKENS, chunkMarkdown, estimateTokens } from '@/ingest/markdownChunker.js';

/** A paragraph of roughly `tokens` tokens. */
const paragraph = (tokens: number, word = 'lorem'): string =>
  Array.from({ length: Math.ceil((tokens * 4) / (word.length + 1)) }, () => word).join(' ');

describe('chunkMarkdown — titles', () => {
  it('prefers the frontmatter title and strips the frontmatter', () => {
    const doc = chunkMarkdown(
      `---\ntitle: "Install Guide"\nslug: install\n---\n# Heading\n\n${paragraph(100)}`,
      'a.md',
    );
    expect(doc.title).toBe('Install Guide');
    expect(doc.chunks.map((chunk) => chunk.content).join('\n')).not.toContain('slug: install');
  });

  it('falls back to the first H1, then to the file name', () => {
    expect(chunkMarkdown(`# Real Title\n\n${paragraph(100)}`, 'x.md').title).toBe('Real Title');
    expect(chunkMarkdown(paragraph(100), 'guides/getting-started.md').title).toBe(
      'getting started',
    );
  });

  it('decodes Azure DevOps wiki file names', () => {
    expect(chunkMarkdown(paragraph(100), 'BCO/Setup%3A-Self%2Dhosted-(beta).md').title).toBe(
      'Setup: Self-hosted (beta)',
    );
    expect(chunkMarkdown(paragraph(100), '100%-done.md').title).toBe('100% done');
  });
});

describe('chunkMarkdown — headings', () => {
  it('builds heading breadcrumbs from nested headings', () => {
    const markdown = [
      '# Guide',
      paragraph(100),
      '## Setup',
      paragraph(100),
      '### Windows',
      paragraph(100),
      '## Usage',
      paragraph(100),
    ].join('\n\n');

    const headings = chunkMarkdown(markdown, 'guide.md').chunks.map((chunk) => chunk.heading);
    expect(headings).toEqual([
      'Guide',
      'Guide › Setup',
      'Guide › Setup › Windows',
      'Guide › Usage',
    ]);
  });

  it('ignores "headings" inside code fences', () => {
    const markdown = [
      '# Scripts',
      paragraph(100),
      '```bash\n# this is a shell comment, not a heading\necho hi\n```',
    ].join('\n\n');

    const { chunks } = chunkMarkdown(markdown, 'scripts.md');
    expect(chunks).toHaveLength(1);
    expect(chunks[0].heading).toBe('Scripts');
    expect(chunks[0].content).toContain('# this is a shell comment');
  });

  it('merges tiny sections into the section that follows', () => {
    const markdown = ['# API', 'Short intro.', '## Endpoints', paragraph(150)].join('\n\n');

    const { chunks } = chunkMarkdown(markdown, 'api.md');
    expect(chunks).toHaveLength(1);
    expect(chunks[0].heading).toBe('API');
    expect(chunks[0].content).toContain('Short intro.');
    expect(chunks[0].content).toContain('## Endpoints');
  });

  it('labels merged sibling sections with their shared parent, not the last sibling', () => {
    const markdown = [
      '# Installation',
      '## Windows',
      'Run the installer.',
      '## macOS',
      'Use Homebrew.',
    ].join('\n\n');

    const { chunks } = chunkMarkdown(markdown, 'install.md');
    expect(chunks).toHaveLength(1);
    expect(chunks[0].heading).toBe('Installation');
  });

  it('uses the document title for text before the first heading', () => {
    const { chunks } = chunkMarkdown(
      `${paragraph(120)}\n\n## Later\n\n${paragraph(120)}`,
      'faq.md',
    );
    expect(chunks[0].heading).toBe('faq');
    expect(chunks[1].heading).toBe('Later');
  });
});

describe('chunkMarkdown — sizing', () => {
  it('splits a long section into chunks under the limit, keeping the heading on each', () => {
    const markdown = ['## Reference', ...Array.from({ length: 12 }, () => paragraph(120))].join(
      '\n\n',
    );

    const { chunks } = chunkMarkdown(markdown, 'ref.md');
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.heading).toBe('Reference');
      expect(chunk.tokenCount).toBeLessThanOrEqual(CHUNK_MAX_TOKENS);
      expect(chunk.tokenCount).toBe(estimateTokens(chunk.content));
    }
    expect(chunks.map((chunk) => chunk.position)).toEqual(chunks.map((_, index) => index));
  });

  it('never splits a code block that fits in a chunk', () => {
    const code = [
      '```ts',
      ...Array.from({ length: 20 }, (_, i) => `const value${i} = ${i};`),
      '```',
    ];
    const markdown = ['## Example', paragraph(380), code.join('\n')].join('\n\n');

    const { chunks } = chunkMarkdown(markdown, 'example.md');
    const withCode = chunks.filter((chunk) => chunk.content.includes('const value'));
    expect(withCode).toHaveLength(1);
    expect(withCode[0].content).toContain(code.join('\n'));
  });

  it('re-opens the fence with its language in every piece of an oversized code block', () => {
    const lines = Array.from({ length: 300 }, (_, i) => `console.log('line number ${i}');`);
    const markdown = `## Big script\n\n\`\`\`js\n${lines.join('\n')}\n\`\`\``;

    const { chunks } = chunkMarkdown(markdown, 'big.md');
    const pieces = chunks.filter((chunk) => chunk.content.includes('console.log'));
    expect(pieces.length).toBeGreaterThan(1);
    for (const piece of pieces) {
      expect(piece.content.startsWith('```js\n')).toBe(true);
      expect(piece.content.endsWith('\n```')).toBe(true);
      expect(piece.tokenCount).toBeLessThanOrEqual(CHUNK_MAX_TOKENS);
    }
    const allLines = pieces.flatMap((piece) => piece.content.split('\n'));
    expect(allLines.filter((line) => line.startsWith('console.log'))).toHaveLength(300);
  });

  it('handles Windows line endings', () => {
    const { chunks } = chunkMarkdown(`# Title\r\n\r\n${paragraph(100)}\r\n`, 'crlf.md');
    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).not.toContain('\r');
  });

  it('returns no chunks for an empty file', () => {
    expect(chunkMarkdown('  \n\n', 'empty.md').chunks).toEqual([]);
  });
});
