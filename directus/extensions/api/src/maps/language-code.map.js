// Maps full Directus locale codes to ISO 639-1 short codes used in v1 API.
// Only the three supported content/filter languages are mapped — de-CH and en-US
// are intentionally absent: de-CH is a configured Directus language but not a
// supported API language (its content must not surface via v1), and en-US was
// never a real language on directus-dev (the actual English locale is en-GB).
// Any locale code not present here is treated as unmapped and excluded — see the
// `if (!iso) continue` guards in each transformer's buildTranslationsMap.
export const LOCALE_TO_ISO = {
  'de-DE': 'de',
  'en-GB': 'en',
  'nl-NL': 'nl',
};

// Maps ISO 639-1 short codes (accepted as `lang` query param) to Directus locale codes.
export const ISO_TO_LOCALE = {
  de: 'de-DE',
  en: 'en-GB',
  nl: 'nl-NL',
};
