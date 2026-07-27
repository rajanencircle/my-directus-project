import { query, param } from 'express-validator';

const VALID_LANG_CODES = ['de', 'en', 'nl'];
const VALID_SORT_VALUES = [
  'name_vehicle', '-name_vehicle',
  'date_updated', '-date_updated',
  'object_id', '-object_id',
];
const VALID_RENTAL_TYPES = ['car', 'camper'];

export const listVehiclesSchema = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
  query('search').optional().isString().trim().isLength({ max: 200 }).withMessage('search must be at most 200 characters'),
  query('category').optional().isInt({ min: 1 }).withMessage('category must be a positive integer ID'),
  query('rental_type').optional().isIn(VALID_RENTAL_TYPES).withMessage(`rental_type must be one of: ${VALID_RENTAL_TYPES.join(', ')}`),
  query('lang').optional().isIn(VALID_LANG_CODES).withMessage(`lang must be one of: ${VALID_LANG_CODES.join(', ')}`),
  query('language').optional().isIn(VALID_LANG_CODES).withMessage(`language must be one of: ${VALID_LANG_CODES.join(', ')}`),
  query('sort').optional().isIn(VALID_SORT_VALUES).withMessage(`sort must be one of: ${VALID_SORT_VALUES.join(', ')}`),
  query('updated_after').optional().isISO8601().withMessage('updated_after must be a valid ISO 8601 date-time'),
];

export const getVehicleDetailSchema = [
  param('id').notEmpty().isString().trim().withMessage('id path parameter is required'),
  query('lang').optional().isIn(VALID_LANG_CODES).withMessage(`lang must be one of: ${VALID_LANG_CODES.join(', ')}`),
  query('language').optional().isIn(VALID_LANG_CODES).withMessage(`language must be one of: ${VALID_LANG_CODES.join(', ')}`),
];
