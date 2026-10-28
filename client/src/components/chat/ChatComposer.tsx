import {
  type ChangeEvent,
  type FC,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { ArrowUpOutlined, CloseOutlined, StopOutlined } from '@ant-design/icons';
import { CHAT_MESSAGE_MAX_LENGTH } from '@gap-product-guru/shared';
import { Button, Flex, type GetRef, Input, Typography } from 'antd';
import { selectReplyTo, selectSetReplyTo } from '@/store/chat/selectors';
import { useChatStore } from '@/store/chat/store';
import { CHAT_COPY, REPLY_COPY } from '@/constants/chat';
import { AreaSelect } from '@/components/chat/AreaSelect';

type Props = {
  isStreaming: boolean;
  onSend: (question: string) => void;
  onStop: () => void;
};

const AUTO_SIZE = { minRows: 1, maxRows: 8 };

/**
 * Enter sends, Shift+Enter adds a line, Escape cancels a reply. Typing is allowed while an
 * answer streams; sending is not.
 */
export const ChatComposer: FC<Props> = ({ isStreaming, onSend, onStop }) => {
  const [value, setValue] = useState('');
  const textAreaRef = useRef<GetRef<typeof Input.TextArea>>(null);
  const replyTo = useChatStore(selectReplyTo);
  const setReplyTo = useChatStore(selectSetReplyTo);
  const canSend = !isStreaming && value.trim().length > 0;

  // "Reply" under an answer → jump straight to typing the follow-up
  useEffect(() => {
    if (replyTo) textAreaRef.current?.focus();
  }, [replyTo]);

  const cancelReply = useCallback(() => setReplyTo(null), [setReplyTo]);

  const submit = useCallback(() => {
    if (!canSend) return;
    onSend(value);
    setValue('');
  }, [canSend, onSend, value]);

  const handleChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    setValue(event.target.value);
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Escape' && replyTo) {
        cancelReply();
        return;
      }
      // isComposing: don't send while an IME (e.g. Japanese input) is still composing
      if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
        event.preventDefault();
        submit();
      }
    },
    [cancelReply, replyTo, submit],
  );

  return (
    <div className="focus-within:ring-primary-200 rounded-2xl bg-white p-2 shadow-sm ring-1 ring-gray-200">
      {replyTo && (
        <Flex align="start" gap={8} className="mb-1 rounded-lg bg-gray-50 py-1.5 pr-1 pl-3!">
          <div className="min-w-0 flex-1 border-l-2 border-gray-300 pl-2">
            <Typography.Text strong className="text-primary block text-xs">
              {REPLY_COPY.replyingTo}
            </Typography.Text>
            <Typography.Text type="secondary" className="line-clamp-2 text-xs">
              {replyTo.quote}
            </Typography.Text>
          </div>
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            onClick={cancelReply}
            aria-label={REPLY_COPY.cancel}
          />
        </Flex>
      )}
      <Input.TextArea
        ref={textAreaRef}
        variant="borderless"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        autoSize={AUTO_SIZE}
        maxLength={CHAT_MESSAGE_MAX_LENGTH}
        placeholder={CHAT_COPY.composerPlaceholder}
        aria-label={CHAT_COPY.composerLabel}
        className="outline-none!"
      />
      <Flex align="center" justify="space-between" gap={8} className="mt-1">
        <AreaSelect disabled={isStreaming} />
        {isStreaming ? (
          <Button icon={<StopOutlined />} onClick={onStop}>
            {CHAT_COPY.stop}
          </Button>
        ) : (
          <Button
            type="primary"
            shape="circle"
            icon={<ArrowUpOutlined />}
            disabled={!canSend}
            onClick={submit}
            aria-label={CHAT_COPY.send}
          />
        )}
      </Flex>
    </div>
  );
};
