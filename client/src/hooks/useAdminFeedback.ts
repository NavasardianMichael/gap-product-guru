import { useCallback, useEffect, useState } from 'react';
import { type AdminFeedbackList, type AdminFeedbackView } from '@gap-product-guru/shared';
import { App } from 'antd';
import { fetchAdminFeedback, setFeedbackResolved } from '@/api/admin';
import { ADMIN_COPY } from '@/constants/chat';
import { IDLE_STATUSES, type IdleStatus } from '@/constants/loadingStatus';

type UseAdminFeedbackReturn = {
  /** The last loaded list — kept on screen while the next one loads. */
  list: AdminFeedbackList | null;
  status: IdleStatus;
  reload: () => void;
  /** Resolves or reopens a report, then reloads so it moves to the other list. */
  setResolved: (id: string, resolved: boolean) => Promise<void>;
};

type LoadResult = {
  /** Which request this result answers; a different key means a newer request is pending. */
  key: string;
  list: AdminFeedbackList | null;
  failed: boolean;
};

export const useAdminFeedback = (view: AdminFeedbackView): UseAdminFeedbackReturn => {
  const { message } = App.useApp();
  const [reloadCount, setReloadCount] = useState(0);
  const [result, setResult] = useState<LoadResult | null>(null);
  const requestKey = `${view}:${reloadCount}`;

  useEffect(() => {
    let cancelled = false;
    fetchAdminFeedback(view)
      .then((list) => {
        if (!cancelled) setResult({ key: requestKey, list, failed: false });
      })
      .catch(() => {
        if (cancelled) return;
        setResult((previous) => ({ key: requestKey, list: previous?.list ?? null, failed: true }));
        message.error(ADMIN_COPY.loadFailed);
      });
    return () => {
      cancelled = true;
    };
  }, [view, requestKey, message]);

  const reload = useCallback(() => setReloadCount((count) => count + 1), []);

  const setResolved = useCallback(
    async (id: string, resolved: boolean) => {
      try {
        await setFeedbackResolved(id, resolved);
        reload();
      } catch {
        message.error(ADMIN_COPY.updateFailed);
      }
    },
    [message, reload],
  );

  const status: IdleStatus =
    result?.key !== requestKey
      ? IDLE_STATUSES.pending
      : result.failed
        ? IDLE_STATUSES.error
        : IDLE_STATUSES.success;

  return { list: result?.list ?? null, status, reload, setResolved };
};
