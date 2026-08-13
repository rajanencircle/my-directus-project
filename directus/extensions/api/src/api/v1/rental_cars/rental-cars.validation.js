import { createStandardValidation } from "../../shared/createStandardValidation.js";

const { listSlimSchema, listFullSchema, getDetailSchema } =
  createStandardValidation();

export const listSlimRentalCarsSchema = listSlimSchema;
export const listFullRentalCarsSchema = listFullSchema;
export const getRentalCarDetailSchema = getDetailSchema;
