import { type ChangeEvent, type FC, type KeyboardEvent, useCallback, useState } from 'react';
import { ArrowUpOutlined, StopOutlined } from '@ant-design/icons';
import { CHAT_MESSAGE_MAX_LENGTH } from '@gap-product-guru/shared';
import { Button, Flex, Input } from 'antd';
import { CHAT_COPY } from '@/constants/chat';

type Props = {
  isStreaming: boolean;
  onSend: (question: string) => void;
  onStop: () => void;
};

const AUTO_SIZE = { minRows: 1, maxRows: 8 };

/** Enter sends, Shift+Enter adds a line. Typing is allowed while an answer streams; sending is not. */
export const ChatComposer: FC<Props> = ({ isStreaming, onSend, onStop }) => {
  const [value, setValue] = useState('');
  const canSend = !isStreaming && value.trim().length > 0;

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
      // isComposing: don't send while an IME (e.g. Japanese input) is still composing
      if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
        event.preventDefault();
        submit();
      }
    },
    [submit],
  );

  return (
    <Flex
      align="flex-end"
      gap={8}
      className="focus-within:ring-primary-200 rounded-2xl bg-white p-2! shadow-sm ring-1 ring-gray-200"
    >
      <Input.TextArea
        variant="borderless"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        autoSize={AUTO_SIZE}
        maxLength={CHAT_MESSAGE_MAX_LENGTH}
        placeholder={CHAT_COPY.composerPlaceholder}
        aria-label={CHAT_COPY.composerLabel}
        className="flex-1 outline-none!"
      />
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
  );
};
