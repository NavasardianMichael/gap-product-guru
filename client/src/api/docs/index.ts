import { type DocAreaDto } from '@gap-product-guru/shared';
import { apiRequest } from '@/helpers/api';
import { DOCS_ENDPOINTS } from './endpoints';

/** The docs areas (top-level wiki sections) the chat can be narrowed to, sorted by name. */
export const fetchDocAreas = (): Promise<DocAreaDto[]> =>
  apiRequest<DocAreaDto[]>(DOCS_ENDPOINTS.areas);
