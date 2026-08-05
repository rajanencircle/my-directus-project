import { asyncWrapper } from '../../shared/asyncWrapper.js';
import { validate } from '../../shared/validate.js';
import { getFieldMapSchema, getLabelsSchema, getProductTypesSchema } from './metadata.validation.js';
import { createMetadataController } from './metadata.controller.js';

export function setupMetadataRoutes(router, prefix, context) {
  const { fieldMap, labels, productTypes } = createMetadataController(context);
  router.get(`${prefix}/field-map`, validate(getFieldMapSchema), asyncWrapper(fieldMap));
  router.get(`${prefix}/labels`, validate(getLabelsSchema), asyncWrapper(labels));
  router.get(`${prefix}/product-types`, validate(getProductTypesSchema), asyncWrapper(productTypes));
}
