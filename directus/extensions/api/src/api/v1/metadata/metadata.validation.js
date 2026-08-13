import { query } from 'express-validator';
import {
  VALID_LANG_CODES,
  VALID_MAP_COLLECTIONS,
  FIELD_MAP_STATUSES as VALID_STATUS_VALUES,
  VALID_SHAPE_VALUES,
  PRIMARIX_STATUS_QUERY_VALUES as VALID_PUBLISHING_STATUS,
} from '../../shared/constants.js';
import { LABEL_COLLECTION_TO_DIRECTUS } from './metadata.service.js';

// Derived from the same source metadata.service.js's /metadata/labels handler actually
// uses to resolve a `collection` param, instead of maintaining a separate duplicate list
// that could silently drift from it.
const VALID_LABEL_COLLECTIONS = Object.keys(LABEL_COLLECTION_TO_DIRECTUS);

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
