import mysql from "mysql2/promise";
import fetch from "cross-fetch";
import { createDirectus, rest, createItem } from "@directus/sdk";

// ---------------- CONFIG ----------------

const MYSQL_CONFIG = {
  host: "127.0.0.1",
  user: "root",
  password: "",
  database: "botg",
  port: 3306,
};

const DIRECTUS_URL = "http://localhost:8055";
const DIRECTUS_TOKEN = "jme_U0tFPnhuddKUz2p5-xqnu2IZY6Sj";
const DIRECTUS_COLLECTION = "hotels";

// legacy table
const HOTEL_TABLE = "hotels";

// ----------------------------------------

async function main() {
  // connect mysql
  const connection = await mysql.createConnection(MYSQL_CONFIG);

  console.log("Connected to MySQL");

  // fetch hotels
  const [rows] = await connection.execute(`
    SELECT 
      *
    FROM ${HOTEL_TABLE}
    WHERE oid IS NOT NULL
  `);

  console.log(`Fetched ${rows.length} rows`);

  // ----------------------------
  // group by OID
  // ----------------------------

  const grouped = {};

  for (const row of rows) {
    if (!grouped[row.oid]) {
      grouped[row.oid] = [];
    }
    grouped[row.oid].push(row);
  }

  // ----------------------------
  // map to directus structure
  // ----------------------------

  const hotels = Object.values(grouped).map((group) => {
    // find German
    let german = group.find((g) => g.language === "D");

    // fallback first
    if (!german) german = group[0];

    return {
      object_id: german.oid,
      name: german.field_41_1,
    };
  });

  // print result
  console.log("Mapped Hotels:");
  console.log(JSON.stringify(hotels, null, 2));

  // ----------------------------
  // Directus client
  // ----------------------------

  //   const directus = createDirectus(DIRECTUS_URL).with(
  //     rest({
  //       fetch,
  //     }),
  //   );

  //   // add hotels
  //   for (const hotel of hotels) {
  //     try {
  //       await directus.request(createItem(DIRECTUS_COLLECTION, hotel), {
  //         headers: {
  //           Authorization: `Bearer ${DIRECTUS_TOKEN}`,
  //         },
  //       });

  //       console.log(`Created: ${hotel.name}`);
  //     } catch (err) {
  //       console.error(`Failed: ${hotel.name}`, err.message);
  //     }
  //   }

  await connection.end();
}

main();
