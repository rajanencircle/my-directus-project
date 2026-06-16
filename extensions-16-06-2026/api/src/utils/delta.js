export function computeUpdatedAtMax(items) {
  if (!items || items.length === 0) return null;
  return items.reduce(
    (max, item) => (item.date_updated > max ? item.date_updated : max),
    items[0].date_updated,
  );
}
