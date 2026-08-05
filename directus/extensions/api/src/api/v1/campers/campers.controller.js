import { sendSuccess, sendPaginated } from "../../shared/apiResponse.js";
import { parsePagination } from "../../shared/pagination.js";
import { listSlimCampers, listFullCampers, getCamperDetails } from "./campers.service.js";
import { shapeCamperDetail, shapeCamperListItem } from "../../../transformers/camper.transformer.js";

export function createCampersController(context) {
  return {
    async index(req, res) {
      const { page, limit, offset } = parsePagination(req.query);
      const { publishing_status } = req.query;

      const result = await listSlimCampers(
        { page, limit, offset, publishing_status },
        context,
      );
      const lang = req.query.lang ?? req.query.language ?? null;
      const data = result.data.map(item => shapeCamperListItem(item, lang));
      return sendPaginated(res, { ...result, data });
    },

    async fullList(req, res) {
      const { page, limit, offset } = parsePagination(req.query);
      const { publishing_status, updated_after } = req.query;
      const lang = req.query.lang ?? req.query.language ?? null;

      const result = await listFullCampers(
        { page, limit, offset, publishing_status, updated_after },
        context,
      );
      
      const data = result.data.map(camper => shapeCamperDetail(camper, lang));
      return sendPaginated(res, { ...result, data });
    },

    async detail(req, res) {
      const { id } = req.params;
      const lang = req.query.lang ?? req.query.language ?? null;

      const camper = await getCamperDetails({ id }, context);
      const shaped = shapeCamperDetail(camper, lang ?? null);
      return sendSuccess(res, shaped);
    },
  };
}
