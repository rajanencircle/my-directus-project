import { sendSuccess, sendPaginated } from "../../shared/apiResponse.js";
import { parsePagination } from "../../shared/pagination.js";
import { listTours, getTourDetails } from "./tours.service.js";
import { shapeTourDetail } from "../../../transformers/tour.transformer.js";

export function createToursController(context) {
  return {
    async index(req, res) {
      const { page, limit, offset } = parsePagination(req.query);
      const { search, country, region, state, season, sort, updated_after, status_primarix } = req.query;

      const result = await listTours(
        { page, limit, offset, search, country, region, state, season, sort, updated_after, status_primarix },
        context,
      );
      const data = result.data.map(({ id, object_id, name, date_updated }) => ({ id, object_id, name, date_updated }));
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
