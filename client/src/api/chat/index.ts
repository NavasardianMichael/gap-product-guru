import {
  type ChatRequest,
  type ChatStreamFrame,
  ErrorCode,
  SSE_DONE,
} from '@gap-product-guru/shared';
import { apiHeaders, ApiRequestError, toApiRequestError } from '@/helpers/error';
import { CHAT_ENDPOINTS } from './endpoints';
import { type ChatStreamHandlers } from './types';

const SSE_DATA_PREFIX = 'data: ';

/** Routes one SSE event to its handler. Returns true on the final `[DONE]` event. */
function dispatchEvent(event: string, handlers: ChatStreamHandlers): boolean {
  for (const line of event.split('\n')) {
    if (!line.startsWith(SSE_DATA_PREFIX)) continue;
    const raw = line.slice(SSE_DATA_PREFIX.length).trim();
    if (raw === SSE_DONE) return true;

    let frame: ChatStreamFrame;
    try {
      frame = JSON.parse(raw) as ChatStreamFrame;
    } catch {
      continue;
    }

    if ('error' in frame) {
      throw new ApiRequestError(
        frame.error.message,
        frame.error.code,
        frame.error.retryAfterSeconds,
      );
    }
    if ('status' in frame) handlers.onStatus(frame.status);
    if ('sources' in frame) handlers.onSources(frame.sources);
    if ('delta' in frame) handlers.onDelta(frame.delta);
    if ('notice' in frame) handlers.onNotice(frame.notice);
    if ('answerId' in frame) handlers.onAnswerId(frame.answerId);
    if ('conversation' in frame) handlers.onConversation(frame.conversation);
  }
  return false;
}

/**
 * Asks a question and feeds the SSE frames to `handlers` until `[DONE]`.
 * Rejects with ApiRequestError for server errors (before or during the stream) and with an
 * AbortError when `signal` aborts (Stop button, switching conversations).
 */
export async function streamChat(
  payload: ChatRequest,
  handlers: ChatStreamHandlers,
  signal: AbortSignal,
): Promise<void> {
  const response = await fetch(CHAT_ENDPOINTS.chat, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...apiHeaders() },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) throw await toApiRequestError(response);
  if (!response.body) {
    throw new ApiRequestError('No response stream received.', ErrorCode.INTERNAL_ERROR);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });

      // SSE events are separated by a blank line; keep a trailing partial event for the next read
      // (or, once the stream has ended, process it too).
      const events = buffer.split('\n\n');
      buffer = done ? '' : (events.pop() ?? '');

      for (const event of events) {
        if (dispatchEvent(event, handlers)) return;
      }
      if (done) {
        throw new ApiRequestError(
          'The answer stream ended unexpectedly. Please retry.',
          ErrorCode.INTERNAL_ERROR,
        );
      }
    }
  } finally {
    // Release the connection if we returned early on [DONE] or threw on an error frame.
    reader.cancel().catch(() => undefined);
  }
}
