import { shapeHotelDetail } from "./hotel.transformer.js";
import { shapeCruiseDetail } from "./cruise.transformer.js";
import { shapeTourDetail } from "./tour.transformer.js";
import { shapeExcursionDetail } from "./excursion.transformer.js";
import { shapeRentalCarDetail } from "./rental_car.transformer.js";
import { shapeCamperDetail } from "./camper.transformer.js";
import { DEFAULT_PRIMARIX_STATUS } from "../api/shared/constants.js";

/*
 * Map of product types to their respective transformer functions.
 * Transformers support an `audience` option to output either the full backoffice payload
 * or a restricted web-safe payload, leveraging the centralized visibility mechanism.
 */
const SHAPERS = {
  hotel: shapeHotelDetail,
  cruise: shapeCruiseDetail,
  tour: shapeTourDetail,
  excursion: shapeExcursionDetail,
  rental_car: shapeRentalCarDetail,
  camper: shapeCamperDetail,
};

/**
 * Dispatches a raw product item to the correct per-type transformer.
 * The `type` field on each item determines which transformer is called.
 *
 * @param {object} item - raw product item with a `_productType` discriminator set by the service
 * @param {string|null} lang - ISO 639-1 language code or null
 * @param {object} [opts]
 * @param {boolean} [opts.allowTombstone=false] - if true, a non-published item is collapsed
 *   into a tombstone ({ details: null }) instead of a full body. Only /products/full sets
 *   this — /products/{id} always returns full details regardless of status, same as before.
 * @returns {object|null} shaped product item (ProductDetail shape wrapping a WebDetail),
 *   or null if `_productType` doesn't match any known shaper (should not happen in
 *   practice — PRODUCT_TYPE_REGISTRY only ever sets one of the keys above — but this is a
 *   defined, safe fallback instead of leaking the raw Directus row).
 */
export function shapeProduct(item, lang, { allowTombstone = false } = {}) {
  const shaper = SHAPERS[item._productType];
  if (!shaper) return null;

  /*
   * Initially shape the data for the backoffice to extract internal metadata fields
   * like `status`, `name`, and `date_updated`, which are stripped from the web payload.
   * This intentional double-pass ensures metadata is accurately hoisted before restriction.
   */
  const shapedDetail = shaper(item, lang);

  const publishingStatus = shapedDetail.publishing_status ?? null;
  const isPublished = publishingStatus === DEFAULT_PRIMARIX_STATUS;

  /*
   * Tombstone generation: For items matched by a delta cursor (`updated_after`) that are no
   * longer published, return a minimal tombstone representation. This allows downstream
   * systems syncing deltas to detect and process de-published entities.
   */
  if (!isPublished && allowTombstone) {
    return {
      id: item.id,
      object_id: item.object_id ?? null,
      product_type: item._productType,
      title: null,
      publishing_status: publishingStatus,
      date_updated: shapedDetail.date_updated ?? null,
      details: null,
    };
  }

  /*
   * Construct the final `ProductDetail` envelope. This is primarily consumed by public
   * web endpoints, so the nested `details` are restricted using the 'web' audience shape.
   */
  return {
    id: item.id,
    object_id: item.object_id ?? null,
    product_type: item._productType,
    title: shapedDetail.name ?? shapedDetail.title ?? null,
    publishing_status: publishingStatus,
    date_updated: shapedDetail.date_updated ?? null,
    details: shaper(item, lang, { audience: "web" }),
  };
}
