import { shapeHotelListItem } from './hotel.transformer.js';
import { shapeCruise } from './cruise.transformer.js';

/**
 * Dispatches a raw product item to the correct per-type transformer.
 * The `type` field on each item determines which transformer is called.
 *
 * @param {object} item - raw product item with a `_productType` discriminator set by the service
 * @param {string|null} lang - ISO 639-1 language code or null
 * @returns {object} shaped product item
 */
export function shapeProduct(item, lang) {
  switch (item._productType) {
    case 'hotel':
      return shapeHotelListItem(item, lang);
    case 'cruise':
      return shapeCruise(item, lang);
    default:
      return { type: item._productType ?? 'unknown', id: item.id, ...item };
  }
}
