import { useCallback, useState } from 'react';
import { App } from 'antd';
import { createShareLink } from '@/api/shares';
import { SHARE_COPY } from '@/constants/chat';
import { getSharedRoute } from '@/constants/routes';

type UseShareLinkReturn = {
  /** Absolute URL of the last link created, null before one is created. */
  link: string | null;
  isCreating: boolean;
  create: () => Promise<void>;
  copy: () => Promise<void>;
  reset: () => void;
};

/** Creates read-only snapshot links for one conversation and copies them. */
export const useShareLink = (conversationId: string): UseShareLinkReturn => {
  const { message } = App.useApp();
  const [link, setLink] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const copyText = useCallback(
    async (text: string) => {
      try {
        // Missing outside secure contexts (plain http on the LAN) — the link stays selectable
        await navigator.clipboard.writeText(text);
        message.success(SHARE_COPY.copied);
      } catch {
        message.info(SHARE_COPY.copyFailed);
      }
    },
    [message],
  );

  const create = useCallback(async () => {
    setIsCreating(true);
    try {
      const { shareId } = await createShareLink(conversationId);
      const url = `${window.location.origin}${getSharedRoute(shareId)}`;
      setLink(url);
      await copyText(url);
    } catch {
      message.error(SHARE_COPY.createFailed);
    } finally {
      setIsCreating(false);
    }
  }, [conversationId, copyText, message]);

  const copy = useCallback(async () => {
    if (link) await copyText(link);
  }, [copyText, link]);

  const reset = useCallback(() => setLink(null), []);

  return { link, isCreating, create, copy, reset };
};
