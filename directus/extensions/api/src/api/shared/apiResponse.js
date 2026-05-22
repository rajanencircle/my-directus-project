import { HTTP_STATUS, HTTP_MESSAGE } from './constants.js';

function buildMeta(req, extra = {}) {
  return {
    requestId: req?.id ?? null,
    timestamp: new Date().toISOString(),
    ...extra,
  };
}

export function sendSuccess(res, data, { status = HTTP_STATUS.OK, message, meta = {} } = {}) {
  return res.status(status).json({
    success: true,
    message: message ?? HTTP_MESSAGE[status] ?? 'Success',
    data,
    meta: buildMeta(res.req, meta),
  });
}

export function sendPaginated(res, { data, total, page, limit, updatedAtMax = null }) {
  const totalPages = Math.ceil(total / limit);
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    message: HTTP_MESSAGE[HTTP_STATUS.OK],
    data,
    meta: {
      requestId: res.req?.id ?? null,
      timestamp: new Date().toISOString(),
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        updated_at_max: updatedAtMax,
      },
    },
  });
}

export function sendError(res, { status = HTTP_STATUS.INTERNAL_SERVER_ERROR, message, errors } = {}) {
  const body = {
    success: false,
    message: message ?? HTTP_MESSAGE[status] ?? 'An error occurred',
    meta: buildMeta(res.req),
  };
  if (errors) body.errors = errors;
  return res.status(status).json(body);
}
