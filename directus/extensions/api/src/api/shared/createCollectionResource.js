import { asyncWrapper } from "./asyncWrapper.js";
import { validate } from "./validate.js";
import { createStandardValidation } from "./createStandardValidation.js";
import { createCollectionService } from "./createCollectionService.js";
import { createCollectionController } from "./createCollectionController.js";

export function createCollectionResource({
  collection,
  resourceLabel,
  listFields,
  filters,
  getDetails,
  shapeListItem,
  shapeDetail,
}) {
  const { listSlimSchema, listFullSchema, getDetailSchema } = createStandardValidation();

  return function setupRoutes(router, prefix, context) {
    const { listSlim, listFull } = createCollectionService({
      collection,
      resourceLabel,
      listFields,
      buildListFilter: filters.buildListFilter,
      buildSort: filters.buildSort,
      buildUpdatedAfterFilter: filters.buildUpdatedAfterFilter,
      getDetails,
    });

    const { index, fullList, detail } = createCollectionController({
      listSlim,
      listFull,
      getDetails,
      shapeListItem,
      shapeDetail,
    })(context);

    router.get(prefix, validate(listSlimSchema), asyncWrapper(index));
    router.get(`${prefix}/full`, validate(listFullSchema), asyncWrapper(fullList));
    router.get(`${prefix}/:id`, validate(getDetailSchema), asyncWrapper(detail));
  };
}
