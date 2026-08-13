import { createStandardValidation } from "../../shared/createStandardValidation.js";

const { listSlimSchema, listFullSchema, getDetailSchema } =
  createStandardValidation();

export const listSlimExcursionsSchema = listSlimSchema;
export const listFullExcursionsSchema = listFullSchema;
export const getExcursionDetailSchema = getDetailSchema;
