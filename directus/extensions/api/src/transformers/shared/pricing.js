import { toNumOrNull } from "./numeric.js";
import { getLocaleCode } from "./i18n.js";
import { LOCALE_TO_ISO } from "../../maps/language-code.map.js";
import { toExchangeRateObject } from "../../utils/prices.js";

export function buildPriceSettingsMap(rows) {
  const map = {};
  for (const row of rows ?? []) {
    const locale = getLocaleCode(row.translations_id);
    const iso = LOCALE_TO_ISO[locale];
    if (!iso) continue;
    let fromPrice = null;
    
    // Support for the Hotel standard schema (nested room_prices_translations)
    if (row.from_price?.room_prices_translations) {
      for (const t of row.from_price.room_prices_translations) {
        const tLocale = getLocaleCode(t.translations_id);
        const tIso = LOCALE_TO_ISO[tLocale];
        if (tIso === iso) {
          fromPrice = t.sell_price ?? null;
          break;
        }
      }
    } else {
      // Fallback for legacy collections before they are updated to Hotel standard
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

// Every collection's `pricing_config` field block shares this shape for the parts that
// don't vary — but `exchange_rate`, `from_price`, and `surcharge_exchange_rate` are each
// pre-shaped differently per collection today (some numbers, some {currency,rate} objects,
// some wrapped in toExchangeRateObject, some raw passthrough — see individual transformers'
// call sites). Rather than guess at unifying those, the caller computes each exactly as it
// does today and passes the already-shaped value in — this stays flexible for whichever
// collection's logic changes next, without silently changing any other collection's shape.
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

// rental_car/camper source their pricing_config values directly from a raw
// price_calculation/surcharge_calculation Directus row (snake_case column names), unlike
// hotel/tour/excursion which resolve a per-locale settings map first (camelCase keys).
// These adapters normalize either raw row shape into what buildPricingConfig expects,
// without altering any values.
export function fromRawPriceCalc(row) {
  return row && {
    buyPriceType: row.buy_price_type,
    sellPriceType: row.sell_price_type,
    percentageType: row.percentage_type,
    provisionPercentage: row.provision_percentage,
    marginPct: row.margin_percentage,
  };
}

export function fromRawSurchargeCalc(row) {
  return row && {
    percentageType: row.surcharge_percentage_type,
    provisionPercentage: row.surcharge_provision_percentage,
    marginPct: row.surcharge_margin_percentage,
  };
}
