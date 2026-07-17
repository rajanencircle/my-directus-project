import { sendSuccess, sendPaginated } from "../../shared/apiResponse.js";
import { parsePagination } from "../../shared/pagination.js";
import { listExcursions, getExcursionDetails } from "./excursions.service.js";
import { shapeExcursionDetail } from "../../../transformers/excursion.transformer.js";

export function createExcursionsController(context) {
  return {
    async index(req, res) {
      const { page, limit, offset } = parsePagination(req.query);
      const { search, country, region, state, season, destination, sort, updated_after } = req.query;

      const result = await listExcursions(
        { page, limit, offset, search, country, region, state, season, destination, sort, updated_after },
        context,
      );
      const data = result.data.map(({ id, object_id, name, date_updated }) => ({ id, object_id, name, date_updated }));
      return sendPaginated(res, { ...result, data });
    },

    async detail(req, res) {
      const { id } = req.params;
      const lang = req.query.lang ?? req.query.language ?? null;

      const excursion = await getExcursionDetails({ id }, context);
      const shaped = shapeExcursionDetail(excursion, lang ?? null);
      return sendSuccess(res, shaped);
    },
  };
}
