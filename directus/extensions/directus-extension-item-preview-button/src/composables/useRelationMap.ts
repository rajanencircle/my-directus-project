import { useApi } from "@directus/extensions-sdk";

/**
 * Bidirectional lookup: "<collection>.<field>" -> related collection.
 * Cached at module scope — the map is identical for every interface instance
 * within a page load, so there's no reason to refetch per overlay.
 */
let cachedRelMap: Map<string, string> | null = null;
let cachedPromise: Promise<Map<string, string>> | null = null;

export function useRelationMap() {
  const api = useApi();

  async function getRelationMap(): Promise<Map<string, string>> {
    if (cachedRelMap) return cachedRelMap;
    if (cachedPromise) return cachedPromise;

    cachedPromise = (async () => {
      const map = new Map<string, string>();
      try {
        const res = await api.get("/relations", { params: { limit: -1 } });
        for (const r of res.data?.data ?? []) {
          if (!r.related_collection) continue;
          map.set(`${r.collection}.${r.field}`, r.related_collection);
          if (r.meta?.one_field) {
            map.set(`${r.related_collection}.${r.meta.one_field}`, r.collection);
          }
        }
      } catch {
        /* non-critical — leaf resolution just won't work, retry logic falls back to giving up */
      }
      cachedRelMap = map;
      return map;
    })();

    return cachedPromise;
  }

  return { getRelationMap };
}

/** Walk a dot-notation path from rootCollection to find its leaf collection + field. */
export function resolveLeafCollection(
  rootCollection: string,
  path: string,
  relMap: Map<string, string>,
): { leafCollection: string; leafField: string } | null {
  const parts = path.split(".");
  const leafField = parts[parts.length - 1];
  let current = rootCollection;
  for (let i = 0; i < parts.length - 1; i++) {
    const next = relMap.get(`${current}.${parts[i]}`);
    if (!next) return null;
    current = next;
  }
  return { leafCollection: current, leafField };
}
