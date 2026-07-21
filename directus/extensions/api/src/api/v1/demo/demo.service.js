import { AppError } from "../../shared/AppError.js";
import { HTTP_STATUS } from "../../shared/constants.js";

/**
 * Fetches the first available (published) item for a single product type — using that
 * type's own existing list function to pick an id, then its own detail function + shaper
 * for the full record — and returns it shaped. No new query logic: this only composes
 * each product's already-exported list/detail/transformer functions.
 */
export async function getFirstItemDemo({ listFn, detailFn, shapeFn, notFoundMessage }, context, lang) {
  const listResult = await listFn({ page: 1, limit: 1, offset: 0 }, context);
  const first = listResult.data?.[0];
  if (!first) {
    throw new AppError(notFoundMessage, HTTP_STATUS.NOT_FOUND);
  }

  const detail = await detailFn({ id: first.id }, context);
  return shapeFn(detail, lang ?? null);
}

/**
 * Fetches the first item across all product types (via the existing products aggregator's
 * own listProducts, which already fetches full detail-level fields) and shapes it via the
 * existing product dispatcher transformer.
 */
export async function getFirstProductDemo({ listProducts, shapeProduct }, context, lang) {
  const result = await listProducts({ page: 1, limit: 1, offset: 0 }, context);
  const first = result.data?.[0];
  if (!first) {
    throw new AppError("No demo product item available.", HTTP_STATUS.NOT_FOUND);
  }

  const shaped = shapeProduct(first, lang ?? null);
  delete shaped._productType;
  return shaped;
}
