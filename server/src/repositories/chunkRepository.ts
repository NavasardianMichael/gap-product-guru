import { prisma } from '@/db/index.js';

// Prisma cannot read or write the pgvector `embedding` column (it is `Unsupported`), so every
// query that touches it is raw SQL. Vectors travel as text ('[0.1,0.2,…]') and are cast with ::vector.

export type ChunkToEmbed = {
  id: string;
  title: string;
  heading: string;
  content: string;
};

export type RetrievedChunk = {
  path: string;
  title: string;
  heading: string;
  content: string;
  /** Cosine similarity, 0–1 (1 = identical direction). */
  score: number;
};

const toVectorLiteral = (values: number[]): string => JSON.stringify(values);

export const chunkRepository = {
  async countAll(): Promise<number> {
    return prisma.chunk.count();
  },

  async countMissingEmbeddings(): Promise<number> {
    const [row] = await prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM chunks WHERE embedding IS NULL`;
    return row?.count ?? 0;
  },

  async countEmbedded(): Promise<number> {
    const [row] = await prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM chunks WHERE embedding IS NOT NULL`;
    return row?.count ?? 0;
  },

  async findMissingEmbeddings(limit: number): Promise<ChunkToEmbed[]> {
    return prisma.$queryRaw<ChunkToEmbed[]>`
      SELECT c.id, d.title, c.heading, c.content
      FROM chunks c
      JOIN documents d ON d.id = c.document_id
      WHERE c.embedding IS NULL
      ORDER BY d.path, c.position
      LIMIT ${limit}`;
  },

  async saveEmbeddings(items: { id: string; embedding: number[] }[]): Promise<void> {
    await prisma.$transaction(
      items.map(
        ({ id, embedding }) => prisma.$executeRaw`
          UPDATE chunks SET embedding = ${toVectorLiteral(embedding)}::vector WHERE id = ${id}`,
      ),
    );
  },

  /**
   * Exact nearest-neighbour search by cosine distance (`<=>`). No ANN index on purpose: a few
   * thousand 768-dim vectors scan in milliseconds — see docs/DATABASE.md before adding HNSW.
   */
  /** `area` (documents.area) limits the search to one docs area; omit it to search everything. */
  async searchSimilar(
    embedding: number[],
    limit: number,
    area?: string,
  ): Promise<RetrievedChunk[]> {
    const vector = toVectorLiteral(embedding);
    return prisma.$queryRaw<RetrievedChunk[]>`
      SELECT d.path, d.title, c.heading, c.content,
             (1 - (c.embedding <=> ${vector}::vector))::float AS score
      FROM chunks c
      JOIN documents d ON d.id = c.document_id
      WHERE c.embedding IS NOT NULL
        AND (${area ?? null}::text IS NULL OR d.area = ${area ?? null}::text)
      ORDER BY c.embedding <=> ${vector}::vector
      LIMIT ${limit}`;
  },
};
