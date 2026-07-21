import { query } from 'express-validator';

const VALID_LANG_CODES = ['de', 'de-CH', 'en', 'nl'];

export const demoSchema = [
  query('lang')
    .optional()
    .isIn(VALID_LANG_CODES)
    .withMessage(`lang must be one of: ${VALID_LANG_CODES.join(', ')}`),
  query('language')
    .optional()
    .isIn(VALID_LANG_CODES)
    .withMessage(`language must be one of: ${VALID_LANG_CODES.join(', ')}`),
];
