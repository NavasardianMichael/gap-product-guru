// Splits one Markdown file into heading-aware chunks for embedding.
// Pure (no I/O) so it can be unit-tested and tuned with `pnpm ingest:dry`. Rules and the
// reasoning behind them: docs/INGESTION.md.

/**
 * Part of every document hash — bump it whenever the rules below change so the next
 * `pnpm ingest` re-chunks and re-embeds everything instead of mixing old and new chunks.
 */
export const CHUNKER_VERSION = 2;

/** ~500 tokens: a top-8 retrieval stays ~4k tokens of context, yet a whole procedure usually fits. */
export const CHUNK_MAX_TOKENS = 500;

/** Sections smaller than this are merged into the next one instead of becoming near-empty chunks. */
export const SECTION_MIN_TOKENS = 80;

const CHARS_PER_TOKEN = 4;
const CHUNK_MAX_CHARS = CHUNK_MAX_TOKENS * CHARS_PER_TOKEN;
const BREADCRUMB_SEPARATOR = ' › ';

const HEADING_PATTERN = /^ {0,3}(#{1,6})\s+(.+?)\s*#*\s*$/;
const FENCE_PATTERN = /^ {0,3}(`{3,}|~{3,})/;
const FRONTMATTER_PATTERN = /^---\n([\s\S]*?)\n(?:---|\.\.\.)\s*(?:\n|$)/;
const FRONTMATTER_TITLE_PATTERN = /^title:\s*["']?(.+?)["']?\s*$/m;

export type ChunkDraft = {
  position: number;
  /** Heading breadcrumb, e.g. `Setup › Windows` (the document title for text before any heading). */
  heading: string;
  content: string;
  tokenCount: number;
};

export type ChunkedDocument = {
  title: string;
  chunks: ChunkDraft[];
};

type Section = {
  heading: string;
  lines: string[];
};

/** Rough token count (~4 characters per token for English); good enough for sizing chunks. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

export function chunkMarkdown(markdown: string, filePath: string): ChunkedDocument {
  const normalized = markdown.replace(/\r\n?/g, '\n');
  const { body, frontmatterTitle } = stripFrontmatter(normalized);
  const sections = mergeSmallSections(splitIntoSections(body));
  const title = frontmatterTitle ?? findFirstH1(sections) ?? titleFromPath(filePath);

  const chunks: ChunkDraft[] = [];
  for (const section of sections) {
    for (const content of packBlocks(splitIntoBlocks(section.lines))) {
      chunks.push({
        position: chunks.length,
        heading: section.heading || title,
        content,
        tokenCount: estimateTokens(content),
      });
    }
  }
  return { title, chunks };
}

// ─── Document structure ─────────────────────────────────────────────────────

function stripFrontmatter(markdown: string): { body: string; frontmatterTitle: string | null } {
  const match = FRONTMATTER_PATTERN.exec(markdown);
  if (!match) return { body: markdown, frontmatterTitle: null };
  const title = FRONTMATTER_TITLE_PATTERN.exec(match[1])?.[1] ?? null;
  return { body: markdown.slice(match[0].length), frontmatterTitle: title };
}

/** Splits at headings outside code fences and records each section's heading breadcrumb. */
function splitIntoSections(body: string): Section[] {
  const sections: Section[] = [];
  const headingStack: string[] = [];
  let current: Section = { heading: '', lines: [] };
  let openFence: string | null = null;

  for (const line of body.split('\n')) {
    openFence = nextFenceState(line, openFence);
    const heading = openFence === null ? HEADING_PATTERN.exec(line) : null;

    if (heading) {
      sections.push(current);
      const level = heading[1].length;
      headingStack.length = level - 1;
      headingStack[level - 1] = heading[2];
      current = { heading: headingStack.filter(Boolean).join(BREADCRUMB_SEPARATOR), lines: [] };
    }
    current.lines.push(line);
  }
  sections.push(current);

  return sections.filter((section) => section.lines.join('\n').trim().length > 0);
}

/**
 * Folds tiny sections (a lone heading, a one-line intro) into the following section so they
 * travel with the content they introduce. The last section can only merge backwards.
 * A merged section is labelled with the breadcrumb its parts share (`Setup › Windows` +
 * `Setup › macOS` → `Setup`), so the label never claims only one of the merged topics.
 */
function mergeSmallSections(sections: Section[]): Section[] {
  const merged: Section[] = [];
  let carried: Section | null = null;

  sections.forEach((section, index) => {
    const combined: Section = carried
      ? {
          heading: sharedBreadcrumb(carried.heading, section.heading),
          lines: [...carried.lines, ...section.lines],
        }
      : section;
    const isLast = index === sections.length - 1;
    if (!isLast && estimateTokens(combined.lines.join('\n')) < SECTION_MIN_TOKENS) {
      carried = combined;
      return;
    }
    carried = null;
    merged.push(combined);
  });

  // A small trailing section joins the previous one when that still fits in a chunk.
  const last = merged.at(-1);
  const previous = merged.at(-2);
  if (last && previous && estimateTokens(last.lines.join('\n')) < SECTION_MIN_TOKENS) {
    const lines = [...previous.lines, '', ...last.lines];
    if (estimateTokens(lines.join('\n')) <= CHUNK_MAX_TOKENS) {
      merged.splice(-2, 2, { heading: sharedBreadcrumb(previous.heading, last.heading), lines });
    }
  }
  return merged;
}

/** Longest common leading part of two breadcrumbs ('' when they share nothing). */
function sharedBreadcrumb(a: string, b: string): string {
  const aParts = a.split(BREADCRUMB_SEPARATOR);
  const bParts = b.split(BREADCRUMB_SEPARATOR);
  const shared: string[] = [];
  for (let i = 0; i < Math.min(aParts.length, bParts.length) && aParts[i] === bParts[i]; i++) {
    shared.push(aParts[i]);
  }
  return shared.join(BREADCRUMB_SEPARATOR);
}

function findFirstH1(sections: Section[]): string | null {
  for (const section of sections) {
    for (const line of section.lines) {
      const heading = HEADING_PATTERN.exec(line);
      if (heading?.[1] === '#') return heading[2];
    }
  }
  return null;
}

/** `guides/getting-started.md` → `getting started`; `Setup%3A-Self%2Dhosted.md` → `Setup: Self-hosted` */
function titleFromPath(filePath: string): string {
  const fileName = filePath.split('/').pop() ?? filePath;
  // Azure DevOps wiki file names write spaces as `-` and percent-encode the rest (`%3A` = `:`,
  // `%2D` = a real hyphen), so separators become spaces before decoding.
  const spaced = fileName.replace(/\.md$/i, '').replace(/[-_]+/g, ' ');
  try {
    return decodeURIComponent(spaced).trim();
  } catch {
    return spaced.trim(); // a literal `%` that is not an escape
  }
}

// ─── Blocks and packing ─────────────────────────────────────────────────────

/** Blank-line separated blocks; a fenced code block is always one block, blank lines included. */
function splitIntoBlocks(lines: string[]): string[] {
  const blocks: string[] = [];
  let current: string[] = [];
  let openFence: string | null = null;

  const flush = () => {
    if (current.some((line) => line.trim())) blocks.push(current.join('\n').trim());
    current = [];
  };

  for (const line of lines) {
    const wasInFence = openFence !== null;
    openFence = nextFenceState(line, openFence);
    const isInFence = wasInFence || openFence !== null;

    if (!isInFence && line.trim() === '') {
      flush();
      continue;
    }
    current.push(line);
    // A closing fence ends the code block
    if (wasInFence && openFence === null) flush();
  }
  flush();
  return blocks;
}

/** Greedily packs whole blocks into chunks of at most CHUNK_MAX_CHARS; only oversized blocks get split. */
function packBlocks(blocks: string[]): string[] {
  const chunks: string[] = [];
  let current = '';

  const flush = () => {
    if (current) chunks.push(current);
    current = '';
  };

  for (const block of blocks) {
    if (block.length > CHUNK_MAX_CHARS) {
      flush();
      chunks.push(...splitOversizedBlock(block));
      continue;
    }
    const candidate = current ? `${current}\n\n${block}` : block;
    if (candidate.length > CHUNK_MAX_CHARS) {
      flush();
      current = block;
    } else {
      current = candidate;
    }
  }
  flush();
  return chunks;
}

/**
 * Splits a block that is bigger than a chunk by lines. A fenced code block is re-wrapped in
 * its opening fence (language included) and a closing fence in every piece, so each chunk
 * stays valid Markdown.
 */
function splitOversizedBlock(block: string): string[] {
  const lines = block.split('\n');
  const fence = FENCE_PATTERN.exec(lines[0]);
  const opener = fence ? lines[0].trim() : '';
  const closer = fence ? fence[1] : '';
  const hasClosingFence = fence !== null && lines.length > 1 && isFenceClose(lines.at(-1)!, closer);
  const body = fence ? lines.slice(1, hasClosingFence ? -1 : undefined) : lines;
  const budget = CHUNK_MAX_CHARS - opener.length - closer.length - 2;

  const pieces: string[] = [];
  let current: string[] = [];
  let currentLength = 0;

  const flush = () => {
    if (current.length) pieces.push(current.join('\n'));
    current = [];
    currentLength = 0;
  };

  for (const line of body) {
    if (line.length > budget) {
      // A single enormous line (minified JSON, base64…) gets cut by characters.
      flush();
      for (let start = 0; start < line.length; start += budget) {
        pieces.push(line.slice(start, start + budget));
      }
      continue;
    }
    if (currentLength + line.length + 1 > budget) flush();
    current.push(line);
    currentLength += line.length + 1;
  }
  flush();

  return fence ? pieces.map((piece) => `${opener}\n${piece}\n${closer}`) : pieces;
}

// ─── Code fences ────────────────────────────────────────────────────────────

/** Returns the fence marker that is open after `line` (null = not inside a code block). */
function nextFenceState(line: string, openFence: string | null): string | null {
  if (openFence !== null) return isFenceClose(line, openFence) ? null : openFence;
  return FENCE_PATTERN.exec(line)?.[1] ?? null;
}

/** A closing fence uses the opening character, at least as many times, and nothing else. */
function isFenceClose(line: string, openFence: string): boolean {
  const trimmed = line.trim();
  return trimmed.length >= openFence.length && [...trimmed].every((char) => char === openFence[0]);
}
