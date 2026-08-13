import { sendPaginated, sendSuccess } from '../../shared/apiResponse.js';
import { parsePagination } from '../../shared/pagination.js';
import { listProducts, listProductsSlim, getProductById } from './products.service.js';
import { shapeProduct } from '../../../transformers/product.transformer.js';

export function createProductsController(context) {
  return {
    /**
     * GET /products
     * Retrieves an aggregated slim list of products (`ProductListItem[]`).
     */
    async list(req, res) {
      const { page, limit, offset } = parsePagination(req.query);
      const { lang, updated_after } = req.query;

      const result = await listProductsSlim(
        { page, limit, offset, updated_after, lang: lang ?? null },
        context,
      );

      return sendPaginated(res, result);
    },

    /**
     * GET /products/full
     * Retrieves an aggregated full details list of products (`ProductDetail[]`).
     */
    async full(req, res) {
      const { page, limit, offset } = parsePagination(req.query);
      const { lang, updated_after } = req.query;

      const result = await listProducts(
        { page, limit, offset, updated_after },
        context,
      );

      const data = result.data.map(item => shapeProduct(item, lang ?? null, { allowTombstone: true }));

      return sendPaginated(res, { ...result, data });
    },

    /**
     * GET /products/{id}
     * Retrieves the specific full details for a product by its ID (`ProductDetailResponse`).
     */
    async detail(req, res) {
      const { id } = req.params;
      const { lang } = req.query;

      const item = await getProductById({ id }, context);
      const data = shapeProduct(item, lang ?? null);

      return sendSuccess(res, data);
    },

  };
}
