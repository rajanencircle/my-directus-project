import { createCruisesController } from './cruises.controller.js';

export function setupCruisesRoutes(router, prefix) {
  const { index } = createCruisesController();
  router.get(prefix, index);
}
