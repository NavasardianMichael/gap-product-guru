import { prisma } from '@/db/index.js';
import { type ChunkDraft } from '@/ingest/markdownChunker.js';

export type DocumentHash = {
  path: string;
  contentHash: string;
};

export type DocumentReplace = {
  path: string;
  title: string;
  contentHash: string;
  chunks: ChunkDraft[];
};

export const documentRepository = {
  async findAllHashes(): Promise<DocumentHash[]> {
    return prisma.document.findMany({ select: { path: true, contentHash: true } });
  },

  /** Drops the old version (chunks cascade) and inserts the new one with un-embedded chunks. */
  async replace({ path, title, contentHash, chunks }: DocumentReplace): Promise<void> {
    await prisma.$transaction([
      prisma.document.deleteMany({ where: { path } }),
      prisma.document.create({
        data: { path, title, contentHash, chunks: { createMany: { data: chunks } } },
      }),
    ]);
  },

  async deleteByPaths(paths: string[]): Promise<number> {
    if (paths.length === 0) return 0;
    const { count } = await prisma.document.deleteMany({ where: { path: { in: paths } } });
    return count;
  },
};
