import fs from "fs";
import path from "path";
import { logger } from "../utils/logger.js";

export function loadState(stateFile) {
  const defaultState = {
    lastRunAt: null,
    completedItems: [],
    failedItems: [],
    errors: [],
    stats: {
      totalProcessed: 0,
      totalSucceeded: 0,
      totalSkipped: 0,
      totalFailed: 0,
    },
  };

  if (!fs.existsSync(stateFile)) {
    logger.info("[State] No existing state found — starting fresh");
    return defaultState;
  }

  try {
    const raw = fs.readFileSync(stateFile, "utf-8");
    const state = JSON.parse(raw);
    logger.info(
      `[State] Loaded state: ${state.stats.totalSucceeded} succeeded, ${state.stats.totalFailed} failed`,
    );
    return state;
  } catch (err) {
    logger.warn(`[State] Failed to load state: ${err.message} — starting fresh`);
    return defaultState;
  }
}

export function saveState(state, stateFile) {
  const dir = path.dirname(stateFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  state.lastRunAt = new Date().toISOString();
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
}

export function isItemCompleted(state, itemId) {
  return state.completedItems.includes(String(itemId));
}

export function markProductCompleted(state, itemId, stateFile) {
  const id = String(itemId);
  if (!state.completedItems.includes(id)) {
    state.completedItems.push(id);
  }
  state.stats.totalSucceeded++;
  state.stats.totalProcessed++;
  saveState(state, stateFile);
}

export function markProductFailed(state, itemId, error, stateFile) {
  const id = String(itemId);
  state.failedItems.push({ itemId: id, error, at: new Date().toISOString() });
  state.errors.push({ itemId: id, error: error.message ?? error, at: new Date().toISOString() });
  state.stats.totalFailed++;
  state.stats.totalProcessed++;
  saveState(state, stateFile);
}

export function markProductSkipped(state, itemId, stateFile) {
  state.stats.totalSkipped++;
  state.stats.totalProcessed++;
  saveState(state, stateFile);
}

export function getPendingProducts(state, allItems) {
  return allItems.filter((item) => !isItemCompleted(state, item.travel_id));
}
