import { sendSuccess, sendPaginated } from "../../shared/apiResponse.js";
import { parsePagination } from "../../shared/pagination.js";
import { listVehicles, getVehicleDetails } from "./vehicles.service.js";
import { shapeVehicleDetail } from "../../../transformers/vehicle.transformer.js";

export function createVehiclesController(context) {
  return {
    async index(req, res) {
      const { page, limit, offset } = parsePagination(req.query);
      const { search, category, rental_type, sort, updated_after, status_primarix } = req.query;

      const result = await listVehicles(
        { page, limit, offset, search, category, rental_type, sort, updated_after, status_primarix },
        context,
      );
      const data = result.data.map(({ id, object_id, name_vehicle, date_updated }) => ({ id, object_id, name: name_vehicle, date_updated }));
      return sendPaginated(res, { ...result, data });
    },

    async detail(req, res) {
      const { id } = req.params;
      const lang = req.query.lang ?? req.query.language ?? null;

      const vehicle = await getVehicleDetails({ id }, context);
      const shaped = shapeVehicleDetail(vehicle, lang ?? null);
      return sendSuccess(res, shaped);
    },
  };
}
