// ------------------------------------------
// CONFIGURATION
// ------------------------------------------

// local
// const env = {
//   DIRECTUS_URL: "http://localhost:8055",
//   DIRECTUS_TOKEN: "872dSIw4Y6v7XRqLlUYgxwglqO190igH",
// };

/*
dev: https://directus-dev-botg.func.team
staging: https://directus-staging-botg.func.team
main: https://directus-prod-botg.func.team
*/

// // PROD (main)
// const env = {
//   DIRECTUS_URL: "https://directus-prod-botg.func.team",
//   DIRECTUS_TOKEN: "OSKnNsUKU2S2bpi0niaZ_HMpLr8q5cnN",
// };

// // staging
// const env = {
//   DIRECTUS_URL:
//     "https://cms.staging-5em2ouy-sxbqtq6mu5vgm.de-2.platformsh.site",
//   DIRECTUS_TOKEN: "-m5y_u_LpB62rOXFN0np1hnHpA1uOgRw",
// };

// const env = {
//   DIRECTUS_URL: "https://directus-staging-botg.func.team",
//   DIRECTUS_TOKEN: "OSKnNsUKU2S2bpi0niaZ_HMpLr8q5cnN",
// };

// // // dev
// const env = {
//   DIRECTUS_URL: "https://directus-dev-botg.func.team",
//   DIRECTUS_TOKEN: "QtF-MmL0PxJUPd1udylLm_lGOGtW2WES",
// };

const env = {
  // // PROD (main)
  // DIRECTUS_URL: "https://directus-prod-botg.func.team",
  // DIRECTUS_TOKEN: "OSKnNsUKU2S2bpi0niaZ_HMpLr8q5cnN",
  // // staging
  // DIRECTUS_URL: "https://directus-staging-botg.func.team",
  // DIRECTUS_TOKEN: "OSKnNsUKU2S2bpi0niaZ_HMpLr8q5cnN",
  // dev
  DIRECTUS_URL: "https://directus-dev-botg.func.team",
  DIRECTUS_TOKEN: "QtF-MmL0PxJUPd1udylLm_lGOGtW2WES",
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
  startId = null,
  endId = null,
) {
  try {
    console.log(`Fetching items from ${collectionName}...`);
    console.log(
      "startId",
      startId,
      "endId",
      endId,
      "fieldName",
      fieldName,
      "updateFieldName",
      updateFieldName,
    );

    // Fetch items. Using limit: -1 to get all, but for very large
    // collections you might need to implement pagination here.
    let path = `/items/${collectionName}?fields=id,${fieldName}&limit=-1&sort=id`;

    if (startId !== null && startId !== undefined) {
      path += `&filter[id][_gte]=${startId}`;
    }
    if (endId !== null && endId !== undefined) {
      path += `&filter[id][_lte]=${endId}`;
    }

    const response = await directusRequest("GET", path);

    console.log("response", response);
    const items = response.data || [];
    console.log("items", items);

    console.log(`Found ${items.length} items. Starting transformation...`);

    let updatedCount = 0;

    for (const item of items) {
      const originalValue = item[fieldName];

      // Await the transformation function since it's async
      const transformedValue = await transformFn(originalValue);
      // console.log("transformedValue", transformedValue);
      // Only trigger an API update if we got a valid transformed value and it differs from original
      // (Comparing an array/object originalValue with a string transformedValue will always be true)
      if (transformedValue) {
        await directusRequest("PATCH", `/items/${collectionName}/${item.id}`, {
          [updateFieldName]: transformedValue,
        });

        console.log(
          `[SUCCESS] Updated item ID ${item.id} to "${transformedValue}"`,
        );
        updatedCount++;
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
const myTransformFunction = async (value) => {
  // console.log("value", value);
  return parseInt(value);
  // console.log("value", value);
  // if (typeof value !== "string") return value;

  // // 1. Remove all '#' symbols
  // let cleaned = value.replace(/--/g, "");

  // // Remove any leading/trailing whitespace just in case
  // return cleaned.trim();

  //   const fetchCountryCode = async (destination) => {
  //     try {
  //       const response = await fetch(
  //         "https://botg.ai-playground.pro/api/chat/completions",
  //         {
  //           method: "POST",
  //           headers: {
  //             "Content-Type": "application/json",
  //             Authorization: "Bearer sk-00ffbf07910743b4b3a30bcb3d16bcf2",
  //           },
  //           body: JSON.stringify({
  //             model: "-hotel-translator-vlaams-beta-v2",
  //             messages: [
  //               {
  //                 role: "user",
  //                 content: `
  // You are a country code generator.

  // Task:
  // I will provide a country name in one of these languages:
  // - de-DE (German - Germany)
  // - nl-NL (Dutch - Netherlands/Belgium)
  // - de-CH (German - Switzerland)

  // Your job is to identify the country and return its standard 3-letter uppercase code.

  // Rules:
  // - Output only the 3-letter uppercase code.
  // - No explanation.
  // - No punctuation.
  // - Understand translated/localized country names.

  // Examples:
  // Deutschland -> DEU
  // Schweiz -> CHE
  // Belgien -> BEL
  // Niederlande -> NLD

  // Input: ${destination}
  //               `,
  //               },
  //             ],
  //           }),
  //         },
  //       );

  //       const data = await response.json();

  //       console.log("Full Response:", data);

  //       // Extract only the AI response text
  //       const code = data.choices?.[0]?.message?.content?.trim();

  //       console.log("Country/Continent Code:", code);

  //       return code;
  //     } catch (error) {
  //       console.error("API Error:", error);
  //     }
  //   };
  //   let code = "";
  //   // Example
  //   if (value && Array.isArray(value) && value.length > 0) {
  //     code = await fetchCountryCode(value[0].name);
  //   }
  //   return code;

  // return;
};

// Parse command line arguments for optional range
const startIdArg = process.argv[2] ? parseInt(process.argv[2]) : null;
const endIdArg = process.argv[3] ? parseInt(process.argv[3]) : null;

// Run the script
transformCollectionData(
  "hotels", // Collection Name
  "season_2", // Field to read from
  "season", // Field to update (can be the same or different)
  myTransformFunction, // Your transformation function
  // startIdArg, // Optional Start ID
  // startIdArg, // Optional End ID
);
