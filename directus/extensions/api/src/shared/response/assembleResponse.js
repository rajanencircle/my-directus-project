import { HIDDEN_FOR, restrictTo } from "./visibility.js";

/**
 * @description The generic, domain-ignorant response assembly layer for the API.
 *
 * Takes a bag of already-computed values (`fieldDefs`) from a resource's transformer,
 * then orders, defaults, and audience-filters these fields based on the provided
 * configuration. Nested visibility restrictions are resolved recursively: if a field is
 * restricted to an audience the current request doesn't match, it is entirely omitted
 * from the output.
 *
 * This is the final step in all transformers (e.g. `hotel.transformer.js`), shaping the
 * JSON response before it is sent to the client. It guarantees the output strictly adheres
 * to an allowlist and that sensitive or audience-specific fields are correctly hidden.
 * 
 * @param {Object} options - The configuration options for assembling the response.
 * @param {Array<Object>} options.fieldDefs - Array of field definitions { key, group, value, default, visibleTo, order }.
 * @param {Array<String>} options.groupOrder - Array of group tag strings to determine the ordering of fields in the response.
 * @param {String} [options.audience] - The target audience (e.g., "web"). If omitted, all fields are visible.
 * @returns {Object} The assembled, ordered, and filtered response object.
 */
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
