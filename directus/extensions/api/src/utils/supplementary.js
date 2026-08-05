// Normalizes a source "supplementary" value into the contract's SupplementaryBlock[]
// shape ({ headline, text } strings). Source values arrive in various forms:
// - an array of objects ({ headline, text } or { content } or { title, description } etc.)
// - an array of strings
// - a single object
// - a plain string
// Returns an array of SupplementaryBlock objects.
export function toSupplementaryBlocks(value) {
  const extractBlock = (item) => {
    if (typeof item === "object" && item !== null) {
      const rawHeadline =
        item.headline !== undefined && item.headline !== null
          ? item.headline
          : item.heading !== undefined && item.heading !== null
            ? item.heading
            : item.title !== undefined && item.title !== null
              ? item.title
              : item.header !== undefined && item.header !== null
                ? item.header
                : item.name !== undefined && item.name !== null
                  ? item.name
                  : null;
      const rawText =
        item.text !== undefined && item.text !== null
          ? item.text
          : item.content !== undefined && item.content !== null
            ? item.content
            : item.description !== undefined && item.description !== null
              ? item.description
              : item.body !== undefined && item.body !== null
                ? item.body
                : null;

      const headline =
        typeof rawHeadline === "string"
          ? rawHeadline.trim() || null
          : rawHeadline != null
            ? String(rawHeadline).trim() || null
            : null;
      const text =
        typeof rawText === "string"
          ? rawText.trim() || null
          : rawText != null
            ? String(rawText).trim() || null
            : null;

      if (headline === null && text === null) {
        return null;
      }
      return { headline, text };
    }

    if (typeof item === "string") {
      const text = item.trim();
      return text.length > 0 ? { headline: null, text } : null;
    }

    return null;
  };

  if (Array.isArray(value)) {
    return value.map(extractBlock).filter(Boolean);
  }

  if (typeof value === "object" && value !== null) {
    const block = extractBlock(value);
    return block ? [block] : [];
  }

  if (typeof value === "string") {
    const block = extractBlock(value);
    return block ? [block] : [];
  }

  return [];
}

// Extracts the description text from a specials JSON value directly, without the
// extra name/headline/title field. Accepts an array of items, a single object, or a
// plain string. Reads the description field (`text`, falling back to `special_description`).
export function extractSpecialsDescription(value) {
  const pick = (item) => {
    if (typeof item === "string") return item.trim() || null;
    if (!item || typeof item !== "object") return null;
    const desc = item.text ?? item.special_description ?? item.description;
    if (typeof desc === "string") return desc.trim() || null;
    return null;
  };

  if (Array.isArray(value)) {
    const texts = value.map(pick).filter(Boolean);
    return texts.length > 0 ? texts.join("\n\n") : null;
  }
  return pick(value);
}
