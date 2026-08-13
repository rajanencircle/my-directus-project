import { param, query } from 'express-validator';
import { VALID_LANG_CODES } from '../../shared/constants.js';

export const listProductsSchema = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 200 })
    .withMessage('limit must be between 1 and 200'),

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
