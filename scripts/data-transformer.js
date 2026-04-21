// ------------------------------------------
// CONFIGURATION
// ------------------------------------------

//local
// const env = {
//   DIRECTUS_URL: "http://localhost:8055",
//   DIRECTUS_TOKEN: "-m5y_u_LpB62rOXFN0np1hnHpA1uOgRw",
// };

//staging
const env = {
  DIRECTUS_URL:
    "https://cms.staging-5em2ouy-sxbqtq6mu5vgm.de-2.platformsh.site",
  DIRECTUS_TOKEN: "-m5y_u_LpB62rOXFN0np1hnHpA1uOgRw",
};

// Initialize Directus client URL
const DIRECTUS_URL = env.DIRECTUS_URL;
// Replace this with your actual Directus Admin token
const DIRECTUS_TOKEN = env.DIRECTUS_TOKEN;

// =============================================================================
// Directus API Helper
// =============================================================================
async function directusRequest(method, path, body) {
  const url = `${DIRECTUS_URL}${path}`;
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DIRECTUS_TOKEN}`,
    },
  };
  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${path} → HTTP ${res.status}: ${text}`);
  }

  if (res.status === 204) return null;

  return res.json();
}

/**
 * Transforms data for a specific field in a Directus collection.
 *
 * @param {string} collectionName - The name of the collection (e.g., 'partner').
 * @param {string} fieldName - The name of the field to read the original string from.
 * @param {string} updateFieldName - The name of the field to save the updated string to.
 * @param {Function} transformFn - A function that takes the current value and returns the transformed value.
 */
async function transformCollectionData(
  collectionName,
  fieldName,
  updateFieldName,
  transformFn,
) {
  try {
    console.log(`Fetching items from ${collectionName}...`);

    // Fetch items. Using limit: -1 to get all, but for very large
    // collections you might need to implement pagination here.
    const path = `/items/${collectionName}?fields=id,${fieldName}&limit=-1`;
    const response = await directusRequest("GET", path);
    const items = response.data || [];

    console.log(`Found ${items.length} items. Starting transformation...`);

    let updatedCount = 0;

    for (const item of items) {
      const originalValue = item[fieldName];

      // Proceed if the value exists
      if (originalValue !== undefined && originalValue !== null) {
        // Pass the value to your custom transformer function
        const transformedValue = transformFn(originalValue);

        // Only trigger an API update if the value actually changed
        if (transformedValue !== originalValue) {
          await directusRequest(
            "PATCH",
            `/items/${collectionName}/${item.id}`,
            {
              [updateFieldName]: transformedValue,
            },
          );

          console.log(
            `[SUCCESS] Updated item ID ${item.id}: "${originalValue}" -> "${transformedValue}"`,
          );
          updatedCount++;
        }
      }
    }

    console.log(
      `\nTransformation complete! Updated ${updatedCount} items in total.`,
    );
  } catch (error) {
    console.error(
      "Error transforming data:",
      error.errors || error.message || error,
    );
  }
}

// ==========================================
// EXAMPLE USAGE:
// ==========================================

// Define your custom transformation function.
// For your specific case: removes '#' symbols and capitalizes words.
const myTransformFunction = (value) => {
  if (typeof value !== "string") return value;

  // 1. Remove all '#' symbols
  let cleaned = value.replace(/--/g, "");

  // Remove any leading/trailing whitespace just in case
  return cleaned.trim();
};

// Run the script
transformCollectionData(
  "regions", // Collection Name
  "label", // Field to read from
  "label", // Field to update (can be the same or different)
  myTransformFunction, // Your transformation function
);
