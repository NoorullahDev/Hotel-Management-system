export interface PageMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationParams {
  skip: number;
  take: number;
  page: number;
}

/**
 * Standardizes pagination calculation across all controllers.
 * @param pageStr - The page number as a string (from query).
 * @param limitStr - The items per page as a string (from query).
 * @param defaultLimit - Default items per page if not provided.
 * @param maxLimit - Maximum items per page to prevent enormous queries.
 */
export function getPagination(
  pageStr?: any,
  limitStr?: any,
  defaultLimit = 20,
  maxLimit = 500
): PaginationParams {
  const parsedPage = parseInt(String(pageStr), 10);
  const parsedLimit = parseInt(String(limitStr), 10);

  const page = Math.max(1, isNaN(parsedPage) ? 1 : parsedPage);
  const take = Math.min(
    maxLimit,
    Math.max(1, isNaN(parsedLimit) ? defaultLimit : parsedLimit)
  );
  const skip = (page - 1) * take;

  return { skip, take, page };
}

/**
 * Builds the standard pagination metadata object for API responses.
 */
export function buildMeta(total: number, page: number, take: number): PageMeta {
  return {
    total,
    page,
    limit: take,
    totalPages: Math.ceil(total / take)
  };
}
