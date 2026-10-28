import {
  type ComponentPropsWithoutRef,
  type FC,
  isValidElement,
  type ReactNode,
  useCallback,
  useRef,
  useState,
} from 'react';
import { type ExtraProps } from 'react-markdown';
import { CheckOutlined, CopyOutlined } from '@ant-design/icons';
import { Button, Flex } from 'antd';
import { CHAT_COPY } from '@/constants/chat';

const COPIED_FEEDBACK_MS = 1500;

/** The Clipboard API only exists in secure contexts (https or localhost). */
const CAN_COPY = window.isSecureContext && 'clipboard' in navigator;

type Props = ComponentPropsWithoutRef<'pre'> & ExtraProps;

/** `<code class="hljs language-ts">` → `ts` */
function getLanguage(children: ReactNode): string | null {
  if (!isValidElement(children)) return null;
  const { className } = children.props as { className?: string };
  return /language-(\S+)/.exec(className ?? '')?.[1] ?? null;
}

/** Replaces react-markdown's `<pre>`: language label, copy button, dark highlighted body. */
export const CodeBlock: FC<Props> = ({ node: _node, children, ...props }) => {
  const preRef = useRef<HTMLPreElement>(null);
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(preRef.current?.innerText ?? '');
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), COPIED_FEEDBACK_MS);
  }, []);

  return (
    <div className="code-block not-prose my-3 overflow-hidden rounded-lg">
      <Flex
        align="center"
        justify="space-between"
        className="bg-[#161b22] py-1! pr-1! pl-3! text-xs text-gray-400"
      >
        <span>{getLanguage(children) ?? CHAT_COPY.code}</span>
        {CAN_COPY && (
          <Button
            size="small"
            type="text"
            icon={isCopied ? <CheckOutlined /> : <CopyOutlined />}
            onClick={handleCopy}
            className="text-gray-300! hover:text-white!"
          >
            {isCopied ? CHAT_COPY.copied : CHAT_COPY.copy}
          </Button>
        )}
      </Flex>
      <pre ref={preRef} {...props}>
        {children}
      </pre>
    </div>
  );
};
