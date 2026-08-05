// The one generic, domain-ignorant response layer. It knows nothing about hotels, tours,
// pricing, translations, or any other business concept — it only orders, defaults, dedups
// and denylists a bag of already-computed values handed to it by a resource's
// <resource>.transform.js + <resource>.fields.js. All business logic (what a field means,
// how its value is computed) stays in the resource; this file only ever decides
// *placement*, never *meaning*.
//
// fieldDefs: array of { key, group, value, default? }
//   - key: output property name
//   - group: string tag used only for ordering (see groupOrder)
//   - value: the already-computed value for this field (not a lookup path)
//   - default: optional fallback used when value is null/undefined
//
// groupOrder: array of group-tag strings; fields are emitted grouped by this order, and
//   in fieldDefs declaration order within a group.
//
// rawItem: the raw (post-query) Directus item, used only for the "remaining fields" pass
//   — any top-level key not consumed by a fieldDef and not denylisted is appended as-is.
//
// denylist: array of raw top-level keys that must never appear in "remaining", even if
//   unconsumed (e.g. legacy/internal identifiers like px_source_id).
export function assembleResponse({ fieldDefs, groupOrder, rawItem = {}, denylist = [], consumedSourceKeys = [] }) {
  const output = {};
  const consumed = new Set(consumedSourceKeys);

  const byGroup = new Map(groupOrder.map((g) => [g, []]));
  for (const def of fieldDefs) {
    if (!byGroup.has(def.group)) byGroup.set(def.group, []);
    byGroup.get(def.group).push(def);
  }

  const orderedGroups = [...groupOrder, ...[...byGroup.keys()].filter((g) => !groupOrder.includes(g))];

  for (const group of orderedGroups) {
    const defs = byGroup.get(group) ?? [];
    for (const def of defs) {
      if (def.key in output) continue; // duplicate key guard — first placement wins
      const resolved = def.value ?? def.default ?? null;
      output[def.key] = resolved;
    }
  }

  const denySet = new Set(denylist);
  for (const [key, value] of Object.entries(rawItem)) {
    if (consumed.has(key) || denySet.has(key) || key in output) continue;
    output[key] = value ?? null;
  }

  return output;
}
