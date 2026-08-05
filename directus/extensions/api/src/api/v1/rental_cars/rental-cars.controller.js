import { sendSuccess, sendPaginated } from "../../shared/apiResponse.js";
import { parsePagination } from "../../shared/pagination.js";
import { listSlimRentalCars, listFullRentalCars, getRentalCarDetails } from "./rental-cars.service.js";
import { shapeRentalCarDetail, shapeRentalCarListItem } from "../../../transformers/rental_car.transformer.js";

export function createRentalCarsController(context) {
  return {
    async index(req, res) {
      const { page, limit, offset } = parsePagination(req.query);
      const { publishing_status } = req.query;

      const result = await listSlimRentalCars(
        { page, limit, offset, publishing_status },
        context,
      );
      const lang = req.query.lang ?? req.query.language ?? null;
      const data = result.data.map(item => shapeRentalCarListItem(item, lang));
      return sendPaginated(res, { ...result, data });
    },

    async fullList(req, res) {
      const { page, limit, offset } = parsePagination(req.query);
      const { publishing_status, updated_after } = req.query;
      const lang = req.query.lang ?? req.query.language ?? null;

      const result = await listFullRentalCars(
        { page, limit, offset, publishing_status, updated_after },
        context,
      );
      
      const data = result.data.map(rentalCar => shapeRentalCarDetail(rentalCar, lang));
      return sendPaginated(res, { ...result, data });
    },

    async detail(req, res) {
      const { id } = req.params;
      const lang = req.query.lang ?? req.query.language ?? null;

      const rentalCar = await getRentalCarDetails({ id }, context);
      const shaped = shapeRentalCarDetail(rentalCar, lang ?? null);
      return sendSuccess(res, shaped);
    },
  };
}
