import { ErrorCode, HttpStatus } from '@gap-product-guru/shared';

import { embedTexts, toQueryEmbeddingText } from '@/lib/gemini.js';
import { logger } from '@/lib/logger.js';
import { AppError } from '@/middleware/errorHandler.js';
import { chunkRepository, type RetrievedChunk } from '@/repositories/chunkRepository.js';

export const retrievalService = {
  /** Embeds the query and returns the `limit` most similar documentation chunks (within `area` if given). */
  async search(query: string, limit: number, area?: string): Promise<RetrievedChunk[]> {
    const [queryVector] = await embedTexts([toQueryEmbeddingText(query)]);
    const chunks = await chunkRepository.searchSimilar(queryVector, limit, area);

    if (chunks.length === 0 && area) {
      throw new AppError(
        HttpStatus.NOT_FOUND,
        ErrorCode.NOT_FOUND,
        'No indexed pages in that product area. Choose another area or "All products".',
      );
    }
    if (chunks.length === 0) {
      throw new AppError(
        HttpStatus.SERVICE_UNAVAILABLE,
        ErrorCode.DOCS_NOT_INDEXED,
        'The documentation has not been indexed yet. Run `pnpm ingest` on the server.',
      );
    }

    logger.debug(
      { query, area, hits: chunks.map(({ path, heading, score }) => ({ path, heading, score })) },
      'retrieval results',
    );
    return chunks;
  },
};
