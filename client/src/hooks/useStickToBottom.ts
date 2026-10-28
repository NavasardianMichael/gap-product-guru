import { type RefObject, useCallback, useLayoutEffect, useRef } from 'react';

/** How close to the bottom (px) still counts as "following" the stream. */
const NEAR_BOTTOM_PX = 120;

type UseStickToBottomReturn = {
  containerRef: RefObject<HTMLDivElement | null>;
  onScroll: () => void;
};

/**
 * Keeps a scroll container pinned to the bottom while an answer streams in — unless the user
 * scrolled up to read. A new question (`itemCount` grows) always jumps back to the bottom.
 */
export const useStickToBottom = (content: unknown, itemCount: number): UseStickToBottomReturn => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isPinnedRef = useRef(true);
  const itemCountRef = useRef(itemCount);

  const onScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    isPinnedRef.current = distanceFromBottom < NEAR_BOTTOM_PX;
  }, []);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (itemCount > itemCountRef.current) isPinnedRef.current = true;
    itemCountRef.current = itemCount;
    if (isPinnedRef.current) container.scrollTop = container.scrollHeight;
  }, [content, itemCount]);

  return { containerRef, onScroll };
};
