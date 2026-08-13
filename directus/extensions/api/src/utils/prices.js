export function toExchangeRateObject(value) {
  if (value === undefined || value === null) return null;
  // Objects reaching here are either already resolved by enrichExchangeRates()
  // (a real { id, currency, rate } from the `rates` collection) or a { currency, rate }
  // patch from ratesResolver's vehicle enrichment (no real id) — default id to null
  // only when it isn't already set, never overwrite a resolved one.
  if (typeof value === "object") {
    return "id" in value ? value : { id: null, ...value };
  }
  const rate = Number(value);
  if (Number.isNaN(rate)) return null;
  return { id: null, currency: null, rate };
}
