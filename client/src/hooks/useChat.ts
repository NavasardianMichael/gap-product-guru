import { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { App } from 'antd';
import { streamChat } from '@/api/chat';
import { fetchConversation } from '@/api/conversations';
import {
  selectAppendToLastTurn,
  selectIsStreaming,
  selectRemoveLastTurn,
  selectResetChat,
  selectSetConversationId,
  selectSetError,
  selectSetLoadStatus,
  selectSetReplyTo,
  selectSetStage,
  selectShowConversation,
  selectStartTurn,
  selectUpdateLastTurn,
} from '@/store/chat/selectors';
import { useChatStore } from '@/store/chat/store';
import { type ChatError, type ReplyTarget, TURN_STATUSES } from '@/store/chat/types';
import { selectUpsertConversation } from '@/store/conversations/selectors';
import { useConversationsStore } from '@/store/conversations/store';
import { CHAT_COPY, ERROR_COPY, NETWORK_ERROR_CODE } from '@/constants/chat';
import { IDLE_STATUSES } from '@/constants/loadingStatus';
import { getConversationRoute, ROUTES } from '@/constants/routes';
import { ApiRequestError, isAbortError } from '@/helpers/error';
import { toTurns } from '@/helpers/turns';

type UseChatReturn = {
  ask: (question: string) => void;
  stop: () => void;
  retry: () => void;
  startNewChat: () => void;
  isStreaming: boolean;
};

function toChatError(error: unknown): ChatError {
  if (error instanceof ApiRequestError) {
    return { code: error.code, message: error.message, retryAfterSeconds: error.retryAfterSeconds };
  }
  // fetch() itself rejects with a TypeError when the server is unreachable
  return { code: NETWORK_ERROR_CODE, message: ERROR_COPY.networkMessage };
}

/**
 * Owns the chat on screen: loads the conversation named in the URL, streams new answers,
 * and handles Stop / Retry / New chat. One answer streams at a time.
 */
export const useChat = (routeConversationId: string | undefined): UseChatReturn => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const abortRef = useRef<AbortController | null>(null);

  const isStreaming = useChatStore(selectIsStreaming);
  const resetChat = useChatStore(selectResetChat);
  const showConversation = useChatStore(selectShowConversation);
  const setConversationId = useChatStore(selectSetConversationId);
  const setLoadStatus = useChatStore(selectSetLoadStatus);
  const startTurn = useChatStore(selectStartTurn);
  const updateLastTurn = useChatStore(selectUpdateLastTurn);
  const appendToLastTurn = useChatStore(selectAppendToLastTurn);
  const removeLastTurn = useChatStore(selectRemoveLastTurn);
  const setStage = useChatStore(selectSetStage);
  const setError = useChatStore(selectSetError);
  const setReplyTo = useChatStore(selectSetReplyTo);
  const upsertConversation = useConversationsStore(selectUpsertConversation);

  // ─── Follow the URL ───
  useEffect(() => {
    // Already on screen — e.g. the URL just changed because our new chat got its id.
    if (routeConversationId === (useChatStore.getState().conversationId ?? undefined)) return;

    abortRef.current?.abort();
    if (!routeConversationId) {
      resetChat();
      return;
    }

    let cancelled = false;
    setLoadStatus(IDLE_STATUSES.pending);
    fetchConversation(routeConversationId)
      .then((conversation) => {
        if (!cancelled) showConversation(conversation.id, toTurns(conversation.messages));
      })
      .catch(() => {
        if (cancelled) return;
        setLoadStatus(IDLE_STATUSES.error);
        message.error(CHAT_COPY.loadFailed);
        void navigate(ROUTES.HOME, { replace: true });
      });

    return () => {
      cancelled = true;
    };
  }, [routeConversationId, message, navigate, resetChat, setLoadStatus, showConversation]);

  // ─── Ask ───
  const askAsync = useCallback(
    async (question: string, replyTo: ReplyTarget | null) => {
      const trimmed = question.trim();
      if (!trimmed || abortRef.current) return;

      const controller = new AbortController();
      abortRef.current = controller;
      const { conversationId: startedIn, area } = useChatStore.getState();
      setError(null);
      setReplyTo(null);
      startTurn(trimmed, replyTo);

      try {
        await streamChat(
          {
            message: trimmed,
            ...(startedIn && { conversationId: startedIn }),
            ...(area && { area }),
            ...(replyTo && { replyTo: replyTo.quote }),
            ...(replyTo?.answerId && { replyToId: replyTo.answerId }),
          },
          {
            onStatus: setStage,
            onSources: (sources) => updateLastTurn({ sources }),
            onDelta: appendToLastTurn,
            onNotice: (notice) => updateLastTurn({ notice }),
            onAnswerId: (answerId) => updateLastTurn({ answerId }),
            onConversation: (conversation) => {
              upsertConversation(conversation);
              if (startedIn) return;
              // A new chat just got saved: adopt its id first so the URL change doesn't reload it.
              setConversationId(conversation.id);
              void navigate(getConversationRoute(conversation.id), { replace: true });
            },
          },
          controller.signal,
        );
        updateLastTurn({ status: TURN_STATUSES.done });
      } catch (error) {
        if (isAbortError(error)) {
          updateLastTurn({ status: TURN_STATUSES.stopped });
          return;
        }
        updateLastTurn({ status: TURN_STATUSES.failed });
        setError(toChatError(error));
      } finally {
        setStage(null);
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [
      appendToLastTurn,
      navigate,
      setConversationId,
      setError,
      setReplyTo,
      setStage,
      startTurn,
      updateLastTurn,
      upsertConversation,
    ],
  );

  /** Sends a question; it replies to the quote shown above the composer, if any. */
  const ask = useCallback(
    (question: string) => {
      void askAsync(question, useChatStore.getState().replyTo);
    },
    [askAsync],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  // The failed turn was never saved on the server, so re-asking cannot duplicate it.
  const retry = useCallback(() => {
    const lastTurn = useChatStore.getState().turns.at(-1);
    if (!lastTurn) return;
    removeLastTurn();
    const reply = lastTurn.replyTo && { quote: lastTurn.replyTo, answerId: lastTurn.replyToId };
    void askAsync(lastTurn.question, reply || null);
  }, [askAsync, removeLastTurn]);

  const startNewChat = useCallback(() => {
    abortRef.current?.abort();
    resetChat();
    void navigate(ROUTES.HOME);
  }, [navigate, resetChat]);

  return { ask, stop, retry, startNewChat, isStreaming };
};
