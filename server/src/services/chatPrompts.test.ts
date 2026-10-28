import { describe, expect, it } from 'vitest';

import { type Message } from '@/generated/prisma/client.js';
import { type RetrievedChunk } from '@/repositories/chunkRepository.js';
import {
  buildHistoryContents,
  buildRetrievalQuery,
  buildUserPrompt,
} from '@/services/chatPrompts.js';

const chunk: RetrievedChunk = {
  path: 'a.md',
  title: 'A',
  heading: 'A',
  content: 'Some docs text.',
  score: 0.9,
};

const userMessage = (content: string, replyTo: string | null = null): Message =>
  ({ role: 'user', content, replyTo }) as Message;

describe('replies', () => {
  it('puts the quote, without citation markers, before the question', () => {
    const prompt = buildUserPrompt('Why?', [chunk], 'Enable the toggle [2].');
    expect(prompt).toContain('<quote>\nEnable the toggle .\n</quote>\n\nWhy?');
  });

  it('searches with the quote instead of the previous question', () => {
    const history = [userMessage('How do I print a survey?')];
    expect(buildRetrievalQuery('Why?', history, 'Enable the toggle [2].')).toBe(
      'Enable the toggle .\nWhy?',
    );
    expect(buildRetrievalQuery('Why?', history)).toBe('How do I print a survey?\nWhy?');
  });

  it('replays earlier replies with their quote', () => {
    const [content] = buildHistoryContents([userMessage('Why?', 'Enable the toggle.')]);
    expect(content.parts?.[0].text).toContain('<quote>\nEnable the toggle.\n</quote>');
  });
});
