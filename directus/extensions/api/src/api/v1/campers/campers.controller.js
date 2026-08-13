import { createCollectionController } from "../../shared/createCollectionController.js";
import { listSlimCampers, listFullCampers, getCamperDetails } from "./campers.service.js";
import { shapeCamperDetail, shapeCamperListItem } from "../../../transformers/camper.transformer.js";

export const createCampersController = createCollectionController({
  listSlim: listSlimCampers,
  listFull: listFullCampers,
  getDetails: getCamperDetails,
  shapeListItem: shapeCamperListItem,
  shapeDetail: shapeCamperDetail,
});
