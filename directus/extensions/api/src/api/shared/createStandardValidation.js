import { query, param } from "express-validator";
import { PRIMARIX_STATUS_QUERY_VALUES, VALID_LANG_CODES } from "./constants.js";

// Every list-resource's validation.js (hotels/cruises/tours/excursions/
// rental_cars/campers) declared this exact trio of express-validator
// schemas, differing only in name. This factory is that shared shape.
export function createStandardValidation() {
  const listSlimSchema = [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("page must be a positive integer"),

    query("limit")
      .optional()
      .isInt({ min: 1, max: 200 })
      .withMessage("limit must be between 1 and 200"),

    query("lang")
      .notEmpty()
      .withMessage("lang is required")
      .isIn(VALID_LANG_CODES)
      .withMessage(`lang must be one of: ${VALID_LANG_CODES.join(", ")}`),

    query("publishing_status")
      .optional()
      .isIn(PRIMARIX_STATUS_QUERY_VALUES)
      .withMessage(
        `publishing_status must be one of: ${PRIMARIX_STATUS_QUERY_VALUES.join(", ")}`,
      ),
  ];

  const listFullSchema = [
    ...listSlimSchema,
    query("updated_after")
      .optional()
      .isISO8601()
      .withMessage("updated_after must be a valid ISO 8601 date-time"),
  ];

  const getDetailSchema = [
    param("id")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("id path parameter is required"),

    query("lang")
      .notEmpty()
      .withMessage("lang is required")
      .isIn(VALID_LANG_CODES)
      .withMessage(`lang must be one of: ${VALID_LANG_CODES.join(", ")}`),
  ];

  return { listSlimSchema, listFullSchema, getDetailSchema };
}
