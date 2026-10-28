import { type FC } from 'react';
import { selectLoadStatus, selectStage, selectTurns } from '@/store/chat/selectors';
import { useChatStore } from '@/store/chat/store';
import { useStickToBottom } from '@/hooks/useStickToBottom';
import { IDLE_STATUSES } from '@/constants/loadingStatus';
import { ChatTurnItem } from '@/components/chat/ChatTurnItem';
import { EmptyState } from '@/components/chat/EmptyState';
import { PageLoader } from '@/components/shared/PageLoader';

export const ChatThread: FC = () => {
  const turns = useChatStore(selectTurns);
  const stage = useChatStore(selectStage);
  const loadStatus = useChatStore(selectLoadStatus);
  const { containerRef, onScroll } = useStickToBottom(turns, turns.length);

  if (loadStatus === IDLE_STATUSES.pending) return <PageLoader />;

  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      className="min-h-0 flex-1 scrollbar-thin overflow-y-auto"
    >
      {turns.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
          {turns.map((turn, index) => (
            <ChatTurnItem
              key={turn.id}
              turn={turn}
              stage={index === turns.length - 1 ? stage : null}
            />
          ))}
        </div>
      )}
    </div>
  );
};
