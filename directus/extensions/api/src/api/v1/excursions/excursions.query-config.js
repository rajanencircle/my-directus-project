import { DETAIL_FIELDS } from "./excursions.fields.js";
import { createQueryConfig } from "../../shared/createQueryConfig.js";

export const { ROOT_COLLECTION, DETAIL_RELATIONS } = createQueryConfig(
  "excursions",
  DETAIL_FIELDS,
);
