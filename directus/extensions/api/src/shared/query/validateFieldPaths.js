// Validates dot-path field/relation references (e.g. "media.directus_files_id.folder.id")
// against a Directus schema snapshot, dropping any path whose field or collection no
// longer exists. This is what lets a renamed/removed Directus field degrade to "absent
// from the query" instead of readByQuery throwing and failing the whole request.
//
// Only walks relation *shape* (which collection a field points into), not permissions —
// this extension's ItemsService calls run without accountability today, so permission
// checks are out of scope here (see architecture review §1/§13).

function getCollectionFields(schema, collectionName) {
  const collection = schema?.collections?.[collectionName];
  return collection?.fields ?? null;
}

// A field's `relation` metadata isn't on schema.collections[x].fields directly in every
// Directus version/shape, so resolving "which collection does field X point to" is done
// via schema.relations, matching on either side of the relation.
function resolveRelatedCollection(schema, collectionName, fieldName) {
  const relations = schema?.relations ?? [];
  for (const rel of relations) {
    if (rel.collection === collectionName && rel.field === fieldName) {
      return rel.related_collection ?? rel.relatedCollection ?? null;
    }
    // m2m/m2a junctions and reverse o2m aliases are exposed as fields on the "one" side
    // that don't have a matching forward relation row — fall back to the meta shape when present.
    if (
      rel.meta?.one_collection === collectionName &&
      rel.meta?.one_field === fieldName
    ) {
      return rel.collection ?? null;
    }
  }
  return null;
}

// Validates one dot-path (e.g. "country.translations.translations_id.code") against the
// schema, starting from `rootCollection`. Returns true if every segment resolves to a
// real field, and — for every segment except the last — that field points to a real
// related collection to continue descending into.
export function isValidFieldPath(schema, rootCollection, path) {
  if (!schema || !rootCollection || !path) return false;
  const segments = path.split('.');
  let currentCollection = rootCollection;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const isLast = i === segments.length - 1;

    if (segment === '*') {
      // Wildcard is always valid — Directus itself only ever returns fields that exist.
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

// Filters a list of dot-paths down to only those that currently resolve against the
// schema. Order is preserved; invalid paths are simply dropped (not thrown on).
export function filterValidFieldPaths(schema, rootCollection, paths) {
  return paths.filter((path) => isValidFieldPath(schema, rootCollection, path));
}
