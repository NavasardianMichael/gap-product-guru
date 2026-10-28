import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { type ConversationSummary } from '@gap-product-guru/shared';
import { App } from 'antd';
import { deleteConversation, fetchConversations } from '@/api/conversations';
import { useChatStore } from '@/store/chat/store';
import {
  selectConversations,
  selectListStatus,
  selectRemoveConversation,
  selectSetConversations,
  selectSetListStatus,
} from '@/store/conversations/selectors';
import { useConversationsStore } from '@/store/conversations/store';
import { CHAT_COPY } from '@/constants/chat';
import { IDLE_STATUSES, type IdleStatus } from '@/constants/loadingStatus';
import { ROUTES } from '@/constants/routes';

type UseConversationsReturn = {
  conversations: ConversationSummary[];
  listStatus: IdleStatus;
  removeConversation: (id: string) => Promise<void>;
};

/** Loads this browser's conversation list once and handles deleting from it. */
export const useConversations = (): UseConversationsReturn => {
  const navigate = useNavigate();
  const { message } = App.useApp();

  const conversations = useConversationsStore(selectConversations);
  const listStatus = useConversationsStore(selectListStatus);
  const setConversations = useConversationsStore(selectSetConversations);
  const setListStatus = useConversationsStore(selectSetListStatus);
  const removeFromList = useConversationsStore(selectRemoveConversation);

  useEffect(() => {
    let cancelled = false;
    setListStatus(IDLE_STATUSES.pending);
    fetchConversations()
      .then((list) => {
        if (cancelled) return;
        setConversations(list);
        setListStatus(IDLE_STATUSES.success);
      })
      .catch(() => {
        if (cancelled) return;
        setListStatus(IDLE_STATUSES.error);
        message.error(CHAT_COPY.listFailed);
      });
    return () => {
      cancelled = true;
    };
  }, [message, setConversations, setListStatus]);

  const removeConversation = useCallback(
    async (id: string) => {
      try {
        await deleteConversation(id);
        removeFromList(id);
        message.success(CHAT_COPY.deleted);
        if (useChatStore.getState().conversationId === id) {
          void navigate(ROUTES.HOME);
        }
      } catch {
        message.error(CHAT_COPY.deleteFailed);
      }
    },
    [message, navigate, removeFromList],
  );

  return { conversations, listStatus, removeConversation };
};
