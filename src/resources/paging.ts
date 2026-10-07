import type { PageParams } from '../types';

export const MAX_PAGE_SIZE = 20;

export function pageQuery(params: PageParams): { page: number; offset: number } {
  const page = params.page ?? 0;
  const size = params.size ?? 10;
  if (!Number.isInteger(page) || page < 0) throw new RangeError('page must be >= 0');
  if (!Number.isInteger(size) || size < 1 || size > MAX_PAGE_SIZE) throw new RangeError(`size must be 1-${MAX_PAGE_SIZE}`);
  return { page, offset: size };
}