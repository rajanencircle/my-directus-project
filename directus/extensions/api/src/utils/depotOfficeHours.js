const DEPOT_TRANSLATIONS_TABLE = "rental_depots_translations";
const LANGUAGES_TABLE = "translations";

/**
 * @description Manually fetches and attaches office hours translations for rental depots.
 *
 * This is a workaround for a missing Directus relation. It uses Knex directly to query the
 * `rental_depots_translations` table and joins it with the `translations` (languages) table to
 * obtain language codes. The rows are then mapped back into the main `depots` array, formatted
 * exactly as the transformer expects.
 *
 * The camper and rental car transformers use this to load office hours translations, bypassing
 * the standard API fetch, which silently drops this join due to missing configuration.
 * 
 * @param {Array<Object>} depots - Array of depot rows.
 * @param {Object} database - Directus knex database instance.
 * @returns {Promise<Array<Object>>} The `depots` array mutated in place with `office_hours_translations`.
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
