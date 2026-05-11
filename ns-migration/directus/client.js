import { createDirectus, rest, staticToken, readItems, createItem, createItems, updateItem, deleteItem } from "@directus/sdk";
import { directusConfig } from "../config/directus.config.js";

export function createClient() {
  return createDirectus(directusConfig.url)
    .with(rest())
    .with(staticToken(directusConfig.token));
}

export async function readCollection(client, collection, options = {}) {
  const query = {};
  if (options.fields) query.fields = options.fields.join(",");
  if (options.filter) query.filter = options.filter;
  if (options.limit) query.limit = options.limit;
  if (options.offset) query.offset = options.offset;
  if (options.sort) query.sort = options.sort;

  return client.request(readItems(collection, query));
}

export async function createRecord(client, collection, data) {
  return client.request(createItem(collection, data));
}

export async function createRecords(client, collection, data) {
  return client.request(createItems(collection, data));
}

export async function updateRecord(client, collection, id, data) {
  return client.request(updateItem(collection, id, data));
}

export async function deleteRecord(client, collection, id) {
  return client.request(deleteItem(collection, id));
}

export async function findByExternalId(client, collection, externalIdField, externalId) {
  const results = await readCollection(client, collection, {
    filter: { [externalIdField]: { _eq: externalId } },
    fields: ["id", externalIdField],
    limit: 1,
  });
  return results?.[0] ?? null;
}

export { readItems, createItem, createItems, updateItem, deleteItem };
