export const ROUTES = {
  HOME: '/',
  CONVERSATION: '/c/:conversationId',
  SHARED: '/share/:shareId',
  ADMIN: '/admin',
} as const;

export function getConversationRoute(conversationId: string): string {
  return `/c/${conversationId}`;
}

export function getSharedRoute(shareId: string): string {
  return `/share/${shareId}`;
}

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];
