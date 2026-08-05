import { LOCALE_TO_ISO } from "../maps/language-code.map.js";
import { ensureUtcSuffix } from "../utils/timestamps.js";
import { groupPrices } from "../utils/prices.js";
import { toExchangeRateObject } from "../utils/prices.js";
import { buildImageUrls } from "../utils/images.js";
import {
  toSupplementaryBlocks,
  extractSpecialsDescription,
} from "../utils/supplementary.js";
import { assembleResponse } from "../shared/response/assembleResponse.js";
import { getGroupOrder } from "../shared/response/groupOrder.js";
import { buildDenylist } from "../shared/response/denylist.js";

const HOTEL_GROUP_ORDER = getGroupOrder("hotel");
const HOTEL_DENYLIST = buildDenylist("hotel");

const CONSUMED_SOURCE_KEYS = [
  "id",
  "object_id",
  "status_primarix",
  "date_created",
  "date_updated",
  "name",
  "hotel_classification",
  "accommodation_type",
  "booking_partner",
  "id_tour_user",
  "haupt_id_tour_user",
  "booking",
  "booking_email",
  "booking_info",
  "partner_type",
  "partner",
  "street",
  "street_number",
  "zip_code",
  "place",
  "state",
  "region",
  "country",
  "location_tour32",
  "phone_general",
  "phone_ah",
  "email_general",
  "website",
  "hotel_descriptions_translations",
  "price_info_translations",
  "hotel_prices",
  "surcharges",
  "surcharge_settings",
  "room_categories",
  "price_dates",
  "room_prices",
  "room_occupancies",
  "surcharges",
  "image_badge_status",
  "image_badge_start_date",
  "image_badge_end_date",
  "image_badge_translations",
  "hotel_activities",
  "media",
  "user_created",
  "user_updated",
  "season",
  "object_info",
  "internal_remarks",
  "hotels_surcharges",
  "hotel_group",
  "specials_translations",
];

function getLocaleCode(translationsId) {
  return typeof translationsId === "object"
    ? translationsId?.code
    : translationsId;
}

function buildTranslationsMap(rows, pickFields) {
  const map = {};
  for (const row of rows ?? []) {
    const locale = getLocaleCode(row.translations_id);
    const iso = LOCALE_TO_ISO[locale];
    if (!iso) continue;
    map[iso] = pickFields(row);
  }
  return map;
}

function pickFromMap(translationsMap, lang) {
  if (!translationsMap || Object.keys(translationsMap).length === 0)
    return null;
  if (lang && translationsMap[lang]) return translationsMap[lang];
  if (translationsMap["de-DE"]) return translationsMap["de-DE"];
  if (translationsMap["en-GB"]) return translationsMap["en-GB"];
  const firstKey = Object.keys(translationsMap)[0];
  return translationsMap[firstKey];
}

function shapeGeo(geo, lang) {
  if (!geo) return null;
  const transMap = buildTranslationsMap(geo.translations, (t) => ({
    name: t.name ?? null,
  }));
  const filteredTransMap = lang
    ? transMap[lang]
      ? { [lang]: transMap[lang] }
      : {}
    : transMap;
  return {
    id: geo.id,
    ...(geo.ISO !== undefined && { iso: geo.ISO }),
    ...(geo.id_primarix !== undefined && { id_primarix: geo.id_primarix }),
    ...(geo.location_tour32 !== undefined && {
      location_tour32: geo.location_tour32,
    }),
    translations: filteredTransMap,
  };
}

function getGeoName(geo, lang) {
  if (!geo) return null;
  const map = buildTranslationsMap(geo.translations, (t) => t.name ?? null);
  return pickFromMap(map, lang);
}

function isPublicationActive(item, today) {
  if (item.status === "unpublished") return false;
  const start = item.publish_start ? item.publish_start.slice(0, 10) : null;
  const end = item.publish_end ? item.publish_end.slice(0, 10) : null;
  if (end && today > end) return false;
  if (start && today < start) return false;
  return true;
}

