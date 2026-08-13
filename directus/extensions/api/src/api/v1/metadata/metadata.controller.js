import { sendSuccess } from '../../shared/apiResponse.js';
import { getFieldMap, getLabels, getProductTypesCatalog } from './metadata.service.js';

export function createMetadataController(context) {
  return {
    async fieldMap(req, res) {
      const { collection, status, shape } = req.query;
      const result = await getFieldMap({ collection, status, shape: shape ?? 'flat' }, context);
      return sendSuccess(res, result.data, {
        meta: { page: 1, limit: result.data.length, total: result.total, returned: result.data.length },
      });
    },

    async labels(req, res) {
      const { lang, collection } = req.query;
      const result = await getLabels({ lang, collection }, context);
      const collectionCount = Object.keys(result.data).length;
      return sendSuccess(res, result.data, {
        meta: { page: 1, limit: collectionCount, total: collectionCount, returned: collectionCount },
      });
    },

    async productTypes(req, res) {
      const { publishing_status } = req.query;
      const data = await getProductTypesCatalog(context, { publishing_status });
      return sendSuccess(res, data, {
        meta: { page: 1, limit: data.length, total: data.length, returned: data.length },
      });
    },
  };
}
