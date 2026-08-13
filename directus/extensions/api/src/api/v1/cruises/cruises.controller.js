import { createCollectionController } from "../../shared/createCollectionController.js";
import { listSlimCruises, listFullCruises, getCruiseDetails } from "./cruises.service.js";
import { shapeCruiseDetail, shapeCruiseListItem } from "../../../transformers/cruise.transformer.js";

export const createCruisesController = createCollectionController({
  listSlim: listSlimCruises,
  listFull: listFullCruises,
  getDetails: getCruiseDetails,
  shapeListItem: shapeCruiseListItem,
  shapeDetail: shapeCruiseDetail,
});
