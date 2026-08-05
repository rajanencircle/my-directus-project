import { sendSuccess, sendPaginated } from "../../shared/apiResponse.js";
import { parsePagination } from "../../shared/pagination.js";
import { listSlimCruises, listFullCruises, getCruiseDetails } from "./cruises.service.js";
import { shapeCruiseDetail, shapeCruiseListItem } from "../../../transformers/cruise.transformer.js";

export function createCruisesController(context) {
  return {
    async index(req, res) {
      const { page, limit, offset } = parsePagination(req.query);
      const { publishing_status } = req.query;

      const result = await listSlimCruises(
        { page, limit, offset, publishing_status },
        context,
      );
      const lang = req.query.lang ?? req.query.language ?? null;
      const data = result.data.map(item => shapeCruiseListItem(item, lang));
      return sendPaginated(res, { ...result, data });
    },

    async fullList(req, res) {
      const { page, limit, offset } = parsePagination(req.query);
      const { publishing_status, updated_after } = req.query;
      const lang = req.query.lang ?? req.query.language ?? null;

      const result = await listFullCruises(
        { page, limit, offset, publishing_status, updated_after },
        context,
      );
      
      const data = result.data.map(cruise => shapeCruiseDetail(cruise, lang));
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
