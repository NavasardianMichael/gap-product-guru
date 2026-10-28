export const IDLE_STATUSES = {
  idle: 'idle',
  pending: 'pending',
  success: 'success',
  error: 'error',
} as const;

export type IdleStatus = (typeof IDLE_STATUSES)[keyof typeof IDLE_STATUSES];
