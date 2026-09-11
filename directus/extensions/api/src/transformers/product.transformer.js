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
 * @description Routes a generic product item to its specific shape function based on `_productType`.
 *
 * Products can be of multiple types (hotel, tour, camper, etc.), so this function looks up the
 * correct shaping function from the local `SHAPERS` map above (keyed the same way as
 * products.service.js's separate `PRODUCT_TYPE_REGISTRY`, which tags each item's
 * `_productType` in the first place) and acts as a dispatcher to format the product
 * correctly. When `allowTombstone` is true and the item is not published, a minimal
 * tombstone object is returned instead of leaking data.
 *
 * This is used by the unified `/products` endpoint, which returns a heterogeneous list of
 * different product types.
 *
 * @param {Object} item - The raw product item from Directus.
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
export function shapeProduct(item, lang, { allowTombstone = false, audience = "web" } = {}) {
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
    details: shaper(item, lang, { audience }),
  };
}
