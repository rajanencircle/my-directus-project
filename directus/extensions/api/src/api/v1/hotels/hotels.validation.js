import { query, param } from 'express-validator';

const VALID_LANG_CODES = ['de', 'de-CH', 'en', 'nl'];
const VALID_SORT_VALUES = [
  'name', '-name',
  'date_updated', '-date_updated',
  'object_id', '-object_id',
  'season', '-season',
];

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

  query('hotel_group')
    .optional()
    .isUUID()
    .withMessage('hotel_group must be a valid UUID'),

  query('hotel_classification')
    .optional()
    .isUUID()
    .withMessage('hotel_classification must be a valid UUID'),

  query('region')
    .optional()
    .isInt({ min: 1 })
    .withMessage('region must be a positive integer ID'),

  query('state')
    .optional()
    .isInt({ min: 1 })
    .withMessage('state must be a positive integer ID'),

  query('activity')
    .optional()
    .isUUID()
    .withMessage('activity must be a valid UUID'),

  query('season')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 50 })
    .withMessage('season must be a string (max 50 chars)'),

  query('lang')
    .optional()
    .isIn(VALID_LANG_CODES)
    .withMessage(`lang must be one of: ${VALID_LANG_CODES.join(', ')}`),

  query('language')
    .optional()
    .isIn(VALID_LANG_CODES)
    .withMessage(`language must be one of: ${VALID_LANG_CODES.join(', ')}`),

  query('sort')
    .optional()
    .isIn(VALID_SORT_VALUES)
    .withMessage(`sort must be one of: ${VALID_SORT_VALUES.join(', ')}`),

  query('updated_after')
    .optional()
    .isISO8601()
    .withMessage('updated_after must be a valid ISO 8601 date-time'),
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

  query('language')
    .optional()
    .isIn(VALID_LANG_CODES)
    .withMessage(`language must be one of: ${VALID_LANG_CODES.join(', ')}`),
];
