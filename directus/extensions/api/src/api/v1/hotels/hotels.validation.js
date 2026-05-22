import { query, param } from 'express-validator';

const VALID_LANG_CODES = ['de', 'en', 'nl'];
const VALID_SORT_VALUES = ['name', '-name', 'date_updated', '-date_updated'];

export const listHotelsSchema = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100'),

  query('search')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 200 })
    .withMessage('search must be at most 200 characters'),

  query('country')
    .optional()
    .isInt({ min: 1 })
    .withMessage('country must be a positive integer ID'),

  query('lang')
    .optional()
    .isIn(VALID_LANG_CODES)
    .withMessage(`lang must be one of: ${VALID_LANG_CODES.join(', ')}`),

  query('sort')
    .optional()
    .isIn(VALID_SORT_VALUES)
    .withMessage(`sort must be one of: ${VALID_SORT_VALUES.join(', ')}`),

  query('updated_after')
    .optional()
    .isISO8601()
    .withMessage('updated_after must be a valid ISO 8601 date-time'),

  query('fields')
    .optional()
    .isString()
    .trim()
    .withMessage('fields must be a comma-separated string'),
];

export const getHotelDetailSchema = [
  param('id')
    .notEmpty()
    .isString()
    .trim()
    .withMessage('id path parameter is required'),

  query('lang')
    .optional()
    .isIn(VALID_LANG_CODES)
    .withMessage(`lang must be one of: ${VALID_LANG_CODES.join(', ')}`),
];
