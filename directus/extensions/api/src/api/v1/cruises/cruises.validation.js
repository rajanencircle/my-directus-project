import { createStandardValidation } from "../../shared/createStandardValidation.js";

const { listSlimSchema, listFullSchema, getDetailSchema } =
  createStandardValidation();

export const listSlimCruisesSchema = listSlimSchema;
export const listFullCruisesSchema = listFullSchema;
export const getCruiseDetailSchema = getDetailSchema;
