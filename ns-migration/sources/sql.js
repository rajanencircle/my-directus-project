import mysql from "mysql2/promise";
import { sqlConfig } from "../config/sql.config.js";
import { logger } from "../utils/logger.js";

let pool;

function getPool() {
  if (!pool) {
    pool = mysql.createPool(sqlConfig);
  }
  return pool;
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info("[SQL] Connection pool closed");
  }
}

export async function fetchAllOverview(productConfig, languages) {
  const pool = getPool();
  const placeholders = languages.map(() => "?").join(",");
  const query = productConfig.sql.overviewQuery.replace("IN (?)", `IN (${placeholders})`);

  const [rows] = await pool.query(query, languages);

  logger.info(`[SQL] Fetched ${rows.length} ${productConfig.name} overview records`);
  return rows;
}

export async function fetchDetail(productConfig, travel_id, language) {
  const pool = getPool();
  const idColumn = productConfig.sql.idColumn;

  const [rows] = await pool.query(
    `SELECT * FROM ${productConfig.sql.table} WHERE ${idColumn} = ? AND language = ? LIMIT 1`,
    [travel_id, language],
  );

  if (rows.length === 0) {
    throw new Error(
      `No record found for ${idColumn}=${travel_id} language=${language}`,
    );
  }

  logger.debug(
    `[SQL] Fetched detail ${idColumn}=${travel_id} lang=${language}`,
  );
  return rows[0];
}

export async function fetchFieldRegistry(mappingParent) {
  const pool = getPool();

  const [rows] = await pool.query(
    `SELECT fieldid, parent, uid, label, D, GB, NL, B, CH, A, ZA
     FROM hotels_mapping
     WHERE parent = ?`,
    [mappingParent],
  );

  logger.info(`[SQL] Fetched ${rows.length} field mapping records for parent="${mappingParent}"`);
  return rows;
}
