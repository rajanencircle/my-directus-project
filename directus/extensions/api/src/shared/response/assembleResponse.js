import { HIDDEN_FOR, restrictTo } from "./visibility.js";

// The one generic, domain-ignorant response layer. It knows nothing about hotels, tours,
// pricing, translations, or any other business concept — it only orders, defaults, and
// audience-filters a bag of already-computed values handed to it by a resource's
// <resource>.transformer.js. All business logic (what a field means, how its value is
// computed) stays in the resource; this file only ever decides *placement and visibility*,
// never *meaning*.
//
// Allowlist-only: the response contains exactly the keys declared in fieldDefs — nothing
// more. There is no passthrough of raw Directus fields. (Verified before this became the
// only mode: the previous passthrough of unconsumed raw fields never actually surfaced
// anything beyond Directus Studio UI-only "no-data" alias fields, confirmed against live
// schema and real records across all 6 collections.)
//
// This is a different layer from each collection's `*.fields.js`: `*.fields.js` controls
// what's fetched FROM Directus (the query); fieldDefs here controls what's shown IN the
// response (the shape), for whom.
//
// fieldDefs: array of { key, group, value, default?, visibleTo?, order? }
//   - key: output property name
//   - group: string tag used only for ordering (see groupOrder)
//   - value: the already-computed value for this field (not a lookup path). May itself
//     contain `restrictTo(nestedValue, ...audiences)`-wrapped values at any depth (inside
//     plain objects/arrays) — see visibility.js. Those resolve the same way visibleTo does
//     below, just scoped to a piece of this field's value instead of the whole field.
//   - default: optional fallback used when value is null/undefined
//   - visibleTo: optional array of audience names; when set, this field is omitted
//     entirely (not present in the output) for any assembleResponse() call whose
//     `audience` isn't in this list. Omitted `visibleTo` (the common case) means "visible
//     to every audience" — sugar for `restrictTo(value, ...everyAudienceThatMatters)`
//     without having to enumerate them.
//   - order: optional { [audience]: priority } map overriding this field's position
//     within its group for a specific audience only (lower sorts first). Fields without
//     an override for the requested audience keep their natural declaration-order
//     position. No effect when assembleResponse is called without an `audience`.
//
// groupOrder: array of group-tag strings; fields are emitted grouped by this order, and
//   (absent an `order` override) in fieldDefs declaration order within a group.
//
// audience: optional string (e.g. "web"). When omitted (every existing backoffice call
//   site), every field and every restrictTo()-wrapped nested value resolves as visible —
//   restriction only ever narrows what a specific named audience sees.
const OMIT = Symbol("omit");

function resolveDeep(value, audience) {
  if (value !== null && typeof value === "object" && HIDDEN_FOR in value) {
    if (!audience || value[HIDDEN_FOR].has(audience)) {
      return resolveDeep(value.value, audience);
    }
    return OMIT;
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => resolveDeep(item, audience))
      .filter((item) => item !== OMIT);
  }
  if (value !== null && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      const resolved = resolveDeep(v, audience);
      if (resolved !== OMIT) out[k] = resolved;
    }
    return out;
  }
  return value;
}

export function assembleResponse({ fieldDefs, groupOrder, audience }) {
  const output = {};

  const byGroup = new Map(groupOrder.map((g) => [g, []]));
  for (const def of fieldDefs) {
    if (!byGroup.has(def.group)) byGroup.set(def.group, []);
    byGroup.get(def.group).push(def);
  }

  const orderedGroups = [...groupOrder, ...[...byGroup.keys()].filter((g) => !groupOrder.includes(g))];

  for (const group of orderedGroups) {
    let defs = byGroup.get(group) ?? [];
    if (audience) {
      defs = defs
        .map((def, i) => ({ def, priority: def.order?.[audience] ?? i * 10 }))
        .sort((a, b) => a.priority - b.priority)
        .map((x) => x.def);
    }
    for (const def of defs) {
      if (def.key in output) continue; // duplicate key guard — first placement wins
      let resolved = def.value ?? def.default ?? null;
      if (def.visibleTo) resolved = restrictTo(resolved, ...def.visibleTo);
      const finalValue = resolveDeep(resolved, audience);
      if (finalValue === OMIT) continue;
      output[def.key] = finalValue;
    }
  }

  return output;
}
