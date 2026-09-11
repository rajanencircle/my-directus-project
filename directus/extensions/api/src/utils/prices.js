/**
 * @description Standardizes raw exchange rate values into a consistent `{ id, currency, rate }` object shape.
 *
 * If the input is already an object (e.g. enriched from the `rates` collection), it ensures an
 * `id` property exists, defaulting to null when missing. If it is a number or numeric string,
 * it converts the value into a standard rate object with a null id and currency.
 *
 * Pricing transformers use this to guarantee exchange rates always follow the same structure,
 * whether they were fully resolved from the database or patched in manually.
 * 
 * @param {Number|String|Object|null} value - The raw exchange rate value or object.
 * @returns {Object|null} The standardized exchange rate object, or null if invalid.
 */
export function toExchangeRateObject(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === "object") {
    return "id" in value ? value : { id: null, ...value };
  }
  const rate = Number(value);
  if (Number.isNaN(rate)) return null;
  return { id: null, currency: null, rate };
}
