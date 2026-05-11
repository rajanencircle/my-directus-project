// Maps external API language codes to standard locale codes.
// The actual Directus language UUID must be resolved at runtime by looking up
// the `languages` collection where `code` matches the value below.

export const LANGUAGE_CODE_MAP = {
  D: "de-DE",
  GB: "en-GB",
  NL: "nl-NL",
  CH: "de-CH", // TODO: confirm — could be fr-CH or it-CH depending on region
  // B:  null,     // TODO: confirm — Belgium; could be nl-BE or fr-BE
  // A:  null,     // TODO: confirm — Austria; expected de-AT
  // F:  null,     // TODO: confirm — France; expected fr-FR
  // ZA: null,     // TODO: confirm — South Africa; expected en-ZA
};

export function toDirectusLanguage(apiLanguageCode) {
  return LANGUAGE_CODE_MAP[apiLanguageCode] ?? null;
}
