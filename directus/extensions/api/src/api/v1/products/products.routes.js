import { asyncWrapper } from '../../shared/asyncWrapper.js';
import { validate } from '../../shared/validate.js';
import { listProductsSchema } from './products.validation.js';
import { createProductsController } from './products.controller.js';

export function setupProductsRoutes(router, prefix, context) {
  const { details, limitedList } = createProductsController(context);
  router.get(`${prefix}/details`, validate(listProductsSchema), asyncWrapper(details));
  router.get(`${prefix}/limited-list`, validate(listProductsSchema), asyncWrapper(limitedList));
}
