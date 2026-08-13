import { DETAIL_FIELDS } from "./tours.fields.js";
import { createQueryConfig } from "../../shared/createQueryConfig.js";

export const { ROOT_COLLECTION, DETAIL_RELATIONS } = createQueryConfig(
  "tours",
  DETAIL_FIELDS,
);
