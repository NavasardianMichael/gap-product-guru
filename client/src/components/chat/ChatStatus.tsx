import { type FC } from 'react';
import { type ChatStage } from '@gap-product-guru/shared';
import { Flex, Spin, Typography } from 'antd';
import { STAGE_LABELS } from '@/constants/chat';

type Props = {
  stage: ChatStage;
};

/** "Searching the documentation…" / "Writing the answer…" until the first words arrive. */
export const ChatStatus: FC<Props> = ({ stage }) => (
  <Flex align="center" gap={8} role="status" aria-live="polite">
    <Spin size="small" />
    <Typography.Text type="secondary">{STAGE_LABELS[stage]}</Typography.Text>
  </Flex>
);
