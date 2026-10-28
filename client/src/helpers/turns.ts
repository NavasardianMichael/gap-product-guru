import { type ChatMessageDto, MESSAGE_ROLES } from '@gap-product-guru/shared';
import { type ChatTurn, TURN_STATUSES } from '@/store/chat/types';

/** Stored messages always come in user → assistant pairs; fold them into turns. */
export function toTurns(messages: ChatMessageDto[]): ChatTurn[] {
  const turns: ChatTurn[] = [];
  for (const message of messages) {
    if (message.role === MESSAGE_ROLES.user) {
      turns.push({
        id: message.id,
        question: message.content,
        replyTo: message.replyTo,
        replyToId: message.replyToId,
        answer: '',
        answerId: null,
        sources: [],
        notice: null,
        feedback: null,
        status: TURN_STATUSES.done,
      });
      continue;
    }
    const turn = turns.at(-1);
    if (turn) {
      turn.answer = message.content;
      turn.answerId = message.id;
      turn.sources = message.sources;
      turn.feedback = message.feedback;
    }
  }
  return turns;
}

/** DOM id of an answer card, so a reply's quote can scroll back to it. */
export function getAnswerElementId(answerId: string): string {
  return `answer-${answerId}`;
}

const FLASH_KEYFRAMES: Keyframe[] = [
  { boxShadow: '0 0 0 3px var(--color-primary-200)' },
  { boxShadow: '0 0 0 3px transparent' },
];

/** Scrolls an answer card into view and flashes a ring around it. Returns false if it is not on screen. */
export function scrollToAnswer(answerId: string): boolean {
  const element = document.getElementById(getAnswerElementId(answerId));
  if (!element) return false;
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  element.animate(FLASH_KEYFRAMES, { duration: 1600, easing: 'ease-out' });
  return true;
}

/** Longest quote kept for a reply; longer selections are cut with an ellipsis. */
const REPLY_QUOTE_DISPLAY_LIMIT = 1500;

/** The quote for a reply: the user's selection inside the answer, else the whole answer. */
export function toReplyQuote(answer: string, selection: string): string {
  const text = (selection.trim() || answer).replace(/\s+\n/g, '\n').trim();
  return text.length > REPLY_QUOTE_DISPLAY_LIMIT
    ? `${text.slice(0, REPLY_QUOTE_DISPLAY_LIMIT - 1)}…`
    : text;
}
