import { type ApiResponse } from '@gap-product-guru/shared';
import { apiHeaders, toApiRequestError } from '@/helpers/error';

type JsonInit = Omit<RequestInit, 'body'> & { json?: unknown };

/** fetch + the `{ success, data }` envelope: resolves with `data`, rejects with ApiRequestError. */
export async function apiRequest<T>(url: string, { json, ...init }: JsonInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...apiHeaders(),
      ...(json !== undefined && { 'Content-Type': 'application/json' }),
      ...init.headers,
    },
    body: json !== undefined ? JSON.stringify(json) : undefined,
  });
  if (!response.ok) throw await toApiRequestError(response);
  const body = (await response.json()) as ApiResponse<T>;
  return body.data;
}
