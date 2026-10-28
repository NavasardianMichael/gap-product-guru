import { describe, expect, it } from 'vitest';

import { getDocWebUrl } from '@/lib/docLinks.js';

const WIKI = 'https://dev.azure.com/org/Project%20Name/_wiki/wikis/Project.wiki';

const pagePathOf = (url: string | null): string | null =>
  url && new URL(url).searchParams.get('pagePath');

describe('getDocWebUrl', () => {
  it('turns a wiki file path into its page path', () => {
    expect(pagePathOf(getDocWebUrl('Leveraging-Genius/LGO/Actions.md', WIKI))).toBe(
      '/Leveraging Genius/LGO/Actions',
    );
  });

  it('decodes escapes and keeps underscores', () => {
    expect(
      pagePathOf(getDocWebUrl('BCO/Setup%3A-Self%2Dhosted-(beta)/Progress_v2.1.md', WIKI)),
    ).toBe('/BCO/Setup: Self-hosted (beta)/Progress_v2.1');
  });

  it('keeps the base URL as is, minus a trailing slash', () => {
    expect(getDocWebUrl('A.md', `${WIKI}/`)).toBe(`${WIKI}?pagePath=%2FA`);
  });

  it('returns null when no wiki URL is configured', () => {
    expect(getDocWebUrl('A.md', undefined)).toBeNull();
    expect(getDocWebUrl('A.md', '')).toBeNull();
  });
});
