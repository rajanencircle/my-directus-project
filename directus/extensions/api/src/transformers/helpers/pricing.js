import { toNumOrNull } from "./numeric.js";
import { getLocaleCode } from "./i18n.js";
import { LOCALE_TO_ISO } from "../../maps/language-code.map.js";
import { toExchangeRateObject } from "../../utils/prices.js";

/**
 * @description Builds a mapping of pricing settings keyed by ISO language code.
 *
 * Iterates through price setting rows, resolving each locale code to its ISO standard.
 * It supports nested `room_prices_translations`/`tours_prices_translations`/
 * `prices_translations` (hotel-standard schema, where `from_price` points directly at a
 * priced row — `prices_translations` is `rental_companies_prices`' own translation relation,
 * used by rental cars/campers) and direct `from_price` fields (legacy schema, where the field
 * isn't wired to a priced row). Margin, units, provisioning, and exchange rates are formatted
 * here.
 *
 * Note: tours' and excursions' `from_price` are also M2O to a priced row (`tours_prices` /
 * `excursions_prices`, same shape as hotels' `room_prices`) — tours.fields.js/
 * excursions.fields.js fetch the nested `tours_prices_translations`/
 * `excursions_prices_translations` sell price so this resolves properly instead of falling
 * through to the plain `row.from_price` (raw id) fallback below.
 *
 * Product transformers use this internally to resolve pricing configurations, allowing them
 * to query settings efficiently by active language.
 * 
 * @param {Array<Object>} rows - Array of raw price settings rows from Directus.
 * @returns {Object} A dictionary mapping ISO language codes to their respective price settings.
 */
export function buildPriceSettingsMap(rows) {
  const map = {};
  for (const row of rows ?? []) {
    const locale = getLocaleCode(row.translations_id);
    const iso = LOCALE_TO_ISO[locale];
    if (!iso) continue;
    let fromPrice = null;

    /* Support for the Hotel standard schema — `from_price` points straight at a
     * priced row (room_prices for hotels, tours_prices for tours), whose own
     * translations carry the actual sell_price. Falls through to the plain
     * `from_price` fallback when the pointed-to row isn't a priced row. */
    const priceRowTranslations =
      row.from_price?.room_prices_translations ??
      row.from_price?.tours_prices_translations ??
      row.from_price?.excursions_prices_translations ??
      row.from_price?.prices_translations;
    if (priceRowTranslations) {
      for (const t of priceRowTranslations) {
        const tLocale = getLocaleCode(t.translations_id);
        const tIso = LOCALE_TO_ISO[tLocale];
        if (tIso === iso) {
          fromPrice = t.sell_price ?? null;
          break;
        }
      }
    } else {
      /* Collections without a translated price row expose a plain sell price directly. */
      fromPrice = row.from_price ?? null;
    }

    map[iso] = {
      marginPct: row.margin_percentage ?? null,
      unit:
        row.buy_price_type === "per_person"
          ? "person"
          : row.buy_price_type === "per_unit"
            ? "unit"
            : null,
      fromPrice,
      buyPriceType: row.buy_price_type ?? null,
      sellPriceType: row.sell_price_type ?? null,
      percentageType: row.percentage_type ?? null,
      provisionPercentage: row.provision_percentage ?? null,
      exchangeRate: toExchangeRateObject(row.exchange_rate),
    };
  }
  return map;
}

/**
 * @description Builds a mapping of surcharge settings keyed by ISO language code.
 *
 * Iterates through surcharge setting rows, converting locale codes to their ISO standard
 * and extracting margins, percentages, provisioning logic, and exchange rates.
 *
 * This works like `buildPriceSettingsMap`, but is dedicated specifically to surcharge data.
 * 
 * @param {Array<Object>} rows - Array of raw surcharge settings rows.
 * @returns {Object} A dictionary mapping ISO language codes to surcharge settings.
 */
export function buildSurchargeSettingsMap(rows) {
  const map = {};
  for (const row of rows ?? []) {
    const locale = getLocaleCode(row.translations_id);
    const iso = LOCALE_TO_ISO[locale];
    if (!iso) continue;
    map[iso] = {
      marginPct: row.surcharge_margin_percentage ?? null,
      percentageType: row.surcharge_percentage_type ?? null,
      provisionPercentage: row.surcharge_provision_percentage ?? null,
      exchangeRate: toExchangeRateObject(row.surcharge_exchange_rate),
    };
  }
  return map;
}

/**
 * @description Standardizes the pricing configuration block.
 *
 * Merges general pricing settings and surcharge settings into a single standard
 * `pricing_config` object. Fields like `exchange_rate` and `from_price` are passed in
 * pre-shaped by the caller, since different collections handle them differently.
 *
 * Item transformers use this to construct the root `pricing_config` block that appears on
 * all product details, regardless of product type.
 * 
 * @param {Object} params - Configuration parameters.
 * @returns {Object} The standardized pricing configuration block.
 */
export function buildPricingConfig({
  settings,
  surchargeSettings,
  exchangeRate,
  fromPrice,
  surchargeExchangeRate,
}) {
  return {
    buy_price_type: settings?.buyPriceType ?? null,
    sell_price_type: settings?.sellPriceType ?? null,
    percentage_type: settings?.percentageType ?? null,
    provision_percentage: toNumOrNull(settings?.provisionPercentage),
    margin_percentage: toNumOrNull(settings?.marginPct),
    exchange_rate: exchangeRate,
    from_price: fromPrice,
    surcharge_percentage_type: surchargeSettings?.percentageType ?? null,
    surcharge_provision_percentage: toNumOrNull(
      surchargeSettings?.provisionPercentage,
    ),
    surcharge_margin_percentage: toNumOrNull(surchargeSettings?.marginPct),
    surcharge_exchange_rate: surchargeExchangeRate,
  };
}

