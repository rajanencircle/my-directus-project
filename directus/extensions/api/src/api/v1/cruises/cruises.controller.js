import { sendSuccess, sendPaginated } from "../../shared/apiResponse.js";
import { parsePagination } from "../../shared/pagination.js";
import { listCruises, getCruiseDetails } from "./cruises.service.js";
import { shapeCruiseDetail } from "../../../transformers/cruise.transformer.js";

export function createCruisesController(context) {
  return {
    async index(req, res) {
      const { page, limit, offset } = parsePagination(req.query);
      const { search, country, destination, season, sort, updated_after, status_primarix } = req.query;

      const result = await listCruises(
        { page, limit, offset, search, country, destination, season, sort, updated_after, status_primarix },
        context,
      );
      const data = result.data.map(({ id, object_id, date_updated }) => ({ id, object_id, date_updated }));
      return sendPaginated(res, { ...result, data });
    },

    async detail(req, res) {
      const { id } = req.params;
      const lang = req.query.lang ?? req.query.language ?? null;

      const cruise = await getCruiseDetails({ id }, context);
      const shaped = shapeCruiseDetail(cruise, lang ?? null);
      return sendSuccess(res, shaped);
    },
  };
}
