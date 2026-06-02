import { sendError } from './apiResponse.js';
import { HTTP_STATUS } from './constants.js';

export async function loadApiKey({ services, database, getSchema }) {
  const schema = await getSchema();
  const configService = new services.ItemsService('global_configurations', { knex: database, schema });

  const rows = await configService.readByQuery({
    fields: ['value'],
    filter: { entity: { _eq: 'botg-api-user-key' } },
    limit: 1,
  });

  const value = rows?.[0]?.value ?? null;

  if (!value || value.trim() === '') {
    throw new Error("API key not found in 'global_configurations' where entity = 'botg-api-user-key'");
  }

  return value.trim();
}

export function createAuthMiddleware(keyState) {
  return function authMiddleware(req, res, next) {
    if (!keyState.apiKey) {
      return sendError(res, {
        status: HTTP_STATUS.SERVICE_UNAVAILABLE,
        message: 'Service temporarily unavailable. API key could not be loaded.',
      });
    }

    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, {
        status: HTTP_STATUS.UNAUTHORIZED,
        message: 'Missing or malformed Authorization header. Expected: Bearer <token>',
      });
    }

    if (authHeader.slice(7) !== keyState.apiKey) {
      return sendError(res, {
        status: HTTP_STATUS.UNAUTHORIZED,
        message: 'Invalid API token.',
      });
    }

    return next();
  };
}
