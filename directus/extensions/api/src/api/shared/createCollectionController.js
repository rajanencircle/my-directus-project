import { sendSuccess, sendPaginated } from "./apiResponse.js";
import { parsePagination } from "./pagination.js";

// Every list-resource controller (hotels/cruises/tours/excursions/rental_cars/
// campers) had this exact index/fullList/detail shape, differing only in
// which service + transformer functions they called. This factory is that
// shared shape; each collection's controller.js just supplies its four
// resource-specific functions.
export function createCollectionController({
  listSlim,
  listFull,
  getDetails,
  shapeListItem,
  shapeDetail,
}) {
  return function createController(context) {
    return {
      async index(req, res) {
        const { page, limit, offset } = parsePagination(req.query);
        const { publishing_status } = req.query;

        const result = await listSlim(
          { page, limit, offset, publishing_status },
          context,
        );
        const lang = req.query.lang ?? null;
        const data = result.data.map((item) => shapeListItem(item, lang));
        return sendPaginated(res, { ...result, data });
      },

      async fullList(req, res) {
        const { page, limit, offset } = parsePagination(req.query);
        const { publishing_status, updated_after } = req.query;
        const lang = req.query.lang ?? null;

        const result = await listFull(
          { page, limit, offset, publishing_status, updated_after },
          context,
        );

        const data = result.data.map((item) => shapeDetail(item, lang));
        return sendPaginated(res, { ...result, data });
      },

      async detail(req, res) {
        const { id } = req.params;
        const lang = req.query.lang ?? req.query.language ?? null;

        const item = await getDetails({ id }, context);
        const shaped = shapeDetail(item, lang ?? null);
        return sendSuccess(res, shaped);
      },
    };
  };
}
