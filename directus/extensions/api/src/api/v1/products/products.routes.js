import { asyncWrapper } from '../../shared/asyncWrapper.js';
import { validate } from '../../shared/validate.js';
import { listProductsSchema, getProductDetailSchema } from './products.validation.js';
import { createProductsController } from './products.controller.js';

export function setupProductsRoutes(router, prefix, context) {
  const { list, full, detail } = createProductsController(context);
  router.get(`${prefix}/full`, validate(listProductsSchema), asyncWrapper(full));
  router.get(`${prefix}/:id`, validate(getProductDetailSchema), asyncWrapper(detail));
  router.get(prefix, validate(listProductsSchema), asyncWrapper(list));
}
