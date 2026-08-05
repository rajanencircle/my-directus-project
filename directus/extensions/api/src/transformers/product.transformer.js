import { shapeHotelDetail } from "./hotel.transformer.js";
import { shapeCruiseDetail } from "./cruise.transformer.js";
import { shapeTourDetail } from "./tour.transformer.js";
import { shapeExcursionDetail } from "./excursion.transformer.js";
import { shapeRentalCarDetail } from "./rental_car.transformer.js";
import { shapeCamperDetail } from "./camper.transformer.js";
import { stripToWebDetail } from "../shared/response/webDetail.js";

/**
 * Dispatches a raw product item to the correct per-type transformer.
 * The `type` field on each item determines which transformer is called.
 *
 * @param {object} item - raw product item with a `_productType` discriminator set by the service
 * @param {string|null} lang - ISO 639-1 language code or null
 * @returns {object} shaped product item (ProductDetail shape wrapping a WebDetail)
 */
export function shapeProduct(item, lang) {
  let shapedDetail;
  switch (item._productType) {
    case "hotel":
      shapedDetail = shapeHotelDetail(item, lang);
      break;
    case "cruise":
      shapedDetail = shapeCruiseDetail(item, lang);
      break;
    case "tour":
      shapedDetail = shapeTourDetail(item, lang);
      break;
    case "excursion":
      shapedDetail = shapeExcursionDetail(item, lang);
      break;
    case "rental_car":
      shapedDetail = shapeRentalCarDetail(item, lang);
      break;
    case "camper":
      shapedDetail = shapeCamperDetail(item, lang);
      break;
    default:
      return { type: item._productType ?? "unknown", id: item.id, ...item };
  }

  // shapeProduct is only called by the /products endpoints, which are public web consumers.
  // The contract specifies ProductDetail returns the WebDetail shape for its payload.
  return {
    id: item.id,
    object_id: item.object_id ?? null,
    product_type: item._productType,
    title: shapedDetail.name ?? shapedDetail.title ?? null,
    date_updated: shapedDetail.date_updated ?? null,
    details: stripToWebDetail(shapedDetail, { productType: item._productType }),
  };
}
