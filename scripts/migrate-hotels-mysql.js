const { execSync } = require('child_process');
const axios = require('axios');

/**
 * Hotel Migration Script: MySQL (botg.hotels) -> Directus (hotels)
 *
 * Logic:
 * 1. Find all hotels in MySQL hotels table.
 * 2. Group by 'oid' (hotels with same oid are different locales of the same hotel).
 * 3. Use the record with language 'D' as the source of truth (base).
 * 4. Map MySQL fields to Directus fields with aggressive sanitation.
 *
 * Usage:
 *   export DIRECTUS_URL="http://localhost:8055"
 *   export DIRECTUS_TOKEN="..."
 *
 *   node migrate-hotels-mysql.js              # live run
 *   node migrate-hotels-mysql.js --dry-run    # log intended changes, no writes
 */

// ------------------------------------------
// CONFIGURATION
// ------------------------------------------

// Never hardcode tokens here — this file is committed to git and leaked
// Directus tokens have had to be rotated before (see CLAUDE.md rule 4).
const DIRECTUS_URL = process.env.DIRECTUS_URL || "http://localhost:8055";
const DIRECTUS_TOKEN = process.env.DIRECTUS_TOKEN || "";
const DRY_RUN = process.argv.includes("--dry-run");

if (!DIRECTUS_TOKEN) {
  console.error("Missing DIRECTUS_TOKEN env var. Set it before running this script.");
  process.exit(1);
}

// =============================================================================
// Sanitation Helpers
// =============================================================================

function cleanPhone(phone) {
    if (!phone) return null;
    // Remove all whitespace and take first line
    let val = phone.split('\n')[0].replace(/\s/g, '');
    if (!val.startsWith('+')) {
        if (val.startsWith('00')) val = '+' + val.substring(2);
        else return null; 
    }
    // Remove characters not allowed by Directus regex: ^\+[1-9]\d{1,14}(?:[\s.-]*\d+)*$
    let cleaned = val.replace(/[^\d+ \.-]/g, '').trim();
    const phoneRegex = /^\+[1-9]\d{1,14}(?:[\s.-]*\d+)*$/;
    return phoneRegex.test(cleaned) ? cleaned : null;
}

function cleanEmail(email) {
    if (!email) return null;
    // Take first line and remove all whitespace
    let val = email.split('\n')[0].replace(/\s/g, '').toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(val) ? val : null;
}

function cleanWebsite(url) {
    if (!url) return null;
    // Take first line and remove all whitespace
    let val = url.split('\n')[0].replace(/\s/g, '');
    if (['n/a', 'none', '-', '.'].includes(val.toLowerCase())) return null;
    if (!val.startsWith('http')) val = 'http://' + val;
    // Very basic URL validation
    try {
        new URL(val);
        return val;
    } catch (e) {
        return null;
    }
}

