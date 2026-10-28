import { type FC, memo, useCallback } from 'react';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { type ConversationSummary } from '@gap-product-guru/shared';
import { Button, Flex, Popconfirm, Spin, Typography } from 'antd';
import { CHAT_COPY } from '@/constants/chat';
import { IDLE_STATUSES, type IdleStatus } from '@/constants/loadingStatus';
import { combineClassNames } from '@/helpers/common';

export type ConversationListProps = {
  conversations: ConversationSummary[];
  listStatus: IdleStatus;
  activeId: string | undefined;
  onNewChat: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
};

type ItemProps = {
  conversation: ConversationSummary;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
};

const DANGER_BUTTON_PROPS = { danger: true };

const ConversationListItem = memo(function ConversationListItem({
  conversation,
  isActive,
  onSelect,
  onDelete,
}: ItemProps) {
  const handleSelect = useCallback(() => onSelect(conversation.id), [conversation.id, onSelect]);
  const handleDelete = useCallback(() => onDelete(conversation.id), [conversation.id, onDelete]);

  return (
    <li
      className={combineClassNames([
        'group flex items-center rounded-lg',
        isActive ? 'bg-primary-100' : 'hover:bg-gray-100',
      ])}
    >
      <button
        type="button"
        onClick={handleSelect}
        aria-current={isActive ? 'page' : undefined}
        className="min-w-0 flex-1 cursor-pointer truncate bg-transparent px-3 py-2 text-left text-sm text-gray-800"
      >
        {conversation.title}
      </button>
      <Popconfirm
        title={CHAT_COPY.deleteConfirm}
        okText={CHAT_COPY.delete}
        cancelText={CHAT_COPY.cancel}
        okButtonProps={DANGER_BUTTON_PROPS}
        onConfirm={handleDelete}
      >
        <Button
          type="text"
          size="small"
          icon={<DeleteOutlined />}
          aria-label={`${CHAT_COPY.delete}: ${conversation.title}`}
          className="mr-1 shrink-0 text-gray-400! focus:opacity-100 md:opacity-0 md:group-hover:opacity-100"
        />
      </Popconfirm>
    </li>
  );
});

export const ConversationList: FC<ConversationListProps> = ({
  conversations,
  listStatus,
  activeId,
  onNewChat,
  onSelect,
  onDelete,
}) => {
  const isLoading = listStatus === IDLE_STATUSES.pending && conversations.length === 0;

  let content = (
    <ul className="flex flex-col gap-0.5">
      {conversations.map((conversation) => (
        <ConversationListItem
          key={conversation.id}
          conversation={conversation}
          isActive={conversation.id === activeId}
          onSelect={onSelect}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
  if (isLoading) {
    content = (
      <Flex justify="center" className="py-6!">
        <Spin size="small" />
      </Flex>
    );
  } else if (conversations.length === 0) {
    content = (
      <Typography.Text type="secondary" className="block px-3 py-2 text-sm">
        {CHAT_COPY.noConversations}
      </Typography.Text>
    );
  }

  return (
    <Flex vertical className="h-full min-h-0">
      <div className="p-3">
        <Button type="primary" block icon={<PlusOutlined />} onClick={onNewChat}>
          {CHAT_COPY.newChat}
        </Button>
      </div>
      <Typography.Text
        type="secondary"
        className="px-4 pb-1 text-xs font-semibold tracking-wide uppercase"
      >
        {CHAT_COPY.conversations}
      </Typography.Text>
      <nav
        aria-label={CHAT_COPY.conversations}
        className="min-h-0 flex-1 scrollbar-thin overflow-y-auto px-2 pb-3"
      >
        {content}
      </nav>
    </Flex>
  );
};
