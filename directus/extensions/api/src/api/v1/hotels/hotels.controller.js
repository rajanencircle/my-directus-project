import { sendSuccess, sendPaginated } from "../../shared/apiResponse.js";
import { parsePagination } from "../../shared/pagination.js";
import { listSlimHotels, listFullHotels, getHotelDetails } from "./hotels.service.js";
import { shapeHotelDetail, shapeHotelListItem } from "../../../transformers/hotel.transformer.js";

export function createHotelsController(context) {
  return {
    async index(req, res) {
      const { page, limit, offset } = parsePagination(req.query);
      const { publishing_status } = req.query;

      const result = await listSlimHotels(
        { page, limit, offset, publishing_status },
        context,
      );
      const lang = req.query.lang ?? req.query.language ?? null;
      const data = result.data.map(item => shapeHotelListItem(item, lang));
      return sendPaginated(res, { ...result, data });
    },

    async fullList(req, res) {
      const { page, limit, offset } = parsePagination(req.query);
      const { publishing_status, updated_after } = req.query;
      const lang = req.query.lang ?? req.query.language ?? null;

      const result = await listFullHotels(
        { page, limit, offset, publishing_status, updated_after },
        context,
      );
      
      const data = result.data.map(hotel => shapeHotelDetail(hotel, lang));
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
