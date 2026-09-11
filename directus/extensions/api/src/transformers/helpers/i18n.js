import { LOCALE_TO_ISO } from "../../maps/language-code.map.js";

/**
 * @description Extracts the locale code from a translations object.
 *
 * Some relationships return `translations_id` as a nested object (containing a `code` field),
 * while others return it as a direct string. This normalizes the input so a string locale
 * code is always returned.
 *
 * This is used internally before mapping locales to ISO language codes.
 * 
 * @param {Object|String} translationsId - The translation reference.
 * @returns {String} The extracted locale code.
 */
export function getLocaleCode(translationsId) {
  return typeof translationsId === "object"
    ? translationsId?.code
    : translationsId;
}

/**
 * @description Builds a mapping of ISO language codes to extracted fields.
 *
 * Iterates through a given array of translation rows, extracting the locale code and mapping
 * it to its ISO equivalent. A `pickFields` callback determines which data is extracted for
 * each language, and the results are stored in a dictionary.
 *
 * Resource transformers use this heavily to group scattered translation rows into a single,
 * easy-to-query map keyed by ISO language code.
 * 
 * @param {Array<Object>} rows - Array of translation rows.
 * @param {Function} pickFields - Callback function to extract the desired fields from a row.
 * @returns {Object} A dictionary mapping ISO language codes to the extracted data.
 */
export function buildTranslationsMap(rows, pickFields) {
  const map = {};
  for (const row of rows ?? []) {
    const locale = getLocaleCode(row.translations_id) || row.languages_code;
    const iso = LOCALE_TO_ISO[locale];
    if (!iso) continue;
    map[iso] = pickFields(row);
  }
  return map;
}

/**
 * @description Picks a translation from a mapped dictionary using the requested language.
 *
 * Checks whether the translation map has an entry for the requested `lang` string and
 * returns that translation block if present; otherwise it returns null.
 *
 * This is used after `buildTranslationsMap` to pluck out the specific translation data the
 * current API request asked for.
 * 
 * @param {Object} translationsMap - The mapped dictionary of translations.
 * @param {String} lang - The requested language code (ISO 639-1).
 * @returns {*} The specific translation block, or null.
 */
export function pickFromMap(translationsMap, lang) {
  if (!translationsMap || Object.keys(translationsMap).length === 0)
    return null;
  if (lang && translationsMap[lang]) return translationsMap[lang];
  return null;
}