// =============================================================================
// Directus API Helper
// =============================================================================
async function directusRequest(method, path, body) {
  const url = `${DIRECTUS_URL}${path}`;
  const options = {
    method,
    url,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DIRECTUS_TOKEN}`,
    },
    data: body
  };

  try {
    const res = await axios(options);
    return res.data;
  } catch (err) {
    const details = err.response?.data || err.message;
    throw new Error(`${method} ${path} failed: ${JSON.stringify(details)}`);
  }
}

// =============================================================================
// Agencies OID lookup (not yet wired into the sync loop below)
// =============================================================================
// The legacy hotel field that used to drive the "booking partner" dropdown
// (botg.hotels.field_365_1 / field_id_365) references Primarix's px_feldlisten
// value-list (cid=35), NOT botg.agencies.oid — there is currently no field on
// the legacy hotel row that carries the real agencies.object_id. Once the
// client provides a px_feldlisten-id -> agencies.object_id crosswalk (or
// confirms the ~6 name mismatches found during analysis), resolve each
// hotel's agency like this and set payload.booking = agencyIdByObjectId.get(oid).
async function buildAgencyOidMap() {
    const result = await directusRequest("GET", "/items/agencies?fields=id,object_id&limit=-1");
    const agencies = result.data || [];
    return new Map(agencies.filter(a => a.object_id != null).map(a => [a.object_id, a.id]));
}

async function migrateHotels() {
    try {
        console.log('=== Starting Hotel Migration (Aggressive Sanitation) ===');
        if (DRY_RUN) console.log('(dry run — no writes will be made)');

        console.log('\nStep 1: Fetching hotels from MySQL (Source of Truth: language="D")...');
        const mysqlCommand = `mysql -u root -N -B -e "SELECT oid, field_41_1, field_26_1, field_27_1, field_29_1, field_42_1, field_31_1, field_218_1, field_36_1 FROM botg.hotels WHERE language = 'D'"`;
        const mysqlOutput = execSync(mysqlCommand).toString();
        
        const rows = mysqlOutput.trim().split('\n').filter(Boolean).map(line => {
            const parts = line.split('\t');
            return { 
                object_id: parseInt(parts[0]), 
                name: (parts[1] || "").trim(),
                street: (parts[2] || "").trim(),
                street_number: (parts[3] || "").trim(),
                zip_code: (parts[4] || "").trim(),
                email_general: cleanEmail(parts[5]),
                phone_general: cleanPhone(parts[6]),
                phone_ah: cleanPhone(parts[7]),
                website: cleanWebsite(parts[8])
            };
        });

        if (rows.length === 0) {
            console.error('No hotels found in MySQL with language="D".');
            return;
        }

        console.log(`Found ${rows.length} hotels in MySQL.`);

        console.log('\nStep 2: Fetching existing hotels from Directus...');
        const existingResult = await directusRequest("GET", "/items/hotels?fields=id,object_id&limit=-1");
        const existingHotels = existingResult.data || [];
        const objectIdToId = new Map(existingHotels.map(h => [h.object_id, h.id]));

        console.log(`Found ${existingHotels.length} existing hotels in Directus.`);

        console.log('\nStep 3: Syncing data...');
        let createdCount = 0;
        let updatedCount = 0;
        let errorCount = 0;

        for (const hotel of rows) {
            try {
                const payload = {};
                if (hotel.name) payload.name = hotel.name;
                if (hotel.street) payload.street = hotel.street;
                if (hotel.street_number) payload.street_number = hotel.street_number;
                if (hotel.zip_code) payload.zip_code = hotel.zip_code;
                if (hotel.email_general) payload.email_general = hotel.email_general;
                if (hotel.phone_general) payload.phone_general = hotel.phone_general;
                if (hotel.phone_ah) payload.phone_ah = hotel.phone_ah;
                if (hotel.website) payload.website = hotel.website;

                if (objectIdToId.has(hotel.object_id)) {
                    const id = objectIdToId.get(hotel.object_id);
                    if (Object.keys(payload).length > 0 && !DRY_RUN) {
                        await directusRequest("PATCH", `/items/hotels/${id}`, payload);
                    }
                    updatedCount++;
                } else {
                    if (!DRY_RUN) {
                        await directusRequest("POST", "/items/hotels", {
                            ...payload,
                            object_id: hotel.object_id,
                            status: 'published'
                        });
                    }
                    createdCount++;
                }

                if ((createdCount + updatedCount) % 100 === 0) {
                    process.stdout.write(`Progress: ${createdCount + updatedCount}/${rows.length}\r`);
                }
            } catch (err) {
                console.error(`\n[ERROR] Failed to sync hotel OID ${hotel.object_id}:`, err.message);
                errorCount++;
            }
        }

        console.log(`\n\n=== Migration Summary ===`);
        console.log(`✅ Created : ${createdCount}`);
        console.log(`✅ Updated : ${updatedCount}`);
        if (errorCount > 0) {
            console.log(`❌ Errors  : ${errorCount}`);
        }
        console.log(`==========================`);

    } catch (error) {
        console.error("\n❌ Fatal Error:", error.message);
    }
}

migrateHotels();
