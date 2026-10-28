import { prisma } from '@/db/index.js';
import { type ChunkDraft } from '@/ingest/markdownChunker.js';

export type DocumentHash = {
  path: string;
  contentHash: string;
};

export type DocumentReplace = {
  path: string;
  title: string;
  area: string;
  contentHash: string;
  chunks: ChunkDraft[];
};

export type AreaCount = {
  area: string;
  pages: number;
};

export const documentRepository = {
  async findAllHashes(): Promise<DocumentHash[]> {
    return prisma.document.findMany({ select: { path: true, contentHash: true } });
  },

  /** Drops the old version (chunks cascade) and inserts the new one with un-embedded chunks. */
  async replace({ path, title, area, contentHash, chunks }: DocumentReplace): Promise<void> {
    await prisma.$transaction([
      prisma.document.deleteMany({ where: { path } }),
      prisma.document.create({
        data: { path, title, area, contentHash, chunks: { createMany: { data: chunks } } },
      }),
    ]);
  },

  async countByArea(): Promise<AreaCount[]> {
    const groups = await prisma.document.groupBy({ by: ['area'], _count: { _all: true } });
    return groups.map((group) => ({ area: group.area, pages: group._count._all }));
  },

  async deleteByPaths(paths: string[]): Promise<number> {
    if (paths.length === 0) return 0;
    const { count } = await prisma.document.deleteMany({ where: { path: { in: paths } } });
    return count;
  },
};
