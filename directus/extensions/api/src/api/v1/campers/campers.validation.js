import { createStandardValidation } from "../../shared/createStandardValidation.js";

const { listSlimSchema, listFullSchema, getDetailSchema } =
  createStandardValidation();

export const listSlimCampersSchema = listSlimSchema;
export const listFullCampersSchema = listFullSchema;
export const getCamperDetailSchema = getDetailSchema;
