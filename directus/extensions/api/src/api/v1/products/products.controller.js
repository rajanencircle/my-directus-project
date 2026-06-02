import { sendPaginated } from '../../shared/apiResponse.js';
import { parsePagination } from '../../shared/pagination.js';
import { listProducts, listProductsLimited } from './products.service.js';
import { shapeProduct } from '../../../transformers/product.transformer.js';
import { ensureUtcSuffix } from '../../../utils/timestamps.js';

function shapeLimitedProduct(item) {
  return {
    type: item._productType ?? 'unknown',
    id: item.id,
    object_id: item.object_id ?? null,
    name: item.name,
    status: item.status_primarix ?? null,
    date_created: ensureUtcSuffix(item.date_created),
    date_updated: ensureUtcSuffix(item.date_updated),
  };
}

export function createProductsController(context) {
  return {
    async details(req, res) {
      const { page, limit, offset } = parsePagination(req.query);
      const { search, country, sort, lang, updated_after } = req.query;

      const result = await listProducts(
        { page, limit, offset, search, country, sort, updated_after },
        context,
      );

      const data = result.data.map(item => {
        const shaped = shapeProduct(item, lang ?? null);
        delete shaped._productType;
        return shaped;
      });

      return sendPaginated(res, { ...result, data });
    },

    async limitedList(req, res) {
      const { page, limit, offset } = parsePagination(req.query);
      const { search, country, sort, updated_after } = req.query;

      const result = await listProductsLimited(
        { page, limit, offset, search, country, sort, updated_after },
        context,
      );

      const data = result.data.map(item => shapeLimitedProduct(item));

      return sendPaginated(res, { ...result, data });
    },
  };
}
