import { sendSuccess, sendPaginated } from "../../shared/apiResponse.js";
import { parsePagination } from "../../shared/pagination.js";
import { listSlimExcursions, listFullExcursions, getExcursionDetails } from "./excursions.service.js";
import { shapeExcursionDetail, shapeExcursionListItem } from "../../../transformers/excursion.transformer.js";

export function createExcursionsController(context) {
  return {
    async index(req, res) {
      const { page, limit, offset } = parsePagination(req.query);
      const { publishing_status } = req.query;

      const result = await listSlimExcursions(
        { page, limit, offset, publishing_status },
        context,
      );
      const lang = req.query.lang ?? req.query.language ?? null;
      const data = result.data.map(item => shapeExcursionListItem(item, lang));
      return sendPaginated(res, { ...result, data });
    },

    async fullList(req, res) {
      const { page, limit, offset } = parsePagination(req.query);
      const { publishing_status, updated_after } = req.query;
      const lang = req.query.lang ?? req.query.language ?? null;

      const result = await listFullExcursions(
        { page, limit, offset, publishing_status, updated_after },
        context,
      );
      
      const data = result.data.map(excursion => shapeExcursionDetail(excursion, lang));
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
