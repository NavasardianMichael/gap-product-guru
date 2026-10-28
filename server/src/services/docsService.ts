import { type DocAreaDto } from '@gap-product-guru/shared';

import { getAreaName } from '@/lib/docAreas.js';
import { documentRepository } from '@/repositories/documentRepository.js';

export const docsService = {
  /** Every docs area with its page count, sorted by name — the options of the area filter. */
  async listAreas(): Promise<DocAreaDto[]> {
    const counts = await documentRepository.countByArea();
    return counts
      .filter(({ area }) => area)
      .map(({ area, pages }) => ({ key: area, name: getAreaName(area), pages }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
};
