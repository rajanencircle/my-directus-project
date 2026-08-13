import { createCollectionResource } from "../../shared/createCollectionResource.js";
import { hotels as filters } from "../../shared/collectionFilters.js";
import { LIST_FIELDS } from "./hotels.fields.js";
import { shapeHotelListItem, shapeHotelDetail } from "../../../transformers/hotel.transformer.js";
import { getHotelDetails } from "./hotels.service.js";

export const setupHotelsRoutes = createCollectionResource({
  collection: "hotels",
  resourceLabel: "hotel",
  listFields: LIST_FIELDS,
  filters: filters,
  getDetails: getHotelDetails,
  shapeListItem: shapeHotelListItem,
  shapeDetail: shapeHotelDetail,
});
