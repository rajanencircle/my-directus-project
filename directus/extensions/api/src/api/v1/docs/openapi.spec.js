export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'BOTG API',
    version: '1.0.0',
    description: 'Custom REST API layer for BOTG — hotels, products, and more.',
  },
  tags: [
    { name: 'Hotels', description: 'Hotel listings and detail' },
    { name: 'Products', description: 'Product type catalogue' },
  ],
  paths: {
    '/api/v1/hotels': {
      get: {
        tags: ['Hotels'],
        summary: 'List hotels',
        parameters: [
          { in: 'query', name: 'lang', schema: { type: 'string', enum: ['de', 'en', 'nl'] }, description: 'If set, only that language is returned in the translations block. Omit to get all languages.' },
          { in: 'query', name: 'country', schema: { type: 'integer', minimum: 1 }, description: 'Filter by country ID.' },
          { in: 'query', name: 'search', schema: { type: 'string', maxLength: 200 }, description: 'Full-text search on hotel name and teaser.' },
          { in: 'query', name: 'sort', schema: { type: 'string', enum: ['name', '-name', 'date_updated', '-date_updated'] }, description: 'Default: -date_updated' },
          { in: 'query', name: 'updated_after', schema: { type: 'string', format: 'date-time' }, description: 'Delta sync — return only records updated after this timestamp.' },
          { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1, default: 1 } },
          { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
        ],
        responses: {
          200: {
            description: 'Paginated hotel list',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PaginatedHotelListResponse' },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },
    '/api/v1/hotels/{id}': {
      get: {
        tags: ['Hotels'],
        summary: 'Get hotel detail',
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string' }, description: 'Hotel UUID, numeric object_id, or px_source_id.' },
          { in: 'query', name: 'lang', schema: { type: 'string', enum: ['de', 'en', 'nl'] }, description: 'If set, only that language is returned in the translations block.' },
        ],
        responses: {
          200: {
            description: 'Full hotel detail',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'OK' },
                    data: { $ref: '#/components/schemas/HotelDetail' },
                    meta: { $ref: '#/components/schemas/ResponseMeta' },
                  },
                },
              },
            },
          },
          404: { $ref: '#/components/responses/NotFound' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },
    '/api/v1/products': {
      get: {
        tags: ['Products'],
        summary: 'List product types',
        description: 'Returns a static catalogue of available product types and their API endpoints.',
        responses: {
          200: {
            description: 'Static product type catalogue',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'OK' },
                    data: { type: 'array', items: { $ref: '#/components/schemas/ProductType' } },
                    meta: { $ref: '#/components/schemas/ResponseMeta' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      ResponseMeta: {
        type: 'object',
        properties: {
          requestId: { type: 'string', nullable: true },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      PaginationMeta: {
        type: 'object',
        properties: {
          total: { type: 'integer', description: 'Total number of matching records' },
          page: { type: 'integer' },
          limit: { type: 'integer' },
          totalPages: { type: 'integer' },
          hasNext: { type: 'boolean' },
          hasPrev: { type: 'boolean' },
          updated_at_max: { type: 'string', format: 'date-time', nullable: true, description: 'Latest date_updated among returned records — use for delta sync cursoring.' },
        },
      },
      PaginatedHotelListResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'OK' },
          data: { type: 'array', items: { $ref: '#/components/schemas/HotelListItem' } },
          meta: {
            allOf: [
              { $ref: '#/components/schemas/ResponseMeta' },
              { type: 'object', properties: { pagination: { $ref: '#/components/schemas/PaginationMeta' } } },
            ],
          },
        },
      },
      GeoObject: {
        type: 'object',
        nullable: true,
        properties: {
          id: { type: 'integer' },
          iso: { type: 'string', nullable: true },
          id_primarix: { type: 'integer', nullable: true },
          location_tour32: { type: 'integer', nullable: true },
          translations: {
            type: 'object',
            additionalProperties: {
              type: 'object',
              properties: { name: { type: 'string', nullable: true } },
            },
          },
        },
      },
      HotelListItem: {
        type: 'object',
        properties: {
          type: { type: 'string', example: 'hotel' },
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          object_id: { type: 'integer', nullable: true },
          status: { type: 'string', enum: ['published', 'draft'], nullable: true },
          date_created: { type: 'string', format: 'date-time' },
          date_updated: { type: 'string', format: 'date-time' },
          translations: {
            type: 'object',
            description: 'Keyed by ISO 639-1 language code. Contains only the requested lang if lang param is set.',
            additionalProperties: {
              type: 'object',
              properties: {
                teaser: { type: 'string', nullable: true },
                description_short: { type: 'string', nullable: true },
              },
            },
          },
          description: {
            type: 'object',
            nullable: true,
            description: 'Single-language shortcut — same content as translations[lang].',
            properties: {
              teaser: { type: 'string', nullable: true },
              description_short: { type: 'string', nullable: true },
            },
          },
          country: { $ref: '#/components/schemas/GeoObject' },
          state: { $ref: '#/components/schemas/GeoObject' },
          region: { $ref: '#/components/schemas/GeoObject' },
          place: { $ref: '#/components/schemas/GeoObject' },
          hotel_classification: {
            type: 'object',
            nullable: true,
            properties: {
              id: { type: 'string', format: 'uuid' },
              label: { type: 'string' },
            },
          },
          hotel_group: {
            type: 'object',
            nullable: true,
            properties: {
              id: { type: 'string', format: 'uuid' },
              label: { type: 'string' },
            },
          },
        },
      },
      HotelDetail: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          object_id: { type: 'integer', nullable: true },
          type: { type: 'string', example: 'hotel' },
          status: { type: 'string', enum: ['published', 'draft'], nullable: true },
          date_created: { type: 'string', format: 'date-time' },
          date_updated: { type: 'string', format: 'date-time' },
          name: { type: 'string' },
          classification: { type: 'string', nullable: true, description: 'Label from hotel_classifications (e.g. "3 Sterne").' },
          accommodation_type: { type: 'string', nullable: true, description: 'Label of the first accommodation type.' },
          supplier: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['Independent', 'Partner'], nullable: true },
              id_tour_user: { type: 'string', nullable: true },
              haupt_id_tour_user: { type: 'string', nullable: true },
              booking_partner: { type: 'string', nullable: true },
            },
          },
          partner_filter_ids: {
            type: 'array',
            items: { type: 'integer' },
            description: 'Primarix IDs of assigned partners.',
          },
          address: {
            type: 'object',
            properties: {
              street: { type: 'string', nullable: true },
              street_number: { type: 'string', nullable: true },
              zip_code: { type: 'string', nullable: true },
              town: { type: 'string', nullable: true },
              state: { type: 'string', nullable: true },
              state_code: { type: 'string', nullable: true },
              region: { type: 'string', nullable: true },
              country: { type: 'string', nullable: true },
              country_code: { type: 'string', nullable: true },
              geo: { type: 'object', nullable: true },
            },
          },
          contact: {
            type: 'object',
            properties: {
              phone: { type: 'string', nullable: true },
              phone_emergency: { type: 'string', nullable: true },
              email: { type: 'string', nullable: true },
              website: { type: 'string', nullable: true },
            },
          },
          translations: {
            type: 'object',
            description: 'Keyed by ISO 639-1 language code. Contains only the requested lang if lang param is set.',
            additionalProperties: {
              type: 'object',
              properties: {
                introduction: { type: 'string', nullable: true },
                description_main: { type: 'string', nullable: true },
                description_location: { type: 'string', nullable: true },
                description_rooms: { type: 'string', nullable: true },
                included_services: { type: 'string', nullable: true },
                not_included: { type: 'string', nullable: true },
                mobility_advice: { type: 'string', nullable: true },
              },
            },
          },
          rooms: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                category: { type: 'string', description: 'Room category name.' },
                prices: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      start_date: { type: 'string', format: 'date' },
                      end_date: { type: 'string', format: 'date' },
                      occupancies: {
                        type: 'object',
                        description: 'Keyed by occupancy name (e.g. "EZ", "DZ"). Falls back to occupancy value integer if name is unavailable.',
                        additionalProperties: {
                          type: 'object',
                          properties: {
                            buy: { type: 'number', nullable: true },
                            sell: { type: 'number', nullable: true },
                            margin: { type: 'number', nullable: true },
                            unit: { type: 'string', enum: ['person', 'unit'], nullable: true },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          price_options: {
            type: 'array',
            description: 'Surcharges / optional add-ons.',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                description: { type: 'string', nullable: true },
                buy: { type: 'number', nullable: true },
                sell: { type: 'number', nullable: true },
                margin: { type: 'number', nullable: true },
              },
            },
          },
          image_badge: {
            type: 'object',
            properties: {
              status: { type: 'string', nullable: true },
              start_date: { type: 'string', format: 'date', nullable: true },
              end_date: { type: 'string', format: 'date', nullable: true },
              translations: {
                type: 'object',
                additionalProperties: {
                  type: 'object',
                  properties: {
                    teaser: { type: 'string', nullable: true },
                    detail: { type: 'string', nullable: true },
                  },
                },
              },
            },
          },
          activities: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                label: { type: 'string', nullable: true },
              },
            },
          },
          pictures: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                filename: { type: 'string', nullable: true },
                url: { type: 'string', format: 'uri' },
                thumbnail_url: { type: 'string', format: 'uri' },
                copyright: { type: 'string', nullable: true },
                workspace: { type: 'string', nullable: true, description: 'Folder name in Directus Files.' },
                expiry_date: { type: 'string', format: 'date-time', nullable: true },
                alt_text: { type: 'string', nullable: true },
                sort: { type: 'integer' },
              },
            },
          },
        },
      },
      ProductType: {
        type: 'object',
        properties: {
          type: { type: 'string', example: 'hotel' },
          label: { type: 'string', example: 'Hotels' },
          endpoint: { type: 'string', example: '/api/v1/hotels' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string' },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
          meta: { $ref: '#/components/schemas/ResponseMeta' },
        },
      },
    },
    responses: {
      ValidationError: {
        description: 'Request validation failed',
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
        },
      },
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
        },
      },
      ServerError: {
        description: 'Internal server error',
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
        },
      },
    },
  },
};
