import { createCollectionResource } from "../../shared/createCollectionResource.js";
import { cruises as filters } from "../../shared/collectionFilters.js";
import { LIST_FIELDS } from "./cruises.fields.js";
import { shapeCruiseListItem, shapeCruiseDetail } from "../../../transformers/cruise.transformer.js";
import { getCruiseDetails } from "./cruises.service.js";

export const setupCruisesRoutes = createCollectionResource({
  collection: "cruises",
  resourceLabel: "cruise",
  listFields: LIST_FIELDS,
  filters: filters,
  getDetails: getCruiseDetails,
  shapeListItem: shapeCruiseListItem,
  shapeDetail: shapeCruiseDetail,
});
