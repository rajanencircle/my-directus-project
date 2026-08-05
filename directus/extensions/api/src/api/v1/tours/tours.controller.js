import { sendSuccess, sendPaginated } from "../../shared/apiResponse.js";
import { parsePagination } from "../../shared/pagination.js";
import { listSlimTours, listFullTours, getTourDetails } from "./tours.service.js";
import { shapeTourDetail, shapeTourListItem } from "../../../transformers/tour.transformer.js";

export function createToursController(context) {
  return {
    async index(req, res) {
      const { page, limit, offset } = parsePagination(req.query);
      const { publishing_status } = req.query;

      const result = await listSlimTours(
        { page, limit, offset, publishing_status },
        context,
      );
      const lang = req.query.lang ?? req.query.language ?? null;
      const data = result.data.map(item => shapeTourListItem(item, lang));
      return sendPaginated(res, { ...result, data });
    },

    async fullList(req, res) {
      const { page, limit, offset } = parsePagination(req.query);
      const { publishing_status, updated_after } = req.query;
      const lang = req.query.lang ?? req.query.language ?? null;

      const result = await listFullTours(
        { page, limit, offset, publishing_status, updated_after },
        context,
      );
      
      const data = result.data.map(tour => shapeTourDetail(tour, lang));
      return sendPaginated(res, { ...result, data });
    },

    async detail(req, res) {
      const { id } = req.params;
      const lang = req.query.lang ?? req.query.language ?? null;

      const tour = await getTourDetails({ id }, context);
      const shaped = shapeTourDetail(tour, lang ?? null);
      return sendSuccess(res, shaped);
    },
  };
}
