/**
 * @description Computes the most recent `source_updated_at` timestamp from an array of items.
 *
 * Iterates over the items with a reduce operation to find the highest (most recent)
 * `source_updated_at` value, treating the timestamps as sortable strings.
 *
 * This is used when aggregating multiple records to determine the overall "last updated"
 * time for a dataset, which is useful for caching and delta synchronization.
 * 
 * @param {Array<Object>} items - Array of items containing `source_updated_at` properties.
 * @returns {String|null} The most recent timestamp, or null if the array is empty.
 */
export function computeUpdatedAtMax(items) {
  if (!items || items.length === 0) return null;
  return items.reduce(
    (max, item) => (item.source_updated_at > max ? item.source_updated_at : max),
    items[0].source_updated_at,
  );
}