const SUPPLIER_TYPE_MAP = { Yes: "Independent", No: "Partner" };

function buildPriceSettingsMap(hotelPricesRows) {
  const map = {};
  for (const row of hotelPricesRows ?? []) {
    const locale = getLocaleCode(row.translations_id);
    const iso = LOCALE_TO_ISO[locale];
    if (!iso) continue;
    let fromPrice = null;
    for (const t of row.from_price?.room_prices_translations ?? []) {
      const tLocale = getLocaleCode(t.translations_id);
      const tIso = LOCALE_TO_ISO[tLocale];
      if (tIso === iso) {
        fromPrice = t.sell_price ?? null;
        break;
      }
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

function buildSurchargeSettingsMap(surchargeSettingsRows) {
  const map = {};
  for (const row of surchargeSettingsRows ?? []) {
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

export function shapeHotelListItem(hotel, lang) {
  const classification = hotel.hotel_classification
    ? {
        id: hotel.hotel_classification.id,
        name: hotel.hotel_classification.label ?? null,
      }
    : null;

  return {
    id: hotel.id,
    object_id: hotel.object_id ?? null,
    name: hotel.name ?? null,
    classification,
    geo: {
      country: hotel.country
        ? {
            id: hotel.country.id,
            name: getGeoName(hotel.country, lang) ?? null,
            code: hotel.country.ISO ?? null,
          }
        : null,
      region: hotel.region
        ? {
            id: hotel.region.id,
            name: getGeoName(hotel.region, lang) ?? null,
            code: null,
          }
        : null,
    },
    thumbnail: (() => {
      const u = buildImageUrls(hotel.media, lang)?.[0]?.url;
      return u ? `${u}?width=400&height=300&fit=cover` : null;
    })(),
    publishing_status: hotel.status_primarix ?? null,
    date_updated: ensureUtcSuffix(hotel.date_updated),
  };
}

export function shapeHotelDetail(hotel, lang) {
  const descMap = buildTranslationsMap(
    hotel.hotel_descriptions_translations,
    (t) => ({
      subline_location: t.subline_location ?? null,
      teaser: t.teaser ?? null,
      description_short: t.description_short ?? null,
      description_surrounding: t.description_surrounding ?? null,
      description_rooms: t.description_rooms ?? null,
      total_number_of_rooms: t.total_number_of_rooms ?? null,
      remarks_arrival: t.remarks_arrival ?? null,
      description_supplementary: t.description_supplementary ?? null,
    }),
  );

  const infoMap = buildTranslationsMap(hotel.price_info_translations, (t) => ({
    services_included: t.services_included ?? null,
    services_not_included: t.services_not_included ?? null,
    service_highlights: t.service_highlights ?? null,
    minimum_stay: t.minimum_stay ?? null,
    minimum_stay_additions: t.minimum_stay_additions ?? null,
    deviating_cancelation_terms: t.deviating_cancelation_terms ?? null,
    children_policy: t.children_policy ?? null,
    children_free_age: t.children_free_age ?? null,
    children_free_number: t.children_free_number ?? null,
    important_information: t.important_information ?? null,
    mobility_advice_text: t.mobility_advice_text ?? null,
    price_infos_supplementary: t.price_infos_supplementary ?? null,
  }));

  const translations = pickFromMap(descMap, lang);
  const price_info_translations = pickFromMap(infoMap, lang);

  const priceSettingsMap = buildPriceSettingsMap(hotel.hotel_prices);
  const activeSettings = pickFromMap(priceSettingsMap, lang) ?? {
    marginPct: null,
    unit: null,
  };

  const surchargeSettingsMap = buildSurchargeSettingsMap(
    hotel.surcharge_settings,
  );
  const activeSurchargeSettings = pickFromMap(surchargeSettingsMap, lang) ?? {
    marginPct: null,
  };

  const badgeTranslations = buildTranslationsMap(
    hotel.image_badge_translations,
    (t) => ({
      image_badge_teaser: t.image_badge_teaser ?? null,
      image_badge_details: t.image_badge_details ?? null,
    }),
  );

  const specialsMap = buildTranslationsMap(
    hotel.specials_translations,
    (t) => t.specials ?? [],
  );
  const activeSpecials = pickFromMap(specialsMap, lang) ?? [];
  const special_description = extractSpecialsDescription(activeSpecials);

  const today = new Date().toISOString().slice(0, 10);

  const roomCategories = (hotel.room_categories ?? []).filter((rc) =>
    isPublicationActive(rc, today),
  );
  const priceDates = (hotel.price_dates ?? []).filter((pd) =>
    isPublicationActive(pd, today),
  );
  const roomPrices = hotel.room_prices ?? [];
  const occupancies = (hotel.room_occupancies ?? [])
    .map((r) =>
      r.occupancies_id ? { ...r.occupancies_id, junction_id: r.id } : null,
    )
    .filter(Boolean);
  const rooms = hotel.room_categories
    ? groupPrices(
        roomCategories,
        priceDates,
        roomPrices,
        occupancies,
        LOCALE_TO_ISO,
        {
          lang,
          marginPct: activeSettings.marginPct,
          unit: activeSettings.unit,
        },
      )
    : null;

  const price_options = hotel.surcharges
    ? (hotel.surcharges ?? [])
        .filter((s) => isPublicationActive(s, today))
        .map((s) => {
          const translationsMap = buildTranslationsMap(s.translations, (t) => ({
            description: t.surcharge_description ?? null,
            booking_name: t.surcharge_booking_name ?? null,
            sell_price: t.sell_price ?? null,
            type: t.surcharge_type?.designation ?? null,
            catering: t.surcharge_catering
              ? {
                  id: t.surcharge_catering.id,
                  name: t.surcharge_catering.designation,
                }
              : null,
            calc_type: t.surcharge_calc_type?.designation ?? null,
          }));
          const active = pickFromMap(translationsMap, lang) ?? {};
          const buy = s.buy_price ? parseFloat(s.buy_price) : null;
          return {
            booking_name: active.booking_name ?? null,
            description: active.description ?? null,
            sell:
              active.sell_price !== undefined && active.sell_price !== null
                ? parseFloat(active.sell_price)
                : null,
            type: active.type ?? null,
            catering: active.catering ?? null,
            calc_type: active.calc_type ?? null,
            buy,
            margin:
              activeSurchargeSettings.marginPct !== undefined &&
              activeSurchargeSettings.marginPct !== null
                ? parseFloat(activeSurchargeSettings.marginPct)
                : null,
          };
        })
    : null;

  const fieldDefs = [
    { key: "id", group: "main", value: hotel.id },
    { key: "object_id", group: "main", value: hotel.object_id ?? null },
    {
      key: "publishing_status",
      group: "main",
      value: hotel.status_primarix ?? null,
    },
    {
      key: "date_updated",
      group: "main",
      value: ensureUtcSuffix(hotel.date_updated),
    },
    {
      key: "season",
      group: "main",
      value: hotel.season
        ? { id: hotel.season.id, name: hotel.season.season }
        : null,
    },
    { key: "name", group: "main", value: hotel.name ?? null },
    {
      key: "hotel_group",
      group: "main",
      value: hotel.hotel_group
        ? { id: hotel.hotel_group.id, name: hotel.hotel_group.label }
        : null,
    },
    {
      key: "address",
      group: "main",
      value: {
        street: hotel.street ?? null,
        street_number: hotel.street_number ?? null,
        zip_code: hotel.zip_code ?? null,
        place: hotel.place
          ? {
              id: hotel.place.id,
              name: getGeoName(hotel.place, lang) ?? null,
              code: null,
            }
          : null,
        country: hotel.country
          ? {
              id: hotel.country.id,
              name: getGeoName(hotel.country, lang) ?? null,
              code: hotel.country.ISO ?? null,
            }
          : null,
        state: hotel.state
          ? {
              id: hotel.state.id,
              name: getGeoName(hotel.state, lang) ?? null,
              code: hotel.state.ISO ?? null,
            }
          : null,
        region: hotel.region
          ? {
              id: hotel.region.id,
              name: getGeoName(hotel.region, lang) ?? null,
              code: null,
            }
          : null,
        phone_general: hotel.phone_general ?? null,
        phone_after_hours: hotel.phone_ah ?? null,
        email_general: hotel.email_general ?? null,
        website: hotel.website ?? null,
      },
    },
    {
      key: "classification",
      group: "main",
      value: {
        accommodation_types: hotel.accommodation_type
          ? hotel.accommodation_type
              .map((a) =>
                a.accommodation_types_id
                  ? {
                      id: a.accommodation_types_id.id,
                      name: a.accommodation_types_id.label,
                    }
                  : null,
              )
              .filter(Boolean)
          : null,
        hotel_classification: hotel.hotel_classification
          ? {
              id: hotel.hotel_classification.id,
              name: hotel.hotel_classification.label,
            }
          : null,
        activities: hotel.hotel_activities
          ? hotel.hotel_activities
              .map((a) =>
                a.activities_id
                  ? { id: a.activities_id.id, name: a.activities_id.label }
                  : null,
              )
              .filter(Boolean)
          : null,
      },
    },
    {
      key: "descriptions",
      group: "main",
      value: {
        subline_location: translations?.subline_location ?? null,
        teaser: translations?.teaser ?? null,
        description_short: translations?.description_short ?? null,
        description_surrounding: translations?.description_surrounding ?? null,
        description_rooms: translations?.description_rooms ?? null,
        remarks_arrival: translations?.remarks_arrival ?? null,
        total_number_of_rooms:
          translations?.total_number_of_rooms !== undefined &&
          translations?.total_number_of_rooms !== null
            ? Number(translations.total_number_of_rooms)
            : null,
        supplementary: toSupplementaryBlocks(
          translations?.description_supplementary,
        ),
        descriptions_markdown: null,
      },
    },
    {
      key: "price_info",
      group: "main",
      value: {
        services_included: price_info_translations?.services_included ?? null,
        services_not_included:
          price_info_translations?.services_not_included ?? null,
        service_highlights: price_info_translations?.service_highlights ?? null,
        minimum_stay: price_info_translations?.minimum_stay ?? null,
        minimum_stay_additions:
          price_info_translations?.minimum_stay_additions ?? null,
        deviating_cancellation_terms:
          price_info_translations?.deviating_cancelation_terms ?? null,
        children_policy: price_info_translations?.children_policy ?? null,
        children_free_age:
          price_info_translations?.children_free_age !== undefined &&
          price_info_translations?.children_free_age !== null
            ? Number(price_info_translations.children_free_age)
            : null,
        children_free_number:
          price_info_translations?.children_free_number !== undefined &&
          price_info_translations?.children_free_number !== null
            ? Number(price_info_translations.children_free_number)
            : null,
        important_information:
          price_info_translations?.important_information ?? null,
        mobility_advice: price_info_translations?.mobility_advice_text
          ? { id: null, name: price_info_translations.mobility_advice_text }
          : null,
        supplementary: toSupplementaryBlocks(
          price_info_translations?.price_infos_supplementary,
        ),
        price_info_markdown: null,
      },
    },
    { key: "rooms", group: "main", value: rooms },
    { key: "surcharges", group: "main", value: price_options },
    {
      key: "specials",
      group: "main",
      value: {
        special_description,
      },
    },
    {
      key: "image_badge",
      group: "main",
      value: hotel.image_badge_status
        ? {
            teaser:
              pickFromMap(badgeTranslations, lang)?.image_badge_teaser ?? null,
            details:
              pickFromMap(badgeTranslations, lang)?.image_badge_details ?? null,
            start_date: hotel.image_badge_start_date ?? null,
            end_date: hotel.image_badge_end_date ?? null,
            status: hotel.image_badge_status ?? null,
          }
        : null,
    },
    {
      key: "media",
      group: "main",
      value: buildImageUrls(hotel.media, lang) ?? null,
    },
    {
      key: "booking",
      group: "main",
      value: {
        booking_channel: hotel.booking_partner ?? null,
        booking_partner: hotel.booking
          ? {
              id: hotel.booking.id ?? null,
              name: hotel.booking.name_agency ?? null,
            }
          : null,
        id_service_provider_tour32: hotel.id_tour_user ?? null,
        id_main_service_provider_tour32: hotel.haupt_id_tour_user ?? null,
        res_phone: hotel.booking?.phone_reservation ?? null,
        email_booking: hotel.booking_email ?? null,
        res_email2: hotel.booking?.email_reservation ?? null,
        contact_title: hotel.booking?.contact_title ?? null,
        contact_greeting: hotel.booking?.contact_greeting ?? null,
        contact_firstname: hotel.booking?.contact_first_name ?? null,
        contact_name: hotel.booking?.contact_name ?? null,
        internal_remarks_reservation:
          hotel.booking?.internal_remarks_reservation ?? null,
        it_code: hotel.booking?.it_code ?? null,
      },
    },
    {
      key: "pricing_config",
      group: "main",
      value: {
        buy_price_type: activeSettings.buyPriceType ?? null,
        sell_price_type: activeSettings.sellPriceType ?? null,
        percentage_type: activeSettings.percentageType ?? null,
        provision_percentage:
          activeSettings.provisionPercentage !== undefined &&
          activeSettings.provisionPercentage !== null
            ? Number(activeSettings.provisionPercentage)
            : null,
        margin_percentage:
          activeSettings.marginPct !== undefined &&
          activeSettings.marginPct !== null
            ? Number(activeSettings.marginPct)
            : null,
        exchange_rate:
          activeSettings.exchangeRate?.rate !== undefined &&
          activeSettings.exchangeRate?.rate !== null
            ? Number(activeSettings.exchangeRate.rate)
            : null,
        from_price: activeSettings.fromPrice ?? null,
        surcharge_percentage_type:
          activeSurchargeSettings.percentageType ?? null,
        surcharge_provision_percentage:
          activeSurchargeSettings.provisionPercentage !== undefined &&
          activeSurchargeSettings.provisionPercentage !== null
            ? Number(activeSurchargeSettings.provisionPercentage)
            : null,
        surcharge_margin_percentage:
          activeSurchargeSettings.marginPct !== undefined &&
          activeSurchargeSettings.marginPct !== null
            ? Number(activeSurchargeSettings.marginPct)
            : null,
        surcharge_exchange_rate:
          activeSurchargeSettings.exchangeRate?.rate !== undefined &&
          activeSurchargeSettings.exchangeRate?.rate !== null
            ? Number(activeSurchargeSettings.exchangeRate.rate)
            : null,
      },
    },
    {
      key: "internal",
      group: "main",
      value: {
        internal_remarks: hotel.internal_remarks ?? null,
        object_info_primarix: hotel.object_info ?? null,
        location_tour32: hotel.location_tour32
          ? { id: hotel.location_tour32.id, name: hotel.location_tour32.name }
          : null,
        sell_prices_status: hotel.sell_prices_status ?? null,
        sell_prices_updated_at: hotel.sell_prices_updated_at
          ? ensureUtcSuffix(hotel.sell_prices_updated_at)
          : null,
      },
    },
  ];

  return assembleResponse({
    fieldDefs,
    groupOrder: ["main"],
    rawItem: hotel,
    consumedSourceKeys: CONSUMED_SOURCE_KEYS,
    denylist: HOTEL_DENYLIST,
  });
}
