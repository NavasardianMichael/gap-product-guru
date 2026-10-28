import { env } from '@/config/env.js';

/**
 * The wiki page a docs file is published as, or null when DOCS_WEB_URL is not set.
 * Azure DevOps wiki file names write spaces as `-` and percent-encode the rest (`%2D` = a real
 * hyphen, `%3A` = `:`), so `Setup/Self%2Dhosted-install.md` is the page `/Setup/Self-hosted install`.
 */
export function getDocWebUrl(docPath: string, baseUrl = env.DOCS_WEB_URL): string | null {
  if (!baseUrl) return null;

  const pagePath = docPath.replace(/\.md$/i, '').split('/').map(decodeWikiName).join('/');
  return `${baseUrl.replace(/\/+$/, '')}?pagePath=${encodeURIComponent(`/${pagePath}`)}`;
}

/** One wiki path segment → its page name: `-` is a space, then percent-decoding (`%2D` = `-`). */
export function decodeWikiName(name: string): string {
  const spaced = name.replaceAll('-', ' ');
  try {
    return decodeURIComponent(spaced);
  } catch {
    return spaced; // a literal `%` that is not an escape
  }
}
