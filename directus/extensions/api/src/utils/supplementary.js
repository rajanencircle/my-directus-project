/**
 * @description Normalizes a source "supplementary" value into an array of `SupplementaryBlock` objects.
 *
 * Source data can arrive in unpredictable shapes (arrays of objects, arrays of strings,
 * single objects, or plain strings). This function inspects the input type, extracts any
 * `headline` and `text` it can find, and filters out empty blocks.
 *
 * It ensures unstructured supplementary JSON is cleaned up and strictly conforms to the
 * API contract's `{ headline, text }[]` shape.
 * 
 * @param {Array|Object|String|null} value - The raw supplementary value.
 * @returns {Array<Object>} Array of standardized SupplementaryBlock objects.
 */
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

/**
 * @description Extracts the description text from a specials JSON value.
 *
 * Accepts an array of items, a single object, or a plain string. It looks for
 * `special_description` and trims the value. When given an array, all descriptions are
 * extracted and joined together with double newlines.
 *
 * Product transformers use this to pull promotional or special description text buried
 * inside complex JSON blobs.
 * 
 * @param {Array|Object|String|null} value - The raw specials JSON value.
 * @returns {String|null} The combined specials description, or null if empty.
 */
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

/**
 * @description Extracts a single validity window from a specials JSON value.
 *
 * Iterates through the input, which can be an array or a single object. The first entry
 * that contains either `special_valid_from` or `special_valid_to` is returned immediately;
 * any subsequent items are ignored.
 *
 * This is used when mapping multiple special offers into the contract's flat
 * `valid_from` / `valid_to` structure, taking only the first relevant date range.
 * 
 * @param {Array|Object|null} value - The raw specials JSON value.
 * @returns {Object} An object containing `valid_from` and `valid_to` properties.
 */
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
