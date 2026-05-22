import { asyncWrapper } from '../../shared/asyncWrapper.js';
import { validate } from '../../shared/validate.js';
import { listProductsSchema } from './products.validation.js';
import { createProductsController } from './products.controller.js';

export function setupProductsRoutes(router, prefix, context) {
  const { index } = createProductsController(context);
  router.get(prefix, validate(listProductsSchema), asyncWrapper(index));
}
