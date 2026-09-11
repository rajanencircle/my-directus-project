import { createCollectionResource } from "../../shared/createCollectionResource.js";
import { tours as filters } from "../../shared/collectionFilters.js";
import { LIST_FIELDS } from "./tours.fields.js";
import { shapeTourListItem, shapeTourDetail } from "../../../transformers/tour.transformer.js";
import { getTourDetails } from "./tours.service.js";

export const setupToursRoutes = createCollectionResource({
  collection: "tours",
  resourceLabel: "tour",
  listFields: LIST_FIELDS,
  filters: filters,
  getDetails: getTourDetails,
  shapeListItem: shapeTourListItem,
  shapeDetail: shapeTourDetail,
});
