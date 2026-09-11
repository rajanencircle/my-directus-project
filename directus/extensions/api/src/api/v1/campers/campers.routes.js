import { createCollectionResource } from "../../shared/createCollectionResource.js";
import { campers as filters } from "../../shared/collectionFilters.js";
import { LIST_FIELDS } from "./campers.fields.js";
import { shapeCamperListItem, shapeCamperDetail } from "../../../transformers/camper.transformer.js";
import { getCamperDetails } from "./campers.service.js";

export const setupCampersRoutes = createCollectionResource({
  collection: "vehicles",
  resourceLabel: "camper",
  listFields: LIST_FIELDS,
  filters: filters,
  getDetails: getCamperDetails,
  shapeListItem: shapeCamperListItem,
  shapeDetail: shapeCamperDetail,
});
