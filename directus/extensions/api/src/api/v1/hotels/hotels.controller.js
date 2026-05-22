import { sendSuccess, sendPaginated } from '../../shared/apiResponse.js';
import { parsePagination } from '../../shared/pagination.js';
import { listHotels, getHotelDetails } from './hotels.service.js';
import { shapeHotelListItem, shapeHotelDetail } from '../../../transformers/hotel.transformer.js';

export function createHotelsController(context) {
  return {
    async index(req, res) {
      const { page, limit, offset } = parsePagination(req.query);
      const { search, country, sort, lang, updated_after } = req.query;

      const result = await listHotels({ page, limit, offset, search, country, sort, updated_after }, context);
      const data = result.data.map(item => shapeHotelListItem(item, lang ?? null));
      return sendPaginated(res, { ...result, data });
    },

    async detail(req, res) {
      const { id } = req.params;
      const { lang } = req.query;

      const hotel = await getHotelDetails({ id }, context);
      const shaped = shapeHotelDetail(hotel, lang ?? null);
      return sendSuccess(res, shaped);
    },
  };
}
