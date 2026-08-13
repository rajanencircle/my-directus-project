import { createCollectionController } from "../../shared/createCollectionController.js";
import { listSlimExcursions, listFullExcursions, getExcursionDetails } from "./excursions.service.js";
import { shapeExcursionDetail, shapeExcursionListItem } from "../../../transformers/excursion.transformer.js";

export const createExcursionsController = createCollectionController({
  listSlim: listSlimExcursions,
  listFull: listFullExcursions,
  getDetails: getExcursionDetails,
  shapeListItem: shapeExcursionListItem,
  shapeDetail: shapeExcursionDetail,
});
