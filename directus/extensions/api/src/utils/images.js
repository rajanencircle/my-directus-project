/**
 * Builds picture objects for hotel media files.
 * Uses DIRECTUS_PUBLIC_URL env var as the base URL for asset links.
 *
 * @param {object[]} mediaJunctionRows - rows from hotels.media (hotels_directus_files junction)
 * @returns {object[]}
 */
export function buildImageUrls(mediaJunctionRows) {
  const base = (process.env.DIRECTUS_PUBLIC_URL ?? "").replace(/\/$/, "");

  return (mediaJunctionRows ?? [])
    .map((row, index) => {
      const file = row.directus_files_id;
      if (!file?.id) return null;
      return {
        id: file.id,
        filename: file.filename_download ?? null,
        url: `${base}/assets/${file.id}`,
        thumbnail_url: `${base}/assets/${file.id}?width=400&height=300&fit=cover`,
        copyright: file.copyright ?? null,
        workspace: file.folder?.name ?? null,
        expiry_date: file.expiry_date ?? null,
        alt_text: file.alt_text ?? null,
        sort: index + 1,
      };
    })
    .filter(Boolean);
}
