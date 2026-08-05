import { param, query } from 'express-validator';

const VALID_LANG_CODES = ['de', 'en', 'nl'];
export const listProductsSchema = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100'),

  query('lang')
    .notEmpty()
    .withMessage('lang is required')
    .isIn(VALID_LANG_CODES)
    .withMessage(`lang must be one of: ${VALID_LANG_CODES.join(', ')}`),

  query('updated_after')
    .optional()
    .isISO8601()
    .withMessage('updated_after must be a valid ISO 8601 date-time'),
];

export const getProductDetailSchema = [
  param('id')
    .notEmpty()
    .isString()
    .trim()
    .withMessage('id path parameter is required'),

  query('lang')
    .notEmpty()
    .withMessage('lang is required')
    .isIn(VALID_LANG_CODES)
    .withMessage(`lang must be one of: ${VALID_LANG_CODES.join(', ')}`),
];
