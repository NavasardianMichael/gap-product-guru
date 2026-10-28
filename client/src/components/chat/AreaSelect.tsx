import { type FC, type ReactNode, useCallback, useMemo } from 'react';
import { Flex, Select, Typography } from 'antd';
import { selectArea, selectSetArea } from '@/store/chat/selectors';
import { useChatStore } from '@/store/chat/store';
import { useDocAreas } from '@/hooks/useDocAreas';
import { AREA_COPY } from '@/constants/chat';
import { IDLE_STATUSES } from '@/constants/loadingStatus';

type Props = {
  disabled?: boolean;
};

/** Select value standing for "no filter" (the store keeps null). */
const ALL_AREAS = '';
const SEARCH_CONFIG = { optionFilterProp: 'label' };

/** The chosen area shown in the closed select — medium (500) so the active filter stands out. */
const renderSelectedLabel = ({ label }: { label?: ReactNode }): ReactNode => (
  <span className="font-medium">{label}</span>
);

/** Narrows the next questions to one product area (top-level wiki section). */
export const AreaSelect: FC<Props> = ({ disabled }) => {
  const { areas, status } = useDocAreas();
  const area = useChatStore(selectArea);
  const setArea = useChatStore(selectSetArea);

  const options = useMemo(
    () => [
      { value: ALL_AREAS, label: AREA_COPY.all },
      ...areas.map(({ key, name, pages }) => ({
        value: key,
        label: name,
        title: AREA_COPY.pages(pages),
      })),
    ],
    [areas],
  );

  const handleChange = useCallback((value: string) => setArea(value || null), [setArea]);

  return (
    <Flex align="center" gap={2} className="min-w-0">
      <Typography.Text type="secondary" className="shrink-0 text-xs">
        {AREA_COPY.label}
      </Typography.Text>
      <Select
        size="small"
        variant="borderless"
        value={area ?? ALL_AREAS}
        options={options}
        labelRender={renderSelectedLabel}
        onChange={handleChange}
        loading={status === IDLE_STATUSES.pending}
        disabled={disabled}
        showSearch={SEARCH_CONFIG}
        popupMatchSelectWidth={false}
        aria-label={AREA_COPY.label}
        className="max-w-60 min-w-32 outline-none!"
      />
    </Flex>
  );
};
