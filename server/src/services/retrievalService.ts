import { ErrorCode, HttpStatus } from '@gap-product-guru/shared';

import { embedTexts, toQueryEmbeddingText } from '@/lib/gemini.js';
import { logger } from '@/lib/logger.js';
import { AppError } from '@/middleware/errorHandler.js';
import { chunkRepository, type RetrievedChunk } from '@/repositories/chunkRepository.js';

export const retrievalService = {
  /** Embeds the query and returns the `limit` most similar documentation chunks. */
  async search(query: string, limit: number): Promise<RetrievedChunk[]> {
    const [queryVector] = await embedTexts([toQueryEmbeddingText(query)]);
    const chunks = await chunkRepository.searchSimilar(queryVector, limit);

    if (chunks.length === 0) {
      throw new AppError(
        HttpStatus.SERVICE_UNAVAILABLE,
        ErrorCode.DOCS_NOT_INDEXED,
        'The documentation has not been indexed yet. Run `pnpm ingest` on the server.',
      );
    }

    logger.debug(
      { query, hits: chunks.map(({ path, heading, score }) => ({ path, heading, score })) },
      'retrieval results',
    );
    return chunks;
  },
};
