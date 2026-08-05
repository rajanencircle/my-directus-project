import { HTTP_STATUS, HTTP_MESSAGE } from './constants.js';


const DEFAULT_SINGLE_RECORD_META = { page: 1, limit: 1, total: 1, returned: 1 };

export function sendSuccess(res, data, { status = HTTP_STATUS.OK, message, meta } = {}) {
  return res.status(status).json({
    success: true,
    message: message ?? HTTP_MESSAGE[status] ?? 'Success',
    data,
    meta: meta ?? DEFAULT_SINGLE_RECORD_META,
  });
}

export function sendPaginated(res, { data, total, page, limit }) {
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    message: HTTP_MESSAGE[HTTP_STATUS.OK],
    data,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total: Number(total),
      returned: Array.isArray(data) ? data.length : 0,
    },
  });
}

const DEFAULT_ERROR_META = { page: 1, limit: 0, total: 0, returned: 0 };

export function sendError(res, { status = HTTP_STATUS.INTERNAL_SERVER_ERROR, message, errors } = {}) {
  const body = {
    success: false,
    message: message ?? HTTP_MESSAGE[status] ?? 'An error occurred',
    meta: DEFAULT_ERROR_META,
  };
  if (errors) body.errors = errors;
  return res.status(status).json(body);
}
