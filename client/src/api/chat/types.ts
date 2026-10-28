import {
  type ChatSource,
  type ChatStage,
  type ConversationSummary,
} from '@gap-product-guru/shared';

/** One callback per SSE frame type of POST /api/chat (docs/STREAMING_PROTOCOL.md). */
export type ChatStreamHandlers = {
  onStatus: (stage: ChatStage) => void;
  onSources: (sources: ChatSource[]) => void;
  onDelta: (text: string) => void;
  onNotice: (notice: string) => void;
  /** Sent once the turn is saved — carries the id of a newly created conversation. */
  onConversation: (conversation: ConversationSummary) => void;
};
