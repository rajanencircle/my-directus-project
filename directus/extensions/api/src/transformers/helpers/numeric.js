/**
 * @description Safely casts a value to a Number, or returns null.
 *
 * Checks that the value is defined and not null before casting it to a Number.
 *
 * Transformers use this to enforce numeric types while avoiding casting `null` or
 * `undefined` to `0` or `NaN`.
 * 
 * @param {*} v - The value to cast.
 * @returns {Number|null} The casted number, or null.
 */
export const toNumOrNull = (v) =>
  v !== undefined && v !== null ? Number(v) : null;
