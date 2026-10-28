import { type ApiError, CLIENT_ID_HEADER } from '@gap-product-guru/shared';
import { NETWORK_ERROR_CODE } from '@/constants/chat';
import { getClientId } from '@/helpers/clientId';

/** Error carrying the server's error code (and retry hint) so the UI can branch on it. */
export class ApiRequestError extends Error {
  readonly code: string;
  readonly retryAfterSeconds?: number;

  constructor(message: string, code: string, retryAfterSeconds?: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/** Headers every API request carries. */
export function apiHeaders(): Record<string, string> {
  return { [CLIENT_ID_HEADER]: getClientId() };
}

/**
 * Builds an ApiRequestError from a non-2xx response's `{ success: false, error }` body.
 * No JSON body means the request never reached Express (e.g. the dev proxy could not connect).
 */
export async function toApiRequestError(response: Response): Promise<ApiRequestError> {
  const body = (await response.json().catch(() => null)) as ApiError | null;
  if (!body?.error) {
    return new ApiRequestError(`Request failed (${response.status})`, NETWORK_ERROR_CODE);
  }
  const retryAfterHeader = Number(response.headers.get('Retry-After'));
  return new ApiRequestError(
    body.error.message,
    body.error.code,
    body.error.retryAfterSeconds ?? (retryAfterHeader > 0 ? retryAfterHeader : undefined),
  );
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}
