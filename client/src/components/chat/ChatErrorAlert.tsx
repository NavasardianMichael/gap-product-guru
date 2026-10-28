import { type FC, useMemo } from 'react';
import { Alert, Button } from 'antd';
import { type ChatError } from '@/store/chat/types';
import { useCountdown } from '@/hooks/useCountdown';
import { CHAT_COPY, ERROR_COPY, ERROR_TITLES, WAIT_ERROR_CODES } from '@/constants/chat';

type Props = {
  error: ChatError;
  onRetry: () => void;
  onDismiss: () => void;
};

/**
 * Error for the last question. Rate limits count down `retryAfterSeconds` before Retry unlocks.
 * Mounted per error (the error is cleared before each question), so the countdown restarts.
 */
export const ChatErrorAlert: FC<Props> = ({ error, onRetry, onDismiss }) => {
  const secondsLeft = useCountdown(error.retryAfterSeconds);
  const closable = useMemo(() => ({ onClose: onDismiss }), [onDismiss]);

  return (
    <Alert
      className="mb-3"
      type={WAIT_ERROR_CODES.has(error.code) ? 'warning' : 'error'}
      showIcon
      title={ERROR_TITLES[error.code] ?? ERROR_COPY.genericTitle}
      description={error.message}
      closable={closable}
      action={
        <Button size="small" disabled={secondsLeft > 0} onClick={onRetry}>
          {secondsLeft > 0 ? ERROR_COPY.retryIn(secondsLeft) : CHAT_COPY.retry}
        </Button>
      }
    />
  );
};
