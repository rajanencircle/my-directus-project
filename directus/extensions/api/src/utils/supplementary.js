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
      const rawHeadline = item.headline ?? null;
      const rawText = item.text ?? null;

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
// plain string. Reads the `special_description` field.
export function extractSpecialsDescription(value) {
  const pick = (item) => {
    if (typeof item === "string") return item.trim() || null;
    if (!item || typeof item !== "object") return null;
    const desc = item.special_description ?? null;
    if (typeof desc === "string") return desc.trim() || null;
    return null;
  };

  if (Array.isArray(value)) {
    const texts = value.map(pick).filter(Boolean);
    return texts.length > 0 ? texts.join("\n\n") : null;
  }
  return pick(value);
}

// Extracts a single validity window from a specials JSON value (array of
// { valid_from, valid_to } entries, or a single such object). The contract's
// specials.valid_from/valid_to is one flat pair per product, but the source
// data can carry several specials each with their own window — the first entry that
// actually has one of the two dates set wins.
export function extractSpecialsValidity(value) {
  const items = Array.isArray(value) ? value : [value];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    if (item.special_valid_from != null || item.special_valid_to != null) {
      return {
        valid_from: item.special_valid_from ?? null,
        valid_to: item.special_valid_to ?? null,
      };
    }
  }
  return { valid_from: null, valid_to: null };
}
