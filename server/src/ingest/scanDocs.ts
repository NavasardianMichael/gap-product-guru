import { readdir } from 'node:fs/promises';
import path from 'node:path';

export type DocFile = {
  /** Relative to the docs folder with forward slashes, so ids match on Windows and Linux. */
  path: string;
  absolutePath: string;
};

/** Every `.md` file under `docsDir`, sorted by path. */
export async function scanDocs(docsDir: string): Promise<DocFile[]> {
  const entries = await readdir(docsDir, { recursive: true, withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.md'))
    .map((entry) => {
      const absolutePath = path.join(entry.parentPath, entry.name);
      return {
        absolutePath,
        path: path.relative(docsDir, absolutePath).split(path.sep).join('/'),
      };
    })
    .sort((a, b) => a.path.localeCompare(b.path));
}
