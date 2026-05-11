// ------------------------------------------
// CONFIGURATION
// ------------------------------------------

// // local
// const env = {
//   DIRECTUS_URL: "http://localhost:8055",
//   DIRECTUS_TOKEN: "bn5wXhoMyyTXaxElVChZBsiCbmSH66Fl",
// };

// // staging
// const env = {
//   DIRECTUS_URL:
//     "https://cms.staging-5em2ouy-sxbqtq6mu5vgm.de-2.platformsh.site",
//   DIRECTUS_TOKEN: "-m5y_u_LpB62rOXFN0np1hnHpA1uOgRw",
// };

// dev
const env = {
  DIRECTUS_URL: "https://directus-dev-botg.func.team",
  DIRECTUS_TOKEN: "QARPY7qs65GsrPUs35LEgN7ApexarinS",
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
      // console.log("item", item);
      const originalValue = item["translations"];
      // console.log("originalValue", originalValue);
      // Proceed if the value exists
      // if (originalValue !== undefined && originalValue !== null) {
      // Pass the value to your custom transformer function
      const transformedValue = transformFn(originalValue);

      // Only trigger an API update if the value actually changed
      if (transformedValue !== originalValue) {
        // await directusRequest("PATCH", `/items/${collectionName}/${item.id}`, {
        //   [updateFieldName]: transformedValue,
        // });

        console.log(
          `[SUCCESS] Updated item ID ${item.id}: "${originalValue}" -> "${transformedValue}"`,
        );
        updatedCount++;
      }
      // }
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
const myTransformFunction = async (value) => {
  // console.log("value", value);
  // if (typeof value !== "string") return value;

  // // 1. Remove all '#' symbols
  // let cleaned = value.replace(/--/g, "");

  // // Remove any leading/trailing whitespace just in case
  // return cleaned.trim();

  const fetchCountryCode = async (destination) => {
    try {
      const response = await fetch(
        "https://botg.ai-playground.pro/api/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer sk-00ffbf07910743b4b3a30bcb3d16bcf2",
          },
          body: JSON.stringify({
            model: "-hotel-translator-vlaams-beta-v2",
            messages: [
              {
                role: "user",
                content: `
You are a country and continent code generator.

Task:
I will provide a continent or country name in one of these languages:
- de-DE (German - Germany)
- nl-NL (Dutch - Netherlands/Belgium)
- de-CH (German - Switzerland)

Your job is to identify the country or continent and return its standard 3-letter uppercase code.

Rules:
- Return ONLY the 3-letter uppercase code.
- Do not explain anything.
- Do not add extra text, punctuation, quotes, or formatting.
- For countries, return the ISO 3166-1 alpha-3 code.
- For continents, use these codes:
  - Europe → EUR
  - Asia → ASI
  - Africa → AFR
  - North America → NAM
  - South America → SAM
  - Oceania → OCE
  - Antarctica → ANT

Input: ${destination}
              `,
              },
            ],
          }),
        },
      );

      const data = await response.json();

      console.log("Full Response:", data);

      // Extract only the AI response text
      const code = data.choices?.[0]?.message?.content?.trim();

      console.log("Country/Continent Code:", code);

      return code;
    } catch (error) {
      console.error("API Error:", error);
    }
  };
  let code = "";
  // Example
  if (value && Array.isArray(value) && value.length > 0) {
    code = await fetchCountryCode(value[0].name);
  }
  return code;
};

// Run the script
transformCollectionData(
  "countries", // Collection Name
  "translations.*", // Field to read from
  "ISO_alpha_3_code", // Field to update (can be the same or different)
  myTransformFunction, // Your transformation function
);
