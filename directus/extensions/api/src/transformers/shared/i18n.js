import { LOCALE_TO_ISO } from "../../maps/language-code.map.js";

export function getLocaleCode(translationsId) {
  return typeof translationsId === "object"
    ? translationsId?.code
    : translationsId;
}

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

export function pickFromMap(translationsMap, lang) {
  if (!translationsMap || Object.keys(translationsMap).length === 0)
    return null;
  if (lang && translationsMap[lang]) return translationsMap[lang];
  return null;
}
