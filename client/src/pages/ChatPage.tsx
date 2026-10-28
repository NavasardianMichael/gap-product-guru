import { type FC, useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Layout } from 'antd';
import { selectError, selectSetError } from '@/store/chat/selectors';
import { useChatStore } from '@/store/chat/store';
import { useChat } from '@/hooks/useChat';
import { useConversations } from '@/hooks/useConversations';
import { useIsMdUp } from '@/hooks/useIsMdUp';
import { CHAT_COPY } from '@/constants/chat';
import { getConversationRoute } from '@/constants/routes';
import { ChatComposer } from '@/components/chat/ChatComposer';
import { ChatErrorAlert } from '@/components/chat/ChatErrorAlert';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { ChatThread } from '@/components/chat/ChatThread';
import { ConversationSidebar } from '@/components/conversations/ConversationSidebar';

const ChatPage: FC = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const isDocked = useIsMdUp();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const { ask, stop, retry, startNewChat, isStreaming } = useChat(conversationId);
  const { conversations, listStatus, removeConversation } = useConversations();
  const error = useChatStore(selectError);
  const setError = useChatStore(selectSetError);

  const title = useMemo(
    () => conversations.find((c) => c.id === conversationId)?.title ?? CHAT_COPY.newChat,
    [conversations, conversationId],
  );

  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);
  const dismissError = useCallback(() => setError(null), [setError]);

  const handleSelect = useCallback(
    (id: string) => {
      setIsDrawerOpen(false);
      void navigate(getConversationRoute(id));
    },
    [navigate],
  );

  const handleNewChat = useCallback(() => {
    setIsDrawerOpen(false);
    startNewChat();
  }, [startNewChat]);

  const handleDelete = useCallback(
    (id: string) => void removeConversation(id),
    [removeConversation],
  );

  return (
    <Layout className="h-dvh">
      <ConversationSidebar
        isDocked={isDocked}
        isDrawerOpen={isDrawerOpen}
        onCloseDrawer={closeDrawer}
        conversations={conversations}
        listStatus={listStatus}
        activeId={conversationId}
        onNewChat={handleNewChat}
        onSelect={handleSelect}
        onDelete={handleDelete}
      />
      <Layout.Content className="flex min-h-0 min-w-0 flex-col">
        <ChatHeader title={title} onOpenMenu={isDocked ? undefined : openDrawer} />
        <ChatThread />
        <div className="mx-auto w-full max-w-3xl px-4 pt-2 pb-4">
          {error && <ChatErrorAlert error={error} onRetry={retry} onDismiss={dismissError} />}
          <ChatComposer isStreaming={isStreaming} onSend={ask} onStop={stop} />
        </div>
      </Layout.Content>
    </Layout>
  );
};

export default ChatPage;
