import { HTTP_STATUS } from '../../shared/constants.js';

export function createCruisesController() {
  return {
    index(req, res) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json({
        success: false,
        message: 'Cruise schema not yet finalised',
      });
    },
  };
}
