import { createCollectionResource } from "../../shared/createCollectionResource.js";
import { excursions as filters } from "../../shared/collectionFilters.js";
import { LIST_FIELDS } from "./excursions.fields.js";
import { shapeExcursionListItem, shapeExcursionDetail } from "../../../transformers/excursion.transformer.js";
import { getExcursionDetails } from "./excursions.service.js";

export const setupExcursionsRoutes = createCollectionResource({
  collection: "excursions",
  resourceLabel: "excursion",
  listFields: LIST_FIELDS,
  filters: filters,
  getDetails: getExcursionDetails,
  shapeListItem: shapeExcursionListItem,
  shapeDetail: shapeExcursionDetail,
});
