import { sendPaginated } from '../../shared/apiResponse.js';
import { parsePagination } from '../../shared/pagination.js';
import { listProducts } from './products.service.js';
import { shapeProduct } from '../../../transformers/product.transformer.js';

export function createProductsController(context) {
  return {
    async index(req, res) {
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
  };
}
