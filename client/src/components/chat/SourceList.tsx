import { type FC, useMemo } from 'react';
import { type ChatSource } from '@gap-product-guru/shared';
import { Typography } from 'antd';
import { CHAT_COPY } from '@/constants/chat';
import { getCitedNumbers } from '@/helpers/common';

type Props = {
  sources: ChatSource[];
  answer: string;
};

/** The retrieved sections the answer actually cites as `[n]`, in number order. */
export const SourceList: FC<Props> = ({ sources, answer }) => {
  const cited = useMemo(() => {
    const numbers = getCitedNumbers(answer);
    return sources.filter((source) => numbers.has(source.n));
  }, [sources, answer]);

  if (cited.length === 0) return null;

  return (
    <div className="mt-3 border-t border-gray-100 pt-2">
      <Typography.Text type="secondary" className="text-xs font-semibold tracking-wide uppercase">
        {CHAT_COPY.sources}
      </Typography.Text>
      <ol className="mt-1 flex flex-col gap-1 text-xs">
        {cited.map((source) => (
          <li key={source.n} className="flex gap-2">
            <span className="text-primary shrink-0 font-semibold">[{source.n}]</span>
            <span className="min-w-0">
              {source.url ? (
                <Typography.Link href={source.url} target="_blank" rel="noreferrer">
                  {source.heading}
                </Typography.Link>
              ) : (
                <span className="text-gray-800">{source.heading}</span>
              )}{' '}
              <span className="break-all text-gray-400">{source.path}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
};
