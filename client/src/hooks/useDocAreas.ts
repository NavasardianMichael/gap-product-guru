import { useEffect, useState } from 'react';
import { type DocAreaDto } from '@gap-product-guru/shared';
import { App } from 'antd';
import { fetchDocAreas } from '@/api/docs';
import { AREA_COPY } from '@/constants/chat';
import { IDLE_STATUSES, type IdleStatus } from '@/constants/loadingStatus';

type UseDocAreasReturn = {
  areas: DocAreaDto[];
  status: IdleStatus;
};

/** The docs areas for the product filter, loaded once per mount. */
export const useDocAreas = (): UseDocAreasReturn => {
  const { message } = App.useApp();
  const [areas, setAreas] = useState<DocAreaDto[]>([]);
  const [status, setStatus] = useState<IdleStatus>(IDLE_STATUSES.pending);

  useEffect(() => {
    let cancelled = false;
    fetchDocAreas()
      .then((list) => {
        if (cancelled) return;
        setAreas(list);
        setStatus(IDLE_STATUSES.success);
      })
      .catch(() => {
        if (cancelled) return;
        setStatus(IDLE_STATUSES.error);
        message.error(AREA_COPY.loadFailed);
      });
    return () => {
      cancelled = true;
    };
  }, [message]);

  return { areas, status };
};
