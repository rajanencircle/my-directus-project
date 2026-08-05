export function computeUpdatedAtMax(items) {
  if (!items || items.length === 0) return null;
  return items.reduce(
    (max, item) => (item.source_updated_at > max ? item.source_updated_at : max),
    items[0].source_updated_at,
  );
}
