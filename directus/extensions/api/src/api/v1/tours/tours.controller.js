import { createCollectionController } from "../../shared/createCollectionController.js";
import { listSlimTours, listFullTours, getTourDetails } from "./tours.service.js";
import { shapeTourDetail, shapeTourListItem } from "../../../transformers/tour.transformer.js";

export const createToursController = createCollectionController({
  listSlim: listSlimTours,
  listFull: listFullTours,
  getDetails: getTourDetails,
  shapeListItem: shapeTourListItem,
  shapeDetail: shapeTourDetail,
});
