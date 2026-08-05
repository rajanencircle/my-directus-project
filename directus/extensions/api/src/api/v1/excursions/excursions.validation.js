import { query, param } from 'express-validator';
import { PRIMARIX_STATUS_QUERY_VALUES } from '../../shared/constants.js';

const VALID_LANG_CODES = ['de', 'en', 'nl'];

export const listSlimExcursionsSchema = [
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

  query('language')
    .optional()
    .isIn(VALID_LANG_CODES)
    .withMessage(`language must be one of: ${VALID_LANG_CODES.join(', ')}`),

  query('publishing_status')
    .optional()
    .isIn(PRIMARIX_STATUS_QUERY_VALUES)
    .withMessage(`publishing_status must be one of: ${PRIMARIX_STATUS_QUERY_VALUES.join(', ')}`),
];

export const listFullExcursionsSchema = [
  ...listSlimExcursionsSchema,
  query('updated_after')
    .optional()
    .isISO8601()
    .withMessage('updated_after must be a valid ISO 8601 date-time'),
];

export const getExcursionDetailSchema = [
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

  query('language')
    .optional()
    .isIn(VALID_LANG_CODES)
    .withMessage(`language must be one of: ${VALID_LANG_CODES.join(', ')}`),
];
