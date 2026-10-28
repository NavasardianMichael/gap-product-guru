import { CHAT_STAGES, type ChatSource, type ChatStreamFrame } from '@gap-product-guru/shared';
import { FinishReason } from '@google/genai';

import { env } from '@/config/env.js';
import { getDocWebUrl } from '@/lib/docLinks.js';
import { buildGenerationConfig, getGemini } from '@/lib/gemini.js';
import { logger } from '@/lib/logger.js';
import { type RetrievedChunk } from '@/repositories/chunkRepository.js';
import { conversationRepository } from '@/repositories/conversationRepository.js';
import {
  buildConversationTitle,
  buildHistoryContents,
  buildRetrievalQuery,
  buildSystemPrompt,
  buildUserPrompt,
} from '@/services/chatPrompts.js';
import { toConversationSummary } from '@/services/conversationService.js';
import { retrievalService } from '@/services/retrievalService.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export type StreamChatInput = {
  clientId: string;
  /** Already verified to belong to `clientId` by the route. */
  conversationId?: string;
  message: string;
  /** Aborted when the client disconnects or presses Stop. */
  signal: AbortSignal;
};

/** Shown under an answer that Gemini ended early. */
const FINISH_NOTICES: Partial<Record<FinishReason, string>> = {
  [FinishReason.MAX_TOKENS]: 'The answer was cut off because it reached the length limit.',
  [FinishReason.SAFETY]: "The answer was stopped by Gemini's safety filters.",
  [FinishReason.RECITATION]:
    'Gemini stopped because the answer repeated its sources too closely. Try asking for a summary instead.',
};

function toChatSources(chunks: RetrievedChunk[]): ChatSource[] {
  return chunks.map((chunk, index) => ({
    n: index + 1,
    path: chunk.path,
    title: chunk.title,
    heading: chunk.heading,
    url: getDocWebUrl(chunk.path),
    score: Number(chunk.score.toFixed(3)),
  }));
}

// ─── Public streaming API ────────────────────────────────────────────────────

/**
 * One question → SSE frames: status(retrieving) → sources → status(generating) → delta… →
 * [notice] → conversation. The question and answer are saved only after a complete answer,
 * so a failed or stopped turn leaves no trace and Retry never duplicates anything.
 * Errors are thrown; the route turns them into an `error` frame.
 */
export async function* streamChat({
  clientId,
  conversationId,
  message,
  signal,
}: StreamChatInput): AsyncGenerator<ChatStreamFrame> {
  const history = conversationId
    ? await conversationRepository.findRecentMessages(conversationId, env.CHAT_HISTORY_TURNS * 2)
    : [];

  yield { status: CHAT_STAGES.retrieving };
  const chunks = await retrievalService.search(
    buildRetrievalQuery(message, history),
    env.RAG_TOP_K,
  );
  const sources = toChatSources(chunks);
  yield { sources };

  yield { status: CHAT_STAGES.generating };
  const stream = await getGemini().models.generateContentStream({
    model: env.GEMINI_CHAT_MODEL,
    contents: [
      ...buildHistoryContents(history),
      { role: 'user', parts: [{ text: buildUserPrompt(message, chunks) }] },
    ],
    config: {
      ...buildGenerationConfig(env.GEMINI_CHAT_MODEL),
      systemInstruction: buildSystemPrompt(),
      abortSignal: signal,
    },
  });

  let answer = '';
  let finishReason: FinishReason | undefined;
  for await (const chunk of stream) {
    const delta = chunk.text;
    if (delta) {
      answer += delta;
      yield { delta };
    }
    finishReason = chunk.candidates?.[0]?.finishReason ?? finishReason;
  }

  if (signal.aborted) return;

  const notice = finishReason ? FINISH_NOTICES[finishReason] : undefined;
  if (notice) yield { notice };
  if (!answer.trim()) return;

  const conversation = await conversationRepository.saveTurn({
    conversationId,
    clientId,
    title: buildConversationTitle(message),
    question: message,
    answer,
    sources,
  });
  logger.info(
    { conversationId: conversation.id, finishReason, action: 'chat_answered' },
    'chat answered',
  );
  yield { conversation: toConversationSummary(conversation) };
}
