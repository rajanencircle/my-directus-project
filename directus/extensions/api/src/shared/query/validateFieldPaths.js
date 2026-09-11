/**
 * @description Validates dot-path field/relation references against a Directus schema snapshot.
 *
 * Takes a dot-separated string (e.g. `media.directus_files_id.folder.id`) and walks down the
 * schema relations to ensure every field and nested collection exists. It only checks the
 * structure (shape), not permissions, since these service calls typically run without
 * accountability. A path is considered invalid when a collection or field is missing.
 *
 * This is used internally to avoid Directus's own 403 ForbiddenException on a query that
 * references a renamed/removed field: instead of failing the entire request, the broken
 * path is dropped so the rest of the query succeeds gracefully.
 */

function getCollectionFields(schema, collectionName) {
  const collection = schema?.collections?.[collectionName];
  return collection?.fields ?? null;
}

/**
 * @description Resolves the collection a relational field points to.
 *
 * Consults `schema.relations` because a field's relational metadata isn't always stored
 * directly on the field definition. Relations are matched in both directions (forward or
 * reverse) to find the related collection name.
 *
 * This is used internally during path validation to navigate from one collection to the next.
 * 
 * @param {Object} schema - Directus schema object.
 * @param {String} collectionName - Current collection name.
 * @param {String} fieldName - Field name.
 * @returns {String|null} The related collection name, or null if none.
 */
function resolveRelatedCollection(schema, collectionName, fieldName) {
  const relations = schema?.relations ?? [];
  for (const rel of relations) {
    if (rel.collection === collectionName && rel.field === fieldName) {
      return rel.related_collection ?? rel.relatedCollection ?? null;
    }
    /* m2m/m2a junctions and reverse o2m aliases are exposed as fields on the "one" side
     * that don't have a matching forward relation row — fall back to the meta shape when present. */
    if (
      rel.meta?.one_collection === collectionName &&
      rel.meta?.one_field === fieldName
    ) {
      return rel.collection ?? null;
    }
  }
  return null;
}

/**
 * @description Validates a single dot-path against the schema.
 *
 * Splits the path by dots and traverses the schema, verifying that each segment is a valid
 * field and that each intermediate segment correctly points to a related collection.
 * Wildcards (`*`) are always considered valid.
 *
 * This is used to check whether a single field path (e.g. `country.translations.translations_id.code`)
 * is valid.
 * 
 * @param {Object} schema - Directus schema object.
 * @param {String} rootCollection - Collection to start validation from.
 * @param {String} path - The dot-separated field path.
 * @returns {Boolean} True if valid, false otherwise.
 */
export function isValidFieldPath(schema, rootCollection, path) {
  if (!schema || !rootCollection || !path) return false;
  const segments = path.split('.');
  let currentCollection = rootCollection;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const isLast = i === segments.length - 1;

    if (segment === '*') {
      /* Wildcards are always valid — Directus itself only ever returns fields that exist. */
      return true;
    }

    const fields = getCollectionFields(schema, currentCollection);
    if (!fields || !(segment in fields)) return false;

    if (isLast) return true;

    const related = resolveRelatedCollection(schema, currentCollection, segment);
    if (!related) return false;
    currentCollection = related;
  }

  return true;
}

/**
 * @description Filters a list of dot-paths, keeping only the valid ones.
 *
 * Maps each path through `isValidFieldPath`, preserving order and silently dropping any path
 * that returns false.
 *
 * This is used right before executing a query to ensure no invalid paths are sent to Directus.
 * 
 * @param {Object} schema - Directus schema object.
 * @param {String} rootCollection - The root collection name.
 * @param {Array<String>} paths - Array of dot-separated paths.
 * @returns {Array<String>} Array of valid paths.
 */
export function filterValidFieldPaths(schema, rootCollection, paths) {
  return paths.filter((path) => isValidFieldPath(schema, rootCollection, path));
}
