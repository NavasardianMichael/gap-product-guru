const STORAGE_KEY = 'gap-product-guru:client-id';

/**
 * Random v4 UUID. `crypto.randomUUID` only exists in secure contexts (https or localhost),
 * so plain-http access over the LAN needs the getRandomValues fallback.
 */
export function createUuid(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Anonymous per-browser id sent as X-Client-Id; the server scopes conversation history by it.
 * Not authentication — clearing site data starts a fresh history (docs/CHAT_UI.md).
 */
export function getClientId(): string {
  let clientId = localStorage.getItem(STORAGE_KEY);
  if (!clientId) {
    clientId = createUuid();
    localStorage.setItem(STORAGE_KEY, clientId);
  }
  return clientId;
}
