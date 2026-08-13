import { DETAIL_FIELDS } from "./campers.fields.js";
import { createQueryConfig } from "../../shared/createQueryConfig.js";

export const { ROOT_COLLECTION, DETAIL_RELATIONS } = createQueryConfig(
  "vehicles",
  DETAIL_FIELDS,
);
