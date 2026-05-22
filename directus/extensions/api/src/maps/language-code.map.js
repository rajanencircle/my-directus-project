// Maps full Directus locale codes to ISO 639-1 short codes used in v1 API.
export const LOCALE_TO_ISO = {
  'de-DE': 'de',
  'en-US': 'en',
  'nl-NL': 'nl',
};

// Maps ISO 639-1 short codes (accepted as `lang` query param) to Directus locale codes.
export const ISO_TO_LOCALE = {
  de: 'de-DE',
  en: 'en-US',
  nl: 'nl-NL',
};
