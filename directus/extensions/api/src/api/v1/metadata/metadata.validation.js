import { query } from 'express-validator';

const VALID_LANG_CODES = ['de', 'en', 'nl'];
const VALID_MAP_COLLECTIONS = ['hotels', 'tours', 'excursions', 'vehicles', 'cruises', 'rental_companies', 'rental_depots'];
const VALID_LABEL_COLLECTIONS = ['hotels', 'cruises', 'excursions', 'tours', 'rental_cars', 'campers'];
const VALID_STATUS_VALUES = ['active', 'renamed', 'new', 'outdated'];
const VALID_SHAPE_VALUES = ['flat', 'nested'];
const VALID_PUBLISHING_STATUS = ['draft', 'published', 'unpublished', 'archived', 'deleted', 'all'];

export const getFieldMapSchema = [
  query('collection')
    .optional()
    .isIn(VALID_MAP_COLLECTIONS)
    .withMessage(`collection must be one of: ${VALID_MAP_COLLECTIONS.join(', ')}`),

  query('status')
    .optional()
    .isIn(VALID_STATUS_VALUES)
    .withMessage(`status must be one of: ${VALID_STATUS_VALUES.join(', ')}`),

  query('shape')
    .optional()
    .isIn(VALID_SHAPE_VALUES)
    .withMessage(`shape must be one of: ${VALID_SHAPE_VALUES.join(', ')}`),
];

export const getLabelsSchema = [
  query('lang')
    .notEmpty()
    .withMessage('lang is required')
    .isIn(VALID_LANG_CODES)
    .withMessage(`lang must be one of: ${VALID_LANG_CODES.join(', ')}`),

  query('collection')
    .optional()
    .isIn(VALID_LABEL_COLLECTIONS)
    .withMessage(`collection must be one of: ${VALID_LABEL_COLLECTIONS.join(', ')}`),
];

export const getProductTypesSchema = [
  query('publishing_status')
    .optional()
    .isIn(VALID_PUBLISHING_STATUS)
    .withMessage(`publishing_status must be one of: ${VALID_PUBLISHING_STATUS.join(', ')}`),
];
