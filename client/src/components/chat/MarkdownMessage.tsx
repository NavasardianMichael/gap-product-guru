import { memo, useMemo } from 'react';
import Markdown, { type Components, type Options } from 'react-markdown';
import { type ChatSource } from '@gap-product-guru/shared';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import { combineClassNames } from '@/helpers/common';
import { remarkCitationLinks } from '@/helpers/remarkCitationLinks';
import { CodeBlock } from '@/components/chat/CodeBlock';
import 'highlight.js/styles/github-dark.css';

type Props = {
  content: string;
  /** The turn's sources — the answer's `[n]` citations link to their pages. */
  sources: ChatSource[];
  /** Adds the blinking caret after the last block. */
  isStreaming: boolean;
};

const REHYPE_PLUGINS = [rehypeHighlight];

// react-markdown never renders raw HTML from the model, so no sanitiser is needed.
const COMPONENTS: Components = {
  pre: CodeBlock,
  a: ({ node: _node, children, ...props }) => (
    <a {...props} target="_blank" rel="noreferrer">
      {children}
    </a>
  ),
  table: ({ node: _node, ...props }) => (
    <div className="overflow-x-auto">
      <table {...props} />
    </div>
  ),
};

export const MarkdownMessage = memo(function MarkdownMessage({
  content,
  sources,
  isStreaming,
}: Props) {
  const remarkPlugins = useMemo<Options['remarkPlugins']>(
    () => [remarkGfm, [remarkCitationLinks, { sources }]],
    [sources],
  );

  return (
    <div
      className={combineClassNames([
        'prose prose-sm prose-a:text-primary prose-code:before:content-none prose-code:after:content-none max-w-none break-words',
        isStreaming && 'is-streaming',
      ])}
    >
      <Markdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={REHYPE_PLUGINS}
        components={COMPONENTS}
      >
        {content}
      </Markdown>
    </div>
  );
});
