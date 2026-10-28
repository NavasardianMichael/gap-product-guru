import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { type SharedConversationDto } from '@gap-product-guru/shared';
import { App } from 'antd';
import { continueSharedConversation, fetchSharedConversation } from '@/api/shares';
import { selectUpsertConversation } from '@/store/conversations/selectors';
import { useConversationsStore } from '@/store/conversations/store';
import { SHARE_COPY } from '@/constants/chat';
import { IDLE_STATUSES, type IdleStatus } from '@/constants/loadingStatus';
import { getConversationRoute } from '@/constants/routes';

type UseSharedConversationReturn = {
  shared: SharedConversationDto | null;
  status: IdleStatus;
  isContinuing: boolean;
  /** Copies the shared chat into this browser's conversations and opens the copy. */
  continueConversation: () => Promise<void>;
};

type LoadResult = {
  shareId: string;
  shared: SharedConversationDto | null;
};

export const useSharedConversation = (shareId: string | undefined): UseSharedConversationReturn => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const upsertConversation = useConversationsStore(selectUpsertConversation);
  const [result, setResult] = useState<LoadResult | null>(null);
  const [isContinuing, setIsContinuing] = useState(false);

  useEffect(() => {
    if (!shareId) return;
    let cancelled = false;
    fetchSharedConversation(shareId)
      .then((shared) => {
        if (!cancelled) setResult({ shareId, shared });
      })
      .catch(() => {
        if (!cancelled) setResult({ shareId, shared: null });
      });
    return () => {
      cancelled = true;
    };
  }, [shareId]);

  const continueConversation = useCallback(async () => {
    if (!shareId) return;
    setIsContinuing(true);
    try {
      const conversation = await continueSharedConversation(shareId);
      upsertConversation(conversation);
      void navigate(getConversationRoute(conversation.id));
    } catch {
      message.error(SHARE_COPY.continueFailed);
      setIsContinuing(false);
    }
  }, [message, navigate, shareId, upsertConversation]);

  const isLoaded = shareId !== undefined && result?.shareId === shareId;
  const shared = isLoaded ? result.shared : null;
  const status: IdleStatus = !shareId
    ? IDLE_STATUSES.error
    : !isLoaded
      ? IDLE_STATUSES.pending
      : shared
        ? IDLE_STATUSES.success
        : IDLE_STATUSES.error;

  return { shared, status, isContinuing, continueConversation };
};
