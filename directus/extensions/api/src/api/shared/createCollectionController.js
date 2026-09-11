import { sendSuccess, sendPaginated } from "./apiResponse.js";
import { parsePagination } from "./pagination.js";
import { resolveAudience } from "./resolveAudience.js";
import { applyPartnerMediaFilter } from "../../utils/images.js";

/* Shared index/fullList/detail controller shape for every list-resource
 * (hotels/cruises/tours/excursions/rental_cars/campers); each collection's controller.js
 * just supplies its four resource-specific functions. */
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
        // Slim list never exposes backoffice-only fields, so shapeListItem takes no
        // audience — unlike fullList/detail below, which resolve one for shapeDetail.
        const { page, limit, offset } = parsePagination(req.query);
        const { publishing_status } = req.query;
        const { apiUser } = req.context;

        const result = await listSlim(
          { page, limit, offset, publishing_status, apiUser },
          context,
        );
        const lang = req.query.lang ?? null;
        const data = result.data.map((item) =>
          shapeListItem(applyPartnerMediaFilter(item, apiUser), lang),
        );
        return sendPaginated(res, { ...result, data });
      },

      async fullList(req, res) {
        const { page, limit, offset } = parsePagination(req.query);
        const { publishing_status, updated_after } = req.query;
        const lang = req.query.lang ?? null;
        const { apiUser } = req.context;
        const audience = resolveAudience(apiUser);
        req.context.authorization = { ...req.context.authorization, audience };

        const result = await listFull(
          { page, limit, offset, publishing_status, updated_after, apiUser },
          context,
        );

        const data = result.data.map((item) =>
          shapeDetail(applyPartnerMediaFilter(item, apiUser), lang, { audience }),
        );
        return sendPaginated(res, { ...result, data });
      },

      async detail(req, res) {
        const { id } = req.params;
        const lang = req.query.lang ?? req.query.language ?? null;
        const { apiUser } = req.context;
        const audience = resolveAudience(apiUser);
        req.context.authorization = { ...req.context.authorization, audience };

        const item = await getDetails(
          {
            id,
            partnerId: apiUser?.partnerId,
            partnerVisibility: apiUser?.partnerVisibility,
          },
          context,
        );
        const shaped = shapeDetail(
          applyPartnerMediaFilter(item, apiUser),
          lang ?? null,
          { audience },
        );
        return sendSuccess(res, shaped);
      },
    };
  };
}
