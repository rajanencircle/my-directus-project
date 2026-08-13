import { createStandardValidation } from "../../shared/createStandardValidation.js";

const { listSlimSchema, listFullSchema, getDetailSchema } =
  createStandardValidation();

export const listSlimToursSchema = listSlimSchema;
export const listFullToursSchema = listFullSchema;
export const getTourDetailSchema = getDetailSchema;
