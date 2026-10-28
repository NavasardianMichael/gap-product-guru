import { type Content } from '@google/genai';

import { env } from '@/config/env.js';
import { type Message } from '@/generated/prisma/client.js';
import { type RetrievedChunk } from '@/repositories/chunkRepository.js';

// Everything the model sees, in one place. Rationale: docs/RETRIEVAL_AND_PROMPTING.md.

/** Follow-ups shorter than this borrow the previous question for retrieval ("and on Mac?"). */
const FOLLOW_UP_MAX_WORDS = 12;

/** `[1]`, `[2][3]` — citation markers from earlier answers. */
const CITATION_PATTERN = /\[\d+\]/g;

/** Fixed per conversation, so it stays identical across turns. */
export function buildSystemPrompt(): string {
  return `You are Gap Product Guru, an assistant that answers questions about ${env.PRODUCT_NAME} using its official documentation.

Rules:
- Answer ONLY from the <source> blocks in the latest user message. Do not use outside knowledge and do not guess.
- If the sources do not contain the answer, say plainly that you could not find it in the documentation, and suggest how the user could rephrase. Never invent features, settings, menu names or steps.
- Cite the sources you used with their number in square brackets right after the sentence they support, e.g. [1] or [2][3]. Only cite numbers from the latest message's sources.
- Format answers in Markdown. Use numbered steps for procedures and fenced code blocks with a language tag for code, commands and configuration.
- Be concise: lead with the direct answer, then the details the user needs.
- Highlight key parts of answer`;
}

/** A reply's quote, placed before the question it belongs to. */
function withReplyQuote(question: string, replyTo: string | null | undefined): string {
  if (!replyTo) return question;
  const quote = replyTo.replace(CITATION_PATTERN, '');
  return `The user is replying to this part of an earlier answer:\n<quote>\n${quote}\n</quote>\n\n${question}`;
}

/** The current question (and the quote it replies to) plus its retrieved sources, as the final user turn. */
export function buildUserPrompt(
  question: string,
  chunks: RetrievedChunk[],
  replyTo?: string,
): string {
  const sources = chunks
    .map(
      (chunk, index) =>
        `<source n="${index + 1}" path="${chunk.path}" heading="${chunk.heading}">\n${chunk.content}\n</source>`,
    )
    .join('\n\n');

  return `<sources>\n${sources}\n</sources>\n\nQuestion: ${withReplyQuote(question, replyTo)}`;
}

/**
 * Earlier turns as Gemini `contents`. Only the plain question/answer text is replayed — the
 * sources of earlier turns are not, which keeps prompts small; their `[n]` markers are stripped
 * because those numbers would point at the wrong sources now.
 */
export function buildHistoryContents(history: Message[]): Content[] {
  return history.map((message) =>
    message.role === 'assistant'
      ? { role: 'model', parts: [{ text: message.content.replace(CITATION_PATTERN, '') }] }
      : { role: 'user', parts: [{ text: withReplyQuote(message.content, message.replyTo) }] },
  );
}

/**
 * Text to embed for retrieval. A reply is searched together with the part it quotes. A short
 * follow-up rarely names its topic, so it is prefixed with the previous question — a free
 * alternative to an extra "rewrite the question" LLM call.
 */
export function buildRetrievalQuery(
  question: string,
  history: Message[],
  replyTo?: string,
): string {
  if (replyTo) return `${replyTo.replace(CITATION_PATTERN, '')}\n${question}`;

  const previousQuestion = history.findLast((message) => message.role === 'user')?.content;
  const isShortFollowUp = question.trim().split(/\s+/).length < FOLLOW_UP_MAX_WORDS;
  return previousQuestion && isShortFollowUp ? `${previousQuestion}\n${question}` : question;
}

/** First line of the first question, trimmed — good enough as a sidebar title. */
export function buildConversationTitle(question: string): string {
  const firstLine = question.trim().split('\n')[0];
  return firstLine.length > 80 ? `${firstLine.slice(0, 77)}…` : firstLine;
}
