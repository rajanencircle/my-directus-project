import { sendSuccess } from "../../shared/apiResponse.js";
import { getFirstItemDemo, getFirstProductDemo } from "./demo.service.js";

import { listHotels, getHotelDetails } from "../hotels/hotels.service.js";
import { shapeHotelDetail } from "../../../transformers/hotel.transformer.js";
import { listTours, getTourDetails } from "../tours/tours.service.js";
import { shapeTourDetail } from "../../../transformers/tour.transformer.js";
import { listExcursions, getExcursionDetails } from "../excursions/excursions.service.js";
import { shapeExcursionDetail } from "../../../transformers/excursion.transformer.js";
import { listCruises, getCruiseDetails } from "../cruises/cruises.service.js";
import { shapeCruiseDetail } from "../../../transformers/cruise.transformer.js";
import { listVehicles, getVehicleDetails } from "../vehicles/vehicles.service.js";
import { shapeVehicleDetail } from "../../../transformers/vehicle.transformer.js";
import { listProducts } from "../products/products.service.js";
import { shapeProduct } from "../../../transformers/product.transformer.js";

const DEMO_MESSAGE = "Demo item (first published record) — no API key required.";

function getLang(req) {
  return req.query.lang ?? req.query.language ?? null;
}

/**
 * Public, unauthenticated "demo" endpoints — each returns the first published item for
 * that product type (or, for /products/demo, the first item across all product types),
 * shaped exactly like the real authenticated detail endpoint. Composes each product's
 * already-existing list/detail/transformer functions; no new query or shaping logic.
 */
export function createDemoController(context) {
  return {
    async hotel(req, res) {
      const shaped = await getFirstItemDemo(
        { listFn: listHotels, detailFn: getHotelDetails, shapeFn: shapeHotelDetail, notFoundMessage: "No demo hotel available." },
        context,
        getLang(req),
      );
      return sendSuccess(res, shaped, { message: DEMO_MESSAGE });
    },

    async tour(req, res) {
      const shaped = await getFirstItemDemo(
        { listFn: listTours, detailFn: getTourDetails, shapeFn: shapeTourDetail, notFoundMessage: "No demo tour available." },
        context,
        getLang(req),
      );
      return sendSuccess(res, shaped, { message: DEMO_MESSAGE });
    },

    async excursion(req, res) {
      const shaped = await getFirstItemDemo(
        { listFn: listExcursions, detailFn: getExcursionDetails, shapeFn: shapeExcursionDetail, notFoundMessage: "No demo excursion available." },
        context,
        getLang(req),
      );
      return sendSuccess(res, shaped, { message: DEMO_MESSAGE });
    },

    async cruise(req, res) {
      const shaped = await getFirstItemDemo(
        { listFn: listCruises, detailFn: getCruiseDetails, shapeFn: shapeCruiseDetail, notFoundMessage: "No demo cruise available." },
        context,
        getLang(req),
      );
      return sendSuccess(res, shaped, { message: DEMO_MESSAGE });
    },

    async vehicle(req, res) {
      const shaped = await getFirstItemDemo(
        { listFn: listVehicles, detailFn: getVehicleDetails, shapeFn: shapeVehicleDetail, notFoundMessage: "No demo vehicle available." },
        context,
        getLang(req),
      );
      return sendSuccess(res, shaped, { message: DEMO_MESSAGE });
    },

    async products(req, res) {
      const shaped = await getFirstProductDemo({ listProducts, shapeProduct }, context, getLang(req));
      return sendSuccess(res, shaped, { message: DEMO_MESSAGE });
    },
  };
}
