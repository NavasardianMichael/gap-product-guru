import { decodeWikiName } from '@/lib/docLinks.js';

/**
 * The docs area a file belongs to: its top-level folder. A root page and its folder share a name
 * (`Diagnostics.md` + `Diagnostics/…`), so stripping `.md` puts both in the same area.
 * The init backfill in prisma/migrations/*_feedback_areas_shares uses the same rule in SQL.
 */
export function getDocArea(docPath: string): string {
  return docPath.split('/')[0].replace(/\.md$/i, '');
}

/** `Breakthrough-Execution-Software` → `Breakthrough Execution Software`. */
export function getAreaName(area: string): string {
  return decodeWikiName(area);
}
