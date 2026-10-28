export const ROUTES = {
  HOME: '/',
  CONVERSATION: '/c/:conversationId',
} as const;

export function getConversationRoute(conversationId: string): string {
  return `/c/${conversationId}`;
}

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];
