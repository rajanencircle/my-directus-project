const DEPOT_TRANSLATIONS_TABLE = "rental_depots_translations";
const LANGUAGES_TABLE = "translations";

/**
 * Code-only workaround for `rental_depots_translations.translations_id`:
 * the Directus m2o relation to the `translations` language table is NOT configured
 * for this table (unlike every other *_translations table), so Directus silently
 * drops `office_hours_translations.translations_id.code` joins and the API would
 * receive raw UUIDs it cannot map to a language.
 *
 * We fetch the rows directly via knex (joining on the existing FK that is already
 * present in the database) and attach them to each depot in the exact shape the
 * depot transformer expects: `{ translations_id: { code }, office_hours_deviating }`.
 *
 * @param {Array} depots     depot rows (e.g. `depots_selected[].rental_depots_id`)
 * @param {object} database  Directus knex instance from the extension context
 * @returns {Array} the same array, mutated in place with `office_hours_translations`
 */
export async function enrichDepotOfficeHours(depots, database) {
  if (!depots || depots.length === 0) return depots;

  const depotIds = [...new Set(depots.map((d) => d && d.id).filter((id) => id != null))];
  if (depotIds.length === 0) return depots;

  let rows = [];
  try {
    rows = await database(DEPOT_TRANSLATIONS_TABLE)
      .leftJoin(LANGUAGES_TABLE, `${LANGUAGES_TABLE}.id`, `${DEPOT_TRANSLATIONS_TABLE}.translations_id`)
      .select(
        `${DEPOT_TRANSLATIONS_TABLE}.rental_depots_id`,
        `${DEPOT_TRANSLATIONS_TABLE}.translations_id`,
        `${DEPOT_TRANSLATIONS_TABLE}.office_hours_deviating`,
        `${LANGUAGES_TABLE}.code`,
      )
      .whereIn(`${DEPOT_TRANSLATIONS_TABLE}.rental_depots_id`, depotIds);
  } catch (err) {
    console.error("[depotOfficeHours] knex fetch failed:", err);
    return depots;
  }

  const byDepot = {};
  for (const row of rows) {
    const depotId = row.rental_depots_id;
    if (depotId == null) continue;
    if (!byDepot[depotId]) byDepot[depotId] = [];
    byDepot[depotId].push({
      translations_id: row.code ? { code: row.code } : (row.translations_id ?? null),
      office_hours_deviating: row.office_hours_deviating ?? null,
    });
  }

  for (const depot of depots) {
    if (depot && byDepot[depot.id] && byDepot[depot.id].length > 0) {
      depot.office_hours_translations = byDepot[depot.id];
    }
  }

  return depots;
}
