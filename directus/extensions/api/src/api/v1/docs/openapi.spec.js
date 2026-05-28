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
    { name: 'Cruises', description: 'Cruise listings (not yet implemented)' },
  ],
  security: [{ BearerAuth: [] }],
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
          { in: 'query', name: 'fields', schema: { type: 'string' }, description: 'Comma-separated list of fields to return.' },
          { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1, default: 1 } },
          { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
        ],
        responses: {
          200: {
            description: 'Paginated hotel list',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PaginatedHotelListResponse' },
                example: {
                  success: true,
                  message: 'OK',
                  data: [
                    {
                      type: 'hotel',
                      id: 'ed5dce60-a0a1-4775-9084-6112940442a1',
                      name: 'Stay at Alice Springs',
                      object_id: 9,
                      status: 'draft',
                      date_created: '2026-05-20T14:13:16.963Z',
                      date_updated: '2026-05-25T06:28:10.588Z',
                      translations: {
                        'de-CH': {
                          teaser: 'Das Hotel wird gerne wegen der zentralen Lage direkt an der Todd Mall gebucht.',
                          description_short: 'Das Stay at Alice bietet u.a. eine 24-Stunden-Rezeption, einen Swimmingpool, einen Münzwaschsalon, kostenfreie überdachte Parkplätze und WLAN.',
                        },
                        de: {
                          teaser: 'Das Hotel wird gerne wegen der zentralen Lage direkt an der Todd Mall gebucht.',
                          description_short: 'Das Stay at Alice bietet u.a. eine 24-Stunden-Rezeption, einen Swimmingpool, einen Münzwaschsalon, kostenfreie überdachte Parkplätze und WLAN.',
                        },
                        nl: {
                          teaser: 'Populair vanwege de centrale ligging direct aan de Todd Mall.',
                          description_short: 'Stay at Alice biedt een 24-uursreceptie, zwembad, wasserette met munten, gratis overdekte parking en wifi.',
                        },
                      },
                      description: {
                        teaser: 'Das Hotel wird gerne wegen der zentralen Lage direkt an der Todd Mall gebucht.',
                        description_short: 'Das Stay at Alice bietet u.a. eine 24-Stunden-Rezeption, einen Swimmingpool, einen Münzwaschsalon, kostenfreie überdachte Parkplätze und WLAN.',
                      },
                      country: {
                        id: 13,
                        iso: 'AU',
                        id_primarix: 294,
                        translations: {
                          de: { name: 'Australien' },
                          'de-CH': { name: 'Australien' },
                          nl: { name: 'Australië' },
                        },
                      },
                      state: {
                        id: 3,
                        translations: {
                          de: { name: 'Northern Territory' },
                          'de-CH': { name: 'Northern Territory' },
                          nl: { name: 'Northern Territory' },
                        },
                      },
                      region: {
                        id: 16,
                        id_primarix: 3128,
                        translations: {
                          de: { name: 'Rotes Zentrum' },
                          'de-CH': { name: 'Rotes Zentrum' },
                          nl: { name: 'Rode Centrum' },
                        },
                      },
                      place: {
                        id: 18,
                        location_tour32: 44,
                        translations: {
                          de: { name: 'Alice Springs' },
                          'de-CH': { name: 'Alice Springs' },
                          nl: { name: 'Alice Springs' },
                        },
                      },
                      hotel_classification: {
                        id: '641f5633-2451-46df-ab20-cd3b2a7631f2',
                        label: '3.0',
                      },
                      hotel_group: {
                        id: '35599dcc-b5c9-4d0a-8cc7-ce99455091c7',
                        label: 'Independent_unabhangig',
                      },
                    },
                    {
                      type: 'hotel',
                      id: '1da8add8-3814-4724-9315-6a2a208e7f09',
                      name: 'Cape Cadogan Boutique Hotel',
                      object_id: 29,
                      status: 'draft',
                      date_created: '2026-05-20T14:13:44.114Z',
                      date_updated: '2026-05-20T14:13:44.161Z',
                      translations: {},
                      description: null,
                      country: {
                        id: 197,
                        iso: 'ZA',
                        id_primarix: 518,
                        translations: {
                          de: { name: 'Südafrika' },
                          'de-CH': { name: 'Südafrika' },
                          nl: { name: 'Zuid-Afrika' },
                        },
                      },
                      state: null,
                      region: {
                        id: 120,
                        id_primarix: 121856,
                        translations: {
                          de: { name: 'Kaphalbinsel' },
                          'de-CH': { name: 'Kaphalbinsel' },
                          nl: { name: 'Kaapschiereiland' },
                        },
                      },
                      place: {
                        id: 525,
                        location_tour32: 1033,
                        translations: {
                          de: { name: 'Kapstadt' },
                          'de-CH': { name: 'Kapstadt' },
                          nl: { name: 'Kaapstad' },
                        },
                      },
                      hotel_classification: {
                        id: '2a08a0a3-a813-4278-b38f-10fe2059fa63',
                        label: '4.0',
                      },
                      hotel_group: {
                        id: '6dc04c3a-e18d-4b76-b27f-792d81da6358',
                        label: '(AFR) More Hotels',
                      },
                    },
                  ],
                  meta: {
                    requestId: 'd0867c06-edaf-4ffa-a7bf-d85d7fe17381',
                    timestamp: '2026-05-25T06:29:11.491Z',
                    pagination: {
                      total: 4,
                      page: 1,
                      limit: 2,
                      totalPages: 2,
                      hasNext: true,
                      hasPrev: false,
                      updated_at_max: '2026-05-25T06:28:10.588Z',
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          422: { $ref: '#/components/responses/ValidationError' },
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
                example: {
                  success: true,
                  message: 'OK',
                  data: {
                    id: 'ed5dce60-a0a1-4775-9084-6112940442a1',
                    object_id: 9,
                    type: 'hotel',
                    status: 'draft',
                    date_created: '2026-05-20T14:13:16.963Z',
                    date_updated: '2026-05-25T06:28:10.588Z',
                    name: 'Stay at Alice Springs',
                    classification: '3.0',
                    accommodation_type: 'Hotel',
                    supplier: {
                      type: null,
                      id_tour_user: '3030',
                      haupt_id_tour_user: null,
                      booking_partner: 'Across Australia (Goway Travel)',
                    },
                    partner_filter_ids: [],
                    address: {
                      street: 'Leichhardt Terrace',
                      street_number: '11',
                      zip_code: 'NT 0870',
                      town: 'Alice Springs',
                      state: 'Northern Territory',
                      state_code: 'NT',
                      region: 'Rotes Zentrum',
                      country: 'Australien',
                      country_code: 'AU',
                      geo: null,
                    },
                    contact: {
                      phone: '+61 8 8950 6666',
                      phone_emergency: '',
                      email: 'info@alicespringsaurora.com.au',
                      website: 'www.auroraresorts.com.au',
                    },
                    translations: {
                      'de-CH': {
                        introduction: 'Das Hotel wird gerne wegen der zentralen Lage direkt an der Todd Mall gebucht.',
                        description_main: 'Das Stay at Alice bietet u.a. eine 24-Stunden-Rezeption, einen Swimmingpool, einen Münzwaschsalon, kostenfreie überdachte Parkplätze und WLAN.',
                        description_location: 'Alice Springs',
                        description_rooms: '109 Zimmer, u.a. ausgestattet mit einem Doppel- und einem Einzelbett, Dusche/WC, Föhn, Klimaanlage, Kühlschrank, Tee-/Kaffeezubereiter und TV.',
                        included_services: null,
                        not_included: null,
                        mobility_advice: null,
                      },
                      de: {
                        introduction: 'Das Hotel wird gerne wegen der zentralen Lage direkt an der Todd Mall gebucht.',
                        description_main: 'Das Stay at Alice bietet u.a. eine 24-Stunden-Rezeption, einen Swimmingpool, einen Münzwaschsalon, kostenfreie überdachte Parkplätze und WLAN.',
                        description_location: 'Alice Springs',
                        description_rooms: '109 Zimmer, u.a. ausgestattet mit einem Doppel- und einem Einzelbett, Dusche/WC, Föhn, Klimaanlage, Kühlschrank, Tee-/Kaffeezubereiter und TV.',
                        included_services: 'test',
                        not_included: 'test',
                        mobility_advice: null,
                      },
                      nl: {
                        introduction: 'Populair vanwege de centrale ligging direct aan de Todd Mall.',
                        description_main: 'Stay at Alice biedt een 24-uursreceptie, zwembad, wasserette met munten, gratis overdekte parking en wifi.',
                        description_location: 'Alice Springs',
                        description_rooms: '109 kamers met een tweepersoonsbed en een eenpersoonsbed, douche/wc, haardroger, airco, koelkast, koffie-/theefaciliteiten en tv.',
                        included_services: null,
                        not_included: null,
                        mobility_advice: null,
                      },
                    },
                    rooms: [
                      {
                        category: null,
                        prices: [
                          {
                            start_date: '2026-03-31',
                            end_date: '2026-04-01',
                            occupancies: {
                              '368': { buy: '183.00', sell: null, margin: 23, unit: 'person' },
                              '369': { buy: '183.00', sell: null, margin: 23, unit: 'person' },
                              '370': { buy: '216.00', sell: null, margin: 23, unit: 'person' },
                            },
                          },
                          {
                            start_date: '2026-10-31',
                            end_date: '2027-02-27',
                            occupancies: {
                              '368': { buy: '149.00', sell: null, margin: 23, unit: 'person' },
                              '369': { buy: '149.00', sell: null, margin: 23, unit: 'person' },
                              '370': { buy: '183.00', sell: null, margin: 23, unit: 'person' },
                            },
                          },
                        ],
                      },
                      {
                        category: null,
                        prices: [
                          {
                            start_date: '2026-03-31',
                            end_date: '2026-04-01',
                            occupancies: {
                              '368': { buy: '191.00', sell: null, margin: 23, unit: 'person' },
                              '369': { buy: '191.00', sell: null, margin: 23, unit: 'person' },
                              '370': { buy: '0.00', sell: '0.00', margin: 23, unit: 'person' },
                            },
                          },
                          {
                            start_date: '2026-10-31',
                            end_date: '2027-02-27',
                            occupancies: {
                              '368': { buy: '158.00', sell: null, margin: 23, unit: 'person' },
                              '369': { buy: '158.00', sell: null, margin: 23, unit: 'person' },
                              '370': { buy: '0.00', sell: '0.00', margin: 23, unit: 'person' },
                            },
                          },
                        ],
                      },
                    ],
                    price_options: [
                      {
                        id: '37a37bfa-320c-4376-a384-d5872f8952b9',
                        description: 'Frühstück pro Person/Nacht',
                        buy: '323.00',
                        sell: 249,
                        margin: 23,
                      },
                    ],
                    image_badge: {
                      status: 'published_period',
                      start_date: '2026-05-15',
                      end_date: '2026-05-28',
                      translations: {
                        de: { teaser: 'test', detail: 'test' },
                      },
                    },
                    activities: [
                      { id: '4a1975d6-dec8-4f33-8218-1f4e28e07aec', label: 'test' },
                    ],
                    pictures: [
                      {
                        id: 'f9db3573-79d4-440a-b58d-e0b62ea7cce4',
                        filename: 'claudio-schwarz-Axx5fWxrcFA-unsplash.jpg',
                        url: '/assets/f9db3573-79d4-440a-b58d-e0b62ea7cce4',
                        thumbnail_url: '/assets/f9db3573-79d4-440a-b58d-e0b62ea7cce4?width=400&height=300&fit=cover',
                        copyright: '©',
                        workspace: null,
                        expiry_date: null,
                        alt_text: null,
                        sort: 1,
                      },
                      {
                        id: '1fe70c81-cfb4-4e3c-8736-abb65f719db8',
                        filename: 'Screenshot 2026-05-21 at 1.55.30 PM.png',
                        url: '/assets/1fe70c81-cfb4-4e3c-8736-abb65f719db8',
                        thumbnail_url: '/assets/1fe70c81-cfb4-4e3c-8736-abb65f719db8?width=400&height=300&fit=cover',
                        copyright: '©',
                        workspace: null,
                        expiry_date: null,
                        alt_text: null,
                        sort: 2,
                      },
                    ],
                  },
                  meta: {
                    requestId: '8db0270b-1622-4a13-aba2-2ae841ec24e0',
                    timestamp: '2026-05-25T06:28:41.958Z',
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
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
        parameters: [
          { in: 'query', name: 'lang', schema: { type: 'string', enum: ['de', 'en', 'nl'] }, description: 'If set, only that language is returned in the translations block.' },
          { in: 'query', name: 'country', schema: { type: 'integer', minimum: 1 }, description: 'Filter by country ID.' },
          { in: 'query', name: 'search', schema: { type: 'string', maxLength: 200 }, description: 'Full-text search.' },
          { in: 'query', name: 'sort', schema: { type: 'string', enum: ['name', '-name', 'date_updated', '-date_updated'] }, description: 'Default: -date_updated' },
          { in: 'query', name: 'updated_after', schema: { type: 'string', format: 'date-time' }, description: 'Delta sync filter.' },
          { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1, default: 1 } },
          { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
        ],
        responses: {
          200: {
            description: 'Paginated product list',
            content: {
              'application/json': {
                schema: {
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
                example: {
                  success: true,
                  message: 'OK',
                  data: [
                    {
                      type: 'hotel',
                      id: 'ed5dce60-a0a1-4775-9084-6112940442a1',
                      name: 'Stay at Alice Springs',
                      object_id: 9,
                      status: 'draft',
                      date_created: '2026-05-20T14:13:16.963Z',
                      date_updated: '2026-05-25T06:28:10.588Z',
                      translations: {
                        de: {
                          teaser: 'Das Hotel wird gerne wegen der zentralen Lage direkt an der Todd Mall gebucht.',
                          description_short: 'Das Stay at Alice bietet u.a. eine 24-Stunden-Rezeption, einen Swimmingpool, einen Münzwaschsalon, kostenfreie überdachte Parkplätze und WLAN.',
                        },
                      },
                      description: {
                        teaser: 'Das Hotel wird gerne wegen der zentralen Lage direkt an der Todd Mall gebucht.',
                        description_short: 'Das Stay at Alice bietet u.a. eine 24-Stunden-Rezeption, einen Swimmingpool, einen Münzwaschsalon, kostenfreie überdachte Parkplätze und WLAN.',
                      },
                      country: { id: 13, iso: 'AU', id_primarix: 294, translations: { de: { name: 'Australien' } } },
                      state: { id: 3, translations: { de: { name: 'Northern Territory' } } },
                      region: { id: 16, id_primarix: 3128, translations: { de: { name: 'Rotes Zentrum' } } },
                      place: { id: 18, location_tour32: 44, translations: { de: { name: 'Alice Springs' } } },
                      hotel_classification: { id: '641f5633-2451-46df-ab20-cd3b2a7631f2', label: '3.0' },
                      hotel_group: { id: '35599dcc-b5c9-4d0a-8cc7-ce99455091c7', label: 'Independent_unabhangig' },
                    },
                  ],
                  meta: {
                    requestId: '9792ff85-bd80-4524-804b-c6ddbf2580be',
                    timestamp: '2026-05-25T06:24:25.491Z',
                    pagination: {
                      total: 4,
                      page: 1,
                      limit: 20,
                      totalPages: 1,
                      hasNext: false,
                      hasPrev: false,
                      updated_at_max: '2026-05-25T06:28:10.588Z',
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          422: { $ref: '#/components/responses/ValidationError' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },
    '/api/v1/cruises': {
      get: {
        tags: ['Cruises'],
        summary: 'List cruises',
        description: 'Not yet implemented. Returns 501.',
        responses: {
          501: {
            description: 'Not implemented',
            content: {
              'application/json': {
                example: {
                  success: false,
                  message: 'Cruise schema not yet finalised',
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        description: 'Static API token. Pass as `Authorization: Bearer <token>`.',
      },
    },
    schemas: {
      ResponseMeta: {
        type: 'object',
        properties: {
          requestId: { type: 'string', nullable: true, example: 'd0867c06-edaf-4ffa-a7bf-d85d7fe17381' },
          timestamp: { type: 'string', format: 'date-time', example: '2026-05-25T06:29:11.491Z' },
        },
      },
      PaginationMeta: {
        type: 'object',
        properties: {
          total: { type: 'integer', description: 'Total number of matching records', example: 4 },
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 20 },
          totalPages: { type: 'integer', example: 2 },
          hasNext: { type: 'boolean', example: true },
          hasPrev: { type: 'boolean', example: false },
          updated_at_max: { type: 'string', format: 'date-time', nullable: true, description: 'Latest date_updated among returned records — use as cursor for delta sync.', example: '2026-05-25T06:28:10.588Z' },
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
          id: { type: 'integer', example: 13 },
          iso: { type: 'string', nullable: true, example: 'AU' },
          id_primarix: { type: 'integer', nullable: true, example: 294 },
          location_tour32: { type: 'integer', nullable: true, example: 44 },
          translations: {
            type: 'object',
            additionalProperties: {
              type: 'object',
              properties: { name: { type: 'string', nullable: true } },
            },
            example: {
              de: { name: 'Australien' },
              'de-CH': { name: 'Australien' },
              nl: { name: 'Australië' },
            },
          },
        },
      },
      HotelListItem: {
        type: 'object',
        properties: {
          type: { type: 'string', example: 'hotel' },
          id: { type: 'string', format: 'uuid', example: 'ed5dce60-a0a1-4775-9084-6112940442a1' },
          name: { type: 'string', example: 'Stay at Alice Springs' },
          object_id: { type: 'integer', nullable: true, example: 9 },
          status: { type: 'string', enum: ['published', 'draft'], nullable: true, example: 'draft' },
          date_created: { type: 'string', format: 'date-time', example: '2026-05-20T14:13:16.963Z' },
          date_updated: { type: 'string', format: 'date-time', example: '2026-05-25T06:28:10.588Z' },
          translations: {
            type: 'object',
            description: 'Keyed by locale code (e.g. "de", "de-CH", "nl"). Contains only the requested lang if the lang param is set.',
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
            description: 'Single-language shortcut — mirrors translations[lang]. Only present when lang param is set.',
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
              id: { type: 'string', format: 'uuid', example: '641f5633-2451-46df-ab20-cd3b2a7631f2' },
              label: { type: 'string', example: '3.0' },
            },
          },
          hotel_group: {
            type: 'object',
            nullable: true,
            properties: {
              id: { type: 'string', format: 'uuid', example: '35599dcc-b5c9-4d0a-8cc7-ce99455091c7' },
              label: { type: 'string', example: 'Independent_unabhangig' },
            },
          },
        },
      },
      HotelDetail: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: 'ed5dce60-a0a1-4775-9084-6112940442a1' },
          object_id: { type: 'integer', nullable: true, example: 9 },
          type: { type: 'string', example: 'hotel' },
          status: { type: 'string', enum: ['published', 'draft'], nullable: true, example: 'draft' },
          date_created: { type: 'string', format: 'date-time', example: '2026-05-20T14:13:16.963Z' },
          date_updated: { type: 'string', format: 'date-time', example: '2026-05-25T06:28:10.588Z' },
          name: { type: 'string', example: 'Stay at Alice Springs' },
          classification: { type: 'string', nullable: true, example: '3.0', description: 'Label from hotel_classifications.' },
          accommodation_type: { type: 'string', nullable: true, example: 'Hotel', description: 'Label of the first accommodation type.' },
          supplier: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['Independent', 'Partner'], nullable: true, example: null },
              id_tour_user: { type: 'string', nullable: true, example: '3030' },
              haupt_id_tour_user: { type: 'string', nullable: true, example: null },
              booking_partner: { type: 'string', nullable: true, example: 'Across Australia (Goway Travel)' },
            },
          },
          partner_filter_ids: {
            type: 'array',
            items: { type: 'integer' },
            description: 'Primarix IDs of assigned partners.',
            example: [],
          },
          address: {
            type: 'object',
            properties: {
              street: { type: 'string', nullable: true, example: 'Leichhardt Terrace' },
              street_number: { type: 'string', nullable: true, example: '11' },
              zip_code: { type: 'string', nullable: true, example: 'NT 0870' },
              town: { type: 'string', nullable: true, example: 'Alice Springs' },
              state: { type: 'string', nullable: true, example: 'Northern Territory' },
              state_code: { type: 'string', nullable: true, example: 'NT' },
              region: { type: 'string', nullable: true, example: 'Rotes Zentrum' },
              country: { type: 'string', nullable: true, example: 'Australien' },
              country_code: { type: 'string', nullable: true, example: 'AU' },
              geo: { type: 'object', nullable: true, example: null },
            },
          },
          contact: {
            type: 'object',
            properties: {
              phone: { type: 'string', nullable: true, example: '+61 8 8950 6666' },
              phone_emergency: { type: 'string', nullable: true, example: '' },
              email: { type: 'string', nullable: true, example: 'info@alicespringsaurora.com.au' },
              website: { type: 'string', nullable: true, example: 'www.auroraresorts.com.au' },
            },
          },
          translations: {
            type: 'object',
            description: 'Keyed by locale code (e.g. "de", "de-CH", "nl"). Contains only the requested lang if the lang param is set.',
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
                category: { type: 'string', nullable: true, description: 'Room category name.', example: null },
                prices: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      start_date: { type: 'string', format: 'date', example: '2026-03-31' },
                      end_date: { type: 'string', format: 'date', example: '2026-04-01' },
                      occupancies: {
                        type: 'object',
                        description: 'Keyed by occupancy ID. The key is a numeric string (occupancy value ID).',
                        additionalProperties: {
                          type: 'object',
                          properties: {
                            buy: { type: 'string', nullable: true, example: '183.00' },
                            sell: { type: 'string', nullable: true, example: null },
                            margin: { type: 'number', nullable: true, example: 23 },
                            unit: { type: 'string', enum: ['person', 'unit'], nullable: true, example: 'person' },
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
                id: { type: 'string', format: 'uuid', example: '37a37bfa-320c-4376-a384-d5872f8952b9' },
                description: { type: 'string', nullable: true, example: 'Frühstück pro Person/Nacht' },
                buy: { type: 'string', nullable: true, example: '323.00' },
                sell: { type: 'number', nullable: true, example: 249 },
                margin: { type: 'number', nullable: true, example: 23 },
              },
            },
          },
          image_badge: {
            type: 'object',
            properties: {
              status: { type: 'string', nullable: true, example: 'published_period' },
              start_date: { type: 'string', format: 'date', nullable: true, example: '2026-05-15' },
              end_date: { type: 'string', format: 'date', nullable: true, example: '2026-05-28' },
              translations: {
                type: 'object',
                additionalProperties: {
                  type: 'object',
                  properties: {
                    teaser: { type: 'string', nullable: true },
                    detail: { type: 'string', nullable: true },
                  },
                },
                example: { de: { teaser: 'Sonderangebot', detail: 'Nur bis Ende Mai!' } },
              },
            },
          },
          activities: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid', example: '4a1975d6-dec8-4f33-8218-1f4e28e07aec' },
                label: { type: 'string', nullable: true, example: 'Swimming' },
              },
            },
          },
          pictures: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid', example: 'f9db3573-79d4-440a-b58d-e0b62ea7cce4' },
                filename: { type: 'string', nullable: true, example: 'hotel-exterior.jpg' },
                url: { type: 'string', example: '/assets/f9db3573-79d4-440a-b58d-e0b62ea7cce4' },
                thumbnail_url: { type: 'string', example: '/assets/f9db3573-79d4-440a-b58d-e0b62ea7cce4?width=400&height=300&fit=cover' },
                copyright: { type: 'string', nullable: true, example: '©' },
                workspace: { type: 'string', nullable: true, description: 'Folder name in Directus Files.', example: null },
                expiry_date: { type: 'string', format: 'date-time', nullable: true, example: null },
                alt_text: { type: 'string', nullable: true, example: null },
                sort: { type: 'integer', example: 1 },
              },
            },
          },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Validation failed' },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string', example: 'limit' },
                message: { type: 'string', example: 'limit must be between 1 and 100' },
              },
            },
          },
          meta: { $ref: '#/components/schemas/ResponseMeta' },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: 'Missing or invalid Authorization Bearer token',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              success: false,
              message: 'Missing or malformed Authorization header. Expected: Bearer <token>',
              meta: {
                requestId: '5bc339bd-d3c5-4a86-9a4c-c4cfd9bc79f0',
                timestamp: '2026-05-25T06:24:39.933Z',
              },
            },
          },
        },
      },
      ValidationError: {
        description: 'Request validation failed',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              success: false,
              message: 'Validation failed',
              errors: [
                { field: 'limit', message: 'limit must be between 1 and 100' },
              ],
              meta: {
                requestId: '330d2ca7-a418-42e2-a1f0-c03ded46e922',
                timestamp: '2026-05-25T06:24:40.027Z',
              },
            },
          },
        },
      },
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              success: false,
              message: 'Hotel not found: non-existent-id-00000',
              meta: {
                requestId: '76082571-e6de-4847-b252-e13cb31d07ea',
                timestamp: '2026-05-25T06:24:40.000Z',
              },
            },
          },
        },
      },
      ServerError: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              success: false,
              message: 'Internal server error',
              meta: {
                requestId: 'e4690af3-6004-4e38-8c4d-737d9cf4fa22',
                timestamp: '2026-05-25T06:24:27.954Z',
              },
            },
          },
        },
      },
    },
  },
};
