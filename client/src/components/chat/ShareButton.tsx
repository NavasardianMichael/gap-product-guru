import { type FC, type FocusEvent, useCallback, useState } from 'react';
import { CopyOutlined, LinkOutlined, ShareAltOutlined } from '@ant-design/icons';
import { Button, Input, Modal, Space, Typography } from 'antd';
import { useIsMdUp } from '@/hooks/useIsMdUp';
import { useShareLink } from '@/hooks/useShareLink';
import { SHARE_COPY } from '@/constants/chat';

type Props = {
  conversationId: string;
  disabled: boolean;
};

const selectAll = (event: FocusEvent<HTMLInputElement>) => event.target.select();

/** Header button + dialog that creates a read-only snapshot link of the conversation. */
export const ShareButton: FC<Props> = ({ conversationId, disabled }) => {
  const isMdUp = useIsMdUp();
  const [isOpen, setIsOpen] = useState(false);
  const { link, isCreating, create, copy, reset } = useShareLink(conversationId);

  const open = useCallback(() => setIsOpen(true), []);
  // Each opening creates a fresh snapshot, so a new link always shows the latest messages
  const close = useCallback(() => {
    setIsOpen(false);
    reset();
  }, [reset]);
  const handleCreate = useCallback(() => void create(), [create]);
  const handleCopy = useCallback(() => void copy(), [copy]);

  return (
    <>
      <Button
        icon={<ShareAltOutlined />}
        onClick={open}
        disabled={disabled}
        aria-label={SHARE_COPY.share}
      >
        {isMdUp && SHARE_COPY.share}
      </Button>
      <Modal
        open={isOpen}
        centered
        title={SHARE_COPY.title}
        onCancel={close}
        footer={null}
        destroyOnHidden
      >
        <Typography.Paragraph type="secondary">{SHARE_COPY.intro}</Typography.Paragraph>
        {link ? (
          <Space.Compact className="w-full">
            <Input readOnly value={link} onFocus={selectAll} aria-label={SHARE_COPY.title} />
            <Button type="primary" icon={<CopyOutlined />} onClick={handleCopy}>
              {SHARE_COPY.copy}
            </Button>
          </Space.Compact>
        ) : (
          <Button
            type="primary"
            icon={<LinkOutlined />}
            loading={isCreating}
            onClick={handleCreate}
          >
            {SHARE_COPY.create}
          </Button>
        )}
      </Modal>
    </>
  );
};
