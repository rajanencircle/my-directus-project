import { sendSuccess, sendPaginated } from "../../shared/apiResponse.js";
import { parsePagination } from "../../shared/pagination.js";
import { listHotels, getHotelDetails } from "./hotels.service.js";
import { shapeHotelDetail } from "../../../transformers/hotel.transformer.js";

export function createHotelsController(context) {
  return {
    async index(req, res) {
      const { page, limit, offset } = parsePagination(req.query);
      const { search, country, sort, updated_after } = req.query;
      const lang = req.query.lang ?? req.query.language ?? null;

      const result = await listHotels(
        { page, limit, offset, search, country, sort, updated_after },
        context,
      );
      const data = result.data.map((item) => shapeHotelDetail(item, lang));
      return sendPaginated(res, { ...result, data });
    },

    async detail(req, res) {
      const { id } = req.params;
      const lang = req.query.lang ?? req.query.language ?? null;

      const hotel = await getHotelDetails({ id }, context);
      const shaped = shapeHotelDetail(hotel, lang ?? null);
      return sendSuccess(res, shaped);
    },
  };
}
