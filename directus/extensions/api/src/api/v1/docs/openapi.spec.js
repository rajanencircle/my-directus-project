// Real example data captured from GET /api/v1/hotels?limit=2 and GET /api/v1/hotels/{id}?lang=de
const REAL_HOTEL = {
  type: "hotel",
  id: "6f8a8c0a-d8af-415b-904d-02a6d6f225ca",
  name: "Stay at Alice Springs",
  season: "2026",
  object_id: 9,
  object_info: "26_NT, Alice Springs, Stay at Alice Springs",
  internal_remarks: "sa64d65as465d4sa64as65d46",
  status_primarix: "published",
  date_created: "2026-05-09T11:48:36.379Z",
  date_updated: "2026-05-29T10:16:30.057Z",
  user_created: {
    id: "c5040fc3-0ef7-4450-afb7-a85b1543d7a6",
    first_name: "Migration",
    last_name: "User",
  },
  user_updated: {
    id: "9cb74080-c36b-402b-8ecc-bcd2f3d68b3a",
    first_name: "creator",
    last_name: "dev",
  },
  partner_type: "selected",
  hotel_group: {
    id: "780b958e-27c1-4a46-ae8f-174fee04643f",
    label: "Independent_unabhangig",
  },
  address: {
    street: "Leichhardt Terrace",
    street_number: "11",
    zip_code: "NT 0870",
    town: "Alice Springs",
    state: "Northern Territory",
    region: "Rotes Zentrum",
    country: "Australien",
    location_tour32: "Alice Springs",
  },
  contact: {
    phone_general: "+61 8 8950 6666",
    phone_ah: "",
    email_general: "info@alicespringsaurora.com.au",
    website: "www.auroraresorts.com.au",
  },
  partner_filter_ids: [4739, 4740, 4742, 82185, 4743],
  supplier: {
    type: "Independent",
    id_tour_user: "3030",
    haupt_id_tour_user: "Main Service Provider (Tour32 only)",
    booking_partner: "Across Australia (Goway Travel)",
    booking_email: "bookings@example.com",
    booking_info: "Contact via email preferred",
  },
  from_price: "677.00",
  accommodation_type: "Hotel",
  classification: "3.0",
  activities: [
    { id: "eb07e2b8-f666-4b22-b089-a66d64826f46", label: "Flitterwochen" },
    { id: "d4588b4d-8e2c-4e79-84e7-3bc3820ebada", label: "Reiten" },
    { id: "ccf63bf1-0de7-42f1-a6a9-f832a8f386b1", label: "Baden" },
    { id: "e1da83c1-b83d-41f8-932a-9b962197bc47", label: "Golf" },
    { id: "04520670-cdf6-4448-9c52-f1a825bc7a46", label: "Wellness" },
  ],
  price_info_translations: {
    "de-CH": {
      services_included: "Übernachtung",
      services_not_included: "",
      service_highlights: "",
      minimum_stay: null,
      minimum_stay_additions: "",
      deviating_cancelation_terms: "",
      children_policy: "keine Ermäßigung.",
      children_free_age: null,
      children_free_number: null,
      important_information: "",
      mobility_advice_text:
        "Wir sind verpflichtet darauf hinzuweisen, dass diese Unterkunft im Allgemeinen für Personen mit eingeschränkter Mobilität nicht geeignet ist.",
      price_infos_supplementary: null,
    },
    de: {
      services_included: "Übernachtung",
      services_not_included: "",
      service_highlights: "",
      minimum_stay: null,
      minimum_stay_additions: "",
      deviating_cancelation_terms: "",
      children_policy: "keine Ermäßigung.",
      children_free_age: null,
      children_free_number: null,
      important_information: "",
      mobility_advice_text:
        "Wir sind verpflichtet darauf hinzuweisen, dass diese Unterkunft im Allgemeinen für Personen mit eingeschränkter Mobilität nicht geeignet ist.",
      price_infos_supplementary: null,
    },
    nl: {
      services_included: "Overnachting",
      services_not_included: "",
      service_highlights: "",
      minimum_stay: null,
      minimum_stay_additions: "",
      deviating_cancelation_terms: "",
      children_policy: "geen korting.",
      children_free_age: null,
      children_free_number: null,
      important_information: "",
      mobility_advice_text: null,
      price_infos_supplementary: null,
    },
  },
  rooms: [
    {
      category: "TEST",
      booking_code: null,
      tour32_name: null,
      catering: null,
      days_repeater: [],
      prices: [],
    },
  ],
  specials: [
    {
      name: "123123",
      special_description: "qwesaddasd",
      status: "published",
      publish_start: "2026-05-20",
      publish_end: "2026-06-25",
    },
    {
      name: "555",
      special_description: "22222",
      status: "published",
      publish_start: "2026-05-15",
      publish_end: "2026-05-30",
    },
  ],
  image_badge: {
    status: "published_period",
    start_date: "2026-05-12",
    end_date: "2026-05-28",
    translations: {
      de: {
        image_badge_teaser: "Text Overview Pages",
        image_badge_details: "Text Detail Page",
      },
    },
  },
  pictures: [
    {
      id: "0df9e839-5747-4af4-a9cc-72cda5b8bd8d",
      filename: "claudio-schwarz-Axx5fWxrcFA-unsplash_optimized_2000",
      url: "/assets/0df9e839-5747-4af4-a9cc-72cda5b8bd8d",
      thumbnail_url:
        "/assets/0df9e839-5747-4af4-a9cc-72cda5b8bd8d?width=400&height=300&fit=cover",
      copyright: "©none",
      alt_text: null,
      caption_i18n: null,
      is_map: false,
      tour32_export: false,
      dimensions_px: null,
      keyword_ids: null,
      folder: {
        id: "118314af-9e4f-4109-9777-582bce3c6cc5",
        name: "Icons",
      },
      expiry_date: null,
      sort: 1,
    },
    {
      id: "39855816-999d-4154-be81-11503499c443",
      filename: "claudio-schwarz-Axx5fWxrcFA-unsplash_optimized_2000",
      url: "/assets/39855816-999d-4154-be81-11503499c443",
      thumbnail_url:
        "/assets/39855816-999d-4154-be81-11503499c443?width=400&height=300&fit=cover",
      copyright: "©none",
      alt_text: "Narrow European street with church tower",
      caption_i18n: null,
      is_map: false,
      tour32_export: false,
      dimensions_px: null,
      keyword_ids: null,
      folder: null,
      expiry_date: "2026-05-21",
      sort: 2,
    },
  ],
};

// Multi-lang version (no lang param) — translations keyed by de-CH, de, nl
const REAL_HOTEL_MULTILANG = {
  ...REAL_HOTEL,
  translations: {
    "de-CH": {
      subline_location: "Alice Springs",
      teaser:
        "Das Hotel wird gerne wegen der zentralen Lage direkt an der Todd Mall gebucht.",
      description_short:
        "Das Stay at Alice bietet u.a. eine 24-Stunden-Rezeption, einen Swimmingpool und WLAN.",
      description_surrounding:
        "Sehr zentral im Stadtzentrum, mit Zugang zur Fußgängerzone.",
      description_rooms:
        "109 Zimmer mit Klimaanlage, Kühlschrank und TV. Deluxe-Zimmer sind geräumiger (ca. 26 m²).",
      total_number_of_rooms: 109,
      remarks_arrival: null,
      description_supplementary: null,
    },
    de: {
      subline_location: "Alice Springs",
      teaser:
        "Das Hotel wird gerne wegen der zentralen Lage direkt an der Todd Mall gebucht.",
      description_short:
        "Das Stay at Alice bietet u.a. eine 24-Stunden-Rezeption, einen Swimmingpool, einen Münzwaschsalon, kostenfreie überdachte Parkplätze und WLAN.",
      description_surrounding:
        "Sehr zentral im Stadtzentrum, mit Zugang zur Fußgängerzone.",
      description_rooms:
        "109 Zimmer, u.a. ausgestattet mit einem Doppel- und einem Einzelbett, Dusche/WC, Fön, Klimaanlage, Kühlschrank, Tee-/Kaffeezubereiter und TV.",
      total_number_of_rooms: 109,
      remarks_arrival: "test",
      description_supplementary: [
        { headline: "123123", text: "12312" },
        { headline: "1", text: "2" },
      ],
    },
    nl: {
      subline_location: "Alice Springs",
      teaser: "Populair vanwege de centrale ligging direct aan de Todd Mall.",
      description_short:
        "Stay at Alice biedt een 24-uursreceptie, zwembad, wasserette met munten, gratis overdekte parking en wifi.",
      description_surrounding:
        "Zeer centraal in het stadscentrum, direct aan de voetgangerszone.",
      description_rooms:
        "109 kamers met een tweepersoonsbed en een eenpersoonsbed, douche/wc, haardroger, airco, koelkast, koffie-/theefaciliteiten en tv.",
      total_number_of_rooms: 109,
      remarks_arrival: "",
      description_supplementary: null,
    },
  },
  price_options: [
    {
      id: "3ea533f0-26c3-4ea1-81da-53b382e94358",
      description: null,
      booking_name: null,
      buy: null,
      sell: null,
      margin: 230,
      type: null,
      catering: null,
      calc_type: null,
      translations: {},
    },
  ],
};

// Lang=de filtered version (for GET /api/v1/hotels/{id}?lang=de)
const REAL_HOTEL_LANG_DE = {
  ...REAL_HOTEL,
  translations: {
    de: {
      subline_location: "Alice Springs",
      teaser:
        "Das Hotel wird gerne wegen der zentralen Lage direkt an der Todd Mall gebucht.",
      description_short:
        "Das Stay at Alice bietet u.a. eine 24-Stunden-Rezeption, einen Swimmingpool, einen Münzwaschsalon, kostenfreie überdachte Parkplätze und WLAN.",
      description_surrounding:
        "Sehr zentral im Stadtzentrum, mit Zugang zur Fußgängerzone.",
      description_rooms:
        "109 Zimmer, u.a. ausgestattet mit einem Doppel- und einem Einzelbett, Dusche/WC, Fön, Klimaanlage, Kühlschrank, Tee-/Kaffeezubereiter und TV.",
      total_number_of_rooms: 109,
      remarks_arrival: "test",
      description_supplementary: [
        { headline: "123123", text: "12312" },
        { headline: "1", text: "2" },
      ],
    },
  },
  price_info_translations: {
    de: {
      services_included: "Übernachtung",
      services_not_included: "",
      service_highlights: "",
      minimum_stay: null,
      minimum_stay_additions: "",
      deviating_cancelation_terms: "",
      children_policy: "keine Ermäßigung.",
      children_free_age: null,
      children_free_number: null,
      important_information: "",
      mobility_advice_text:
        "Wir sind verpflichtet darauf hinzuweisen, dass diese Unterkunft im Allgemeinen für Personen mit eingeschränkter Mobilität nicht geeignet ist. Falls Sie sich unsicher sind, sprechen Sie uns bitte vor einer Buchung an.",
      price_infos_supplementary: null,
    },
  },
  price_options: [
    {
      id: "3ea533f0-26c3-4ea1-81da-53b382e94358",
      description: "Frühstück pro Person/Nacht",
      booking_name: "Full Breakfast",
      buy: 500,
      sell: null,
      margin: 230,
      type: "optional",
      catering: {
        id: "6c8ba1d2-e38e-4698-bca9-a7a289999b97",
        designation: "Frühstück",
      },
      calc_type: "pro Person und Nacht",
      translations: {
        de: {
          description: "Frühstück pro Person/Nacht",
          booking_name: "Full Breakfast",
          sell_price: null,
          type: "optional",
          catering: {
            id: "6c8ba1d2-e38e-4698-bca9-a7a289999b97",
            designation: "Frühstück",
          },
          calc_type: "pro Person und Nacht",
        },
      },
    },
  ],
  image_badge: {
    status: "published_period",
    start_date: "2026-05-12",
    end_date: "2026-05-28",
    translations: {
      de: {
        image_badge_teaser: "Text Overview Pages",
        image_badge_details: "Text Detail Page",
      },
    },
  },
};

export const openapiSpec = {
  openapi: "3.0.3",
  info: {
    title: "BOTG API",
    version: "1.2.0",
    description: "Custom REST API layer for BOTG — hotels, products, and more.",
  },
  tags: [
    { name: "Hotels", description: "Hotel listings and detail" },
    { name: "Products", description: "Product type catalogue" },
    { name: "Cruises", description: "Cruise listings (not yet implemented)" },
  ],
  security: [{ BearerAuth: [] }],
  paths: {
    "/api/v1/hotels": {
      get: {
        tags: ["Hotels"],
        summary: "List hotels (lightweight)",
        description:
          "Returns a minimal paginated list of hotels containing only `id`, `object_id`, `name`, and `date_updated`. Use `GET /api/v1/hotels/{id}` for full detail.",
        parameters: [
          {
            in: "query",
            name: "country",
            schema: { type: "integer", minimum: 1 },
            description: "Filter by country ID.",
          },
          {
            in: "query",
            name: "search",
            schema: { type: "string", maxLength: 200 },
            description: "Full-text search on hotel name.",
          },
          {
            in: "query",
            name: "sort",
            schema: {
              type: "string",
              enum: ["name", "-name", "date_updated", "-date_updated"],
            },
            description: "Default: -date_updated",
          },
          {
            in: "query",
            name: "updated_after",
            schema: { type: "string", format: "date-time" },
            description:
              "Delta sync — return only records updated after this timestamp.",
          },
          {
            in: "query",
            name: "page",
            schema: { type: "integer", minimum: 1, default: 1 },
          },
          {
            in: "query",
            name: "limit",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
          },
        ],
        responses: {
          200: {
            description: "Paginated lightweight hotel list",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PaginatedHotelListResponse" },
                example: {
                  success: true,
                  message: "OK",
                  data: [
                    {
                      id: "6f8a8c0a-d8af-415b-904d-02a6d6f225ca",
                      object_id: 9,
                      name: "Stay at Alice Springs",
                      date_updated: "2026-05-29T10:16:30.057Z",
                    },
                  ],
                  meta: {
                    requestId: "5f3cc439-2af7-43f2-867c-4e583251b475",
                    timestamp: "2026-05-29T13:24:13.346Z",
                    pagination: {
                      total: 1,
                      page: 1,
                      limit: 20,
                      totalPages: 1,
                      hasNext: false,
                      hasPrev: false,
                      updated_at_max: "2026-05-29T10:16:30.057Z",
                    },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          422: { $ref: "#/components/responses/ValidationError" },
          500: { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/api/v1/hotels/{id}": {
      get: {
        tags: ["Hotels"],
        summary: "Get hotel detail",
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "string" },
            description: "Hotel UUID, numeric object_id, or px_source_id.",
          },
          {
            in: "query",
            name: "lang",
            schema: { type: "string", enum: ["de", "en", "nl", "de-CH"] },
            description:
              "ISO 639-1 language code. If set, every translations block (translations, price_info_translations, rooms[].prices[].occupancies[].translations, price_options[].translations, image_badge.translations, pictures[].caption_i18n) returns only that language key. Omit to get all available languages.",
          },
        ],
        responses: {
          200: {
            description: "Full hotel detail",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "OK" },
                    data: { $ref: "#/components/schemas/HotelDetail" },
                    meta: { $ref: "#/components/schemas/ResponseMeta" },
                  },
                },
                example: {
                  success: true,
                  message: "OK",
                  data: REAL_HOTEL_LANG_DE,
                  meta: {
                    requestId: "90e32bdd-e1ee-4500-b691-736803c40b4f",
                    timestamp: "2026-05-29T13:24:11.071Z",
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          404: { $ref: "#/components/responses/NotFound" },
          500: { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/api/v1/products": {
      get: {
        tags: ["Products"],
        summary: "Product catalog",
        description:
          "Returns a live catalog of all product types with real item counts and their list/detail route URLs. No query parameters required.",
        responses: {
          200: {
            description: "Product catalog",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "OK" },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/ProductCatalogItem" },
                    },
                    meta: { $ref: "#/components/schemas/ResponseMeta" },
                  },
                },
                example: {
                  success: true,
                  message: "OK",
                  data: [
                    {
                      type: "hotel",
                      total: 42,
                      list_url: "/api/v1/hotels",
                      detail_url: "/api/v1/hotels/{id}",
                    },
                    {
                      type: "cruise",
                      total: 0,
                      list_url: "/api/v1/cruises",
                      detail_url: "/api/v1/cruises/{id}",
                    },
                  ],
                  meta: {
                    requestId: "9c23ed47-8b3c-44f3-97f6-44b2f726b959",
                    timestamp: "2026-05-29T13:23:48.346Z",
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          500: { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/api/v1/products/details": {
      get: {
        tags: ["Products"],
        summary: "List products (full detail)",
        description:
          "Returns full product detail for all product types in a single paginated list. Currently includes hotels only.",
        parameters: [
          {
            in: "query",
            name: "lang",
            schema: { type: "string", enum: ["de", "en", "nl", "de-CH"] },
            description:
              "If set, only that language is returned in all translations blocks.",
          },
          {
            in: "query",
            name: "country",
            schema: { type: "integer", minimum: 1 },
            description: "Filter by country ID.",
          },
          {
            in: "query",
            name: "search",
            schema: { type: "string", maxLength: 200 },
            description: "Full-text search.",
          },
          {
            in: "query",
            name: "sort",
            schema: {
              type: "string",
              enum: ["name", "-name", "date_updated", "-date_updated"],
            },
            description: "Default: -date_updated",
          },
          {
            in: "query",
            name: "updated_after",
            schema: { type: "string", format: "date-time" },
            description: "Delta sync — return only records updated after this timestamp.",
          },
          {
            in: "query",
            name: "page",
            schema: { type: "integer", minimum: 1, default: 1 },
          },
          {
            in: "query",
            name: "limit",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
          },
        ],
        responses: {
          200: {
            description: "Paginated full-detail product list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "OK" },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/HotelDetail" },
                    },
                    meta: {
                      allOf: [
                        { $ref: "#/components/schemas/ResponseMeta" },
                        {
                          type: "object",
                          properties: {
                            pagination: { $ref: "#/components/schemas/PaginationMeta" },
                          },
                        },
                      ],
                    },
                  },
                },
                example: {
                  success: true,
                  message: "OK",
                  data: [REAL_HOTEL_MULTILANG],
                  meta: {
                    requestId: "9c23ed47-8b3c-44f3-97f6-44b2f726b959",
                    timestamp: "2026-05-29T13:23:48.346Z",
                    pagination: {
                      total: 1,
                      page: 1,
                      limit: 20,
                      totalPages: 1,
                      hasNext: false,
                      hasPrev: false,
                      updated_at_max: "2026-05-29T10:16:30.057Z",
                    },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          422: { $ref: "#/components/responses/ValidationError" },
          500: { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/api/v1/products/limited-list": {
      get: {
        tags: ["Products"],
        summary: "List products (lightweight)",
        description:
          "Returns a lightweight list of all products across all types with only the essential fields for indexing, search, selection, and synchronisation.",
        parameters: [
          {
            in: "query",
            name: "country",
            schema: { type: "integer", minimum: 1 },
            description: "Filter by country ID.",
          },
          {
            in: "query",
            name: "search",
            schema: { type: "string", maxLength: 200 },
            description: "Full-text search.",
          },
          {
            in: "query",
            name: "sort",
            schema: {
              type: "string",
              enum: ["name", "-name", "date_updated", "-date_updated"],
            },
            description: "Default: -date_updated",
          },
          {
            in: "query",
            name: "updated_after",
            schema: { type: "string", format: "date-time" },
            description: "Delta sync — return only records updated after this timestamp.",
          },
          {
            in: "query",
            name: "page",
            schema: { type: "integer", minimum: 1, default: 1 },
          },
          {
            in: "query",
            name: "limit",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
          },
        ],
        responses: {
          200: {
            description: "Paginated lightweight product list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "OK" },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/ProductLimitedItem" },
                    },
                    meta: {
                      allOf: [
                        { $ref: "#/components/schemas/ResponseMeta" },
                        {
                          type: "object",
                          properties: {
                            pagination: { $ref: "#/components/schemas/PaginationMeta" },
                          },
                        },
                      ],
                    },
                  },
                },
                example: {
                  success: true,
                  message: "OK",
                  data: [
                    {
                      type: "hotel",
                      id: "6f8a8c0a-d8af-415b-904d-02a6d6f225ca",
                      object_id: 9,
                      name: "Stay at Alice Springs",
                      status: "published",
                      date_created: "2026-05-09T11:48:36.379Z",
                      date_updated: "2026-05-29T10:16:30.057Z",
                    },
                  ],
                  meta: {
                    requestId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                    timestamp: "2026-05-29T13:23:48.346Z",
                    pagination: {
                      total: 42,
                      page: 1,
                      limit: 20,
                      totalPages: 3,
                      hasNext: true,
                      hasPrev: false,
                      updated_at_max: "2026-05-29T10:16:30.057Z",
                    },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          422: { $ref: "#/components/responses/ValidationError" },
          500: { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/api/v1/cruises": {
      get: {
        tags: ["Cruises"],
        summary: "List cruises",
        description: "Not yet implemented. Returns 501.",
        responses: {
          501: {
            description: "Not implemented",
            content: {
              "application/json": {
                example: {
                  success: false,
                  message: "Cruise schema not yet finalised",
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        description:
          "Static API token. Pass as `Authorization: Bearer <token>`.",
      },
    },
    schemas: {
      ResponseMeta: {
        type: "object",
        properties: {
          requestId: {
            type: "string",
            nullable: true,
            example: "44ac6b28-f31e-4943-acdb-5bb8c472eba7",
          },
          timestamp: {
            type: "string",
            format: "date-time",
            example: "2026-05-29T13:23:46.161Z",
          },
        },
      },
      PaginationMeta: {
        type: "object",
        properties: {
          total: { type: "integer", example: 1 },
          page: { type: "integer", example: 1 },
          limit: { type: "integer", example: 20 },
          totalPages: { type: "integer", example: 1 },
          hasNext: { type: "boolean", example: false },
          hasPrev: { type: "boolean", example: false },
          updated_at_max: {
            type: "string",
            format: "date-time",
            nullable: true,
            description:
              "Latest date_updated among returned records — use as cursor for delta sync.",
            example: "2026-05-29T10:16:30.057Z",
          },
        },
      },
      HotelListItem: {
        type: "object",
        description: "Lightweight hotel record returned by GET /api/v1/hotels.",
        properties: {
          id: { type: "string", format: "uuid", example: "6f8a8c0a-d8af-415b-904d-02a6d6f225ca" },
          object_id: { type: "integer", nullable: true, example: 9 },
          name: { type: "string", example: "Stay at Alice Springs" },
          date_updated: { type: "string", format: "date-time", example: "2026-05-29T10:16:30.057Z" },
        },
      },
      ProductCatalogItem: {
        type: "object",
        description: "One entry in the product catalog returned by GET /api/v1/products.",
        properties: {
          type: { type: "string", example: "hotel", description: "Product type identifier." },
          total: { type: "integer", example: 42, description: "Live count of published items of this type." },
          list_url: { type: "string", example: "/api/v1/hotels", description: "Endpoint to list all items of this type." },
          detail_url: { type: "string", example: "/api/v1/hotels/{id}", description: "Endpoint template for a single item detail." },
        },
      },
      ProductLimitedItem: {
        type: "object",
        description: "Lightweight product record returned by GET /api/v1/products/limited-list.",
        properties: {
          type: { type: "string", example: "hotel" },
          id: { type: "string", format: "uuid", example: "6f8a8c0a-d8af-415b-904d-02a6d6f225ca" },
          object_id: { type: "integer", nullable: true, example: 9 },
          name: { type: "string", example: "Stay at Alice Springs" },
          status: { type: "string", nullable: true, example: "published" },
          date_created: { type: "string", format: "date-time", example: "2026-05-09T11:48:36.379Z" },
          date_updated: { type: "string", format: "date-time", example: "2026-05-29T10:16:30.057Z" },
        },
      },
      PaginatedHotelListResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string", example: "OK" },
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/HotelListItem" },
          },
          meta: {
            allOf: [
              { $ref: "#/components/schemas/ResponseMeta" },
              {
                type: "object",
                properties: {
                  pagination: { $ref: "#/components/schemas/PaginationMeta" },
                },
              },
            ],
          },
        },
      },
      GeoObject: {
        type: "object",
        nullable: true,
        description:
          "Geographic reference (country, state, region, place, or location_tour32).",
        properties: {
          id: { type: "integer", example: 13 },
          iso: { type: "string", nullable: true, example: "AU" },
          id_primarix: { type: "integer", nullable: true, example: 294 },
          location_tour32: { type: "integer", nullable: true, example: 44 },
          translations: {
            type: "object",
            description:
              "Keyed by ISO 639-1 code. Filtered to the requested lang when lang param is set.",
            additionalProperties: {
              type: "object",
              properties: { name: { type: "string", nullable: true } },
            },
            example: { de: { name: "Australien" }, nl: { name: "Australië" } },
          },
        },
      },
      OccupancyPrices: {
        type: "object",
        description:
          "Buy/sell prices for one occupancy type within a price date window.",
        properties: {
          buy: {
            type: "string",
            nullable: true,
            description: "Buy price (decimal string).",
            example: "183.00",
          },
          sell: {
            type: "number",
            nullable: true,
            description:
              "Sell price for the active lang (or first available when no lang param).",
            example: 225.0,
          },
          translations: {
            type: "object",
            description:
              "Sell price keyed by ISO 639-1 code. Filtered to the requested lang when lang param is set.",
            additionalProperties: { type: "number", nullable: true },
            example: { de: 225.0, nl: 210.0 },
          },
          margin: {
            type: "number",
            nullable: true,
            description: "Margin percentage from hotel_prices.",
            example: 230,
          },
          unit: {
            type: "string",
            enum: ["person", "unit"],
            nullable: true,
            example: "person",
          },
        },
      },
      SurchargeTranslation: {
        type: "object",
        description: "Per-language surcharge fields.",
        properties: {
          description: { type: "string", nullable: true },
          booking_name: { type: "string", nullable: true },
          sell_price: { type: "number", nullable: true },
          type: {
            type: "string",
            nullable: true,
            description: "Surcharge type designation (from mandatory collection).",
          },
          catering: {
            type: "object",
            nullable: true,
            properties: {
              id: { type: "string", format: "uuid", nullable: true },
              designation: { type: "string", nullable: true },
            },
          },
          calc_type: {
            type: "string",
            nullable: true,
            description:
              "Calculation method designation (from calculation_method collection).",
          },
        },
      },
      HotelDetail: {
        type: "object",
        properties: {
          type: { type: "string", example: "hotel" },
          id: {
            type: "string",
            format: "uuid",
            example: "6f8a8c0a-d8af-415b-904d-02a6d6f225ca",
          },
          name: { type: "string", example: "Stay at Alice Springs" },
          season: {
            type: "string",
            nullable: true,
            description: "Season label from the linked season record.",
            example: "2026",
          },
          object_id: { type: "integer", nullable: true, example: 9 },
          object_info: {
            type: "string",
            nullable: true,
            example: "26_NT, Alice Springs, Stay at Alice Springs",
          },
          internal_remarks: {
            type: "string",
            nullable: true,
            example: null,
          },
          status_primarix: {
            type: "string",
            nullable: true,
            example: "published",
          },
          date_created: {
            type: "string",
            format: "date-time",
            example: "2026-05-09T11:48:36.379Z",
          },
          date_updated: {
            type: "string",
            format: "date-time",
            example: "2026-05-29T10:16:30.057Z",
          },
          user_created: {
            type: "object",
            nullable: true,
            properties: {
              id: { type: "string", format: "uuid" },
              first_name: { type: "string", nullable: true },
              last_name: { type: "string", nullable: true },
            },
          },
          user_updated: {
            type: "object",
            nullable: true,
            properties: {
              id: { type: "string", format: "uuid" },
              first_name: { type: "string", nullable: true },
              last_name: { type: "string", nullable: true },
            },
          },
          partner_type: {
            type: "string",
            nullable: true,
            example: "selected",
          },
          hotel_group: {
            type: "object",
            nullable: true,
            properties: {
              id: { type: "string", format: "uuid" },
              label: { type: "string", nullable: true },
            },
          },
          address: {
            type: "object",
            properties: {
              street: {
                type: "string",
                nullable: true,
                example: "Leichhardt Terrace",
              },
              street_number: { type: "string", nullable: true, example: "11" },
              zip_code: { type: "string", nullable: true, example: "NT 0870" },
              town: {
                type: "string",
                nullable: true,
                description: "Translated place name for the active lang.",
                example: "Alice Springs",
              },
              state: {
                type: "string",
                nullable: true,
                description: "Translated state name for the active lang.",
                example: "Northern Territory",
              },
              region: {
                type: "string",
                nullable: true,
                description: "Translated region name for the active lang.",
                example: "Rotes Zentrum",
              },
              country: {
                type: "string",
                nullable: true,
                description: "Translated country name for the active lang.",
                example: "Australien",
              },
              location_tour32: {
                type: "string",
                nullable: true,
                description:
                  "Translated Tour32 location name for the active lang.",
                example: "Alice Springs",
              },
            },
          },
          contact: {
            type: "object",
            properties: {
              phone_general: {
                type: "string",
                nullable: true,
                example: "+61 8 8950 6666",
              },
              phone_ah: {
                type: "string",
                nullable: true,
                description: "After-hours phone number.",
                example: "",
              },
              email_general: {
                type: "string",
                nullable: true,
                example: "info@alicespringsaurora.com.au",
              },
              website: {
                type: "string",
                nullable: true,
                example: "www.auroraresorts.com.au",
              },
            },
          },
          partner_filter_ids: {
            type: "array",
            items: { type: "integer" },
            description: "Primarix IDs of assigned partner organisations.",
            example: [4739, 4740, 4742],
          },
          supplier: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: ["Independent", "Partner"],
                nullable: true,
                example: "Independent",
              },
              id_tour_user: {
                type: "string",
                nullable: true,
                example: "3030",
              },
              haupt_id_tour_user: {
                type: "string",
                nullable: true,
                example: "Main Service Provider (Tour32 only)",
              },
              booking_partner: {
                type: "string",
                nullable: true,
                example: "Across Australia (Goway Travel)",
              },
              booking_email: {
                type: "string",
                nullable: true,
                example: null,
              },
              booking_info: {
                type: "string",
                nullable: true,
                example: null,
              },
            },
          },
          from_price: {
            type: "string",
            nullable: true,
            description:
              "Lowest sell price for the active lang as a decimal string, resolved from the linked room_prices record in hotel_prices.",
            example: "677.00",
          },
          accommodation_type: {
            type: "string",
            nullable: true,
            description: "Label of the first linked accommodation type.",
            example: "Hotel",
          },
          classification: {
            type: "string",
            nullable: true,
            description: "Label from hotel_classifications.",
            example: "3.0",
          },
          activities: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string", format: "uuid" },
                label: { type: "string", nullable: true },
              },
            },
          },
          translations: {
            type: "object",
            description:
              "Hotel description fields keyed by ISO 639-1 code (e.g. \"de\", \"de-CH\", \"nl\"). Filtered to the requested lang when lang param is set. Source: hotel_descriptions_translations junction.",
            additionalProperties: {
              type: "object",
              properties: {
                subline_location: { type: "string", nullable: true },
                teaser: { type: "string", nullable: true },
                description_short: { type: "string", nullable: true },
                description_surrounding: { type: "string", nullable: true },
                description_rooms: { type: "string", nullable: true },
                total_number_of_rooms: {
                  type: "integer",
                  nullable: true,
                  description: "Total room count as integer.",
                  example: 109,
                },
                remarks_arrival: { type: "string", nullable: true },
                description_supplementary: {
                  type: "array",
                  nullable: true,
                  description:
                    "JSON repeater — array of {headline, text} blocks. Null when empty.",
                  items: {
                    type: "object",
                    properties: {
                      headline: { type: "string" },
                      text: { type: "string" },
                    },
                  },
                },
              },
            },
            example: {
              de: {
                subline_location: "Alice Springs",
                teaser:
                  "Das Hotel wird gerne wegen der zentralen Lage direkt an der Todd Mall gebucht.",
                description_short:
                  "Das Stay at Alice bietet u.a. eine 24-Stunden-Rezeption, einen Swimmingpool und WLAN.",
                description_surrounding:
                  "Sehr zentral im Stadtzentrum, mit Zugang zur Fußgängerzone.",
                description_rooms:
                  "109 Zimmer mit Klimaanlage, Kühlschrank und TV.",
                total_number_of_rooms: 109,
                remarks_arrival: "test",
                description_supplementary: [
                  { headline: "123123", text: "12312" },
                ],
              },
            },
          },
          price_info_translations: {
            type: "object",
            description:
              "Price and service information keyed by ISO 639-1 code. Filtered to the requested lang when lang param is set. Source: price_info_translations junction.",
            additionalProperties: {
              type: "object",
              properties: {
                services_included: { type: "string", nullable: true },
                services_not_included: { type: "string", nullable: true },
                service_highlights: { type: "string", nullable: true },
                minimum_stay: {
                  type: "string",
                  nullable: true,
                  description: "e.g. \"2 Nights\", \"3 Nights\"",
                },
                minimum_stay_additions: { type: "string", nullable: true },
                deviating_cancelation_terms: {
                  type: "string",
                  nullable: true,
                },
                children_policy: { type: "string", nullable: true },
                children_free_age: { type: "integer", nullable: true },
                children_free_number: { type: "integer", nullable: true },
                important_information: { type: "string", nullable: true },
                mobility_advice_text: { type: "string", nullable: true },
                price_infos_supplementary: {
                  type: "array",
                  nullable: true,
                  description: "JSON repeater: [{headline, text}]",
                  items: {
                    type: "object",
                    properties: {
                      headline: { type: "string" },
                      text: { type: "string" },
                    },
                  },
                },
              },
            },
            example: {
              de: {
                services_included: "Übernachtung",
                services_not_included: "",
                service_highlights: "",
                minimum_stay: null,
                minimum_stay_additions: "",
                deviating_cancelation_terms: "",
                children_policy: "keine Ermäßigung.",
                children_free_age: null,
                children_free_number: null,
                important_information: "",
                mobility_advice_text:
                  "Wir sind verpflichtet darauf hinzuweisen, dass diese Unterkunft im Allgemeinen für Personen mit eingeschränkter Mobilität nicht geeignet ist.",
                price_infos_supplementary: null,
              },
            },
          },
          rooms: {
            type: "array",
            description:
              "Room categories with pricing. Only room_categories and price_dates whose publication status is active are included.",
            items: {
              type: "object",
              properties: {
                category: {
                  type: "string",
                  nullable: true,
                  example: "TEST",
                },
                booking_code: {
                  type: "string",
                  nullable: true,
                  example: null,
                },
                tour32_name: {
                  type: "string",
                  nullable: true,
                  example: null,
                },
                catering: {
                  type: "object",
                  nullable: true,
                  properties: {
                    id: { type: "string", format: "uuid", nullable: true },
                    designation: { type: "string", nullable: true },
                  },
                },
                days_repeater: {
                  nullable: true,
                  description:
                    "JSON repeater for day-specific pricing variations.",
                },
                prices: {
                  type: "array",
                  description: "Price date windows for this room category.",
                  items: {
                    type: "object",
                    properties: {
                      start_date: {
                        type: "string",
                        format: "date",
                        example: "2026-03-31",
                      },
                      end_date: {
                        type: "string",
                        format: "date",
                        example: "2026-04-01",
                      },
                      occupancies: {
                        type: "object",
                        description:
                          "Keyed by occupancy name (e.g. \"DZ\", \"EZ\").",
                        additionalProperties: {
                          $ref: "#/components/schemas/OccupancyPrices",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          price_options: {
            type: "array",
            description:
              "Surcharges / optional add-ons. Only surcharges whose publication status is active are included.",
            items: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  format: "uuid",
                  example: "3ea533f0-26c3-4ea1-81da-53b382e94358",
                },
                description: {
                  type: "string",
                  nullable: true,
                  description: "Description for the active lang.",
                  example: "Frühstück pro Person/Nacht",
                },
                booking_name: {
                  type: "string",
                  nullable: true,
                  example: "Full Breakfast",
                },
                buy: {
                  type: "number",
                  nullable: true,
                  example: 500,
                },
                sell: { type: "number", nullable: true, example: null },
                margin: { type: "number", nullable: true, example: 230 },
                type: { type: "string", nullable: true, example: "optional" },
                catering: {
                  type: "object",
                  nullable: true,
                  properties: {
                    id: { type: "string", format: "uuid", nullable: true },
                    designation: { type: "string", nullable: true },
                  },
                },
                calc_type: {
                  type: "string",
                  nullable: true,
                  example: "pro Person und Nacht",
                },
                translations: {
                  type: "object",
                  description:
                    "All translatable surcharge fields keyed by ISO 639-1 code. Filtered to the requested lang when lang param is set.",
                  additionalProperties: {
                    $ref: "#/components/schemas/SurchargeTranslation",
                  },
                  example: {
                    de: {
                      description: "Frühstück pro Person/Nacht",
                      booking_name: "Full Breakfast",
                      sell_price: null,
                      type: "optional",
                      catering: {
                        id: "6c8ba1d2-e38e-4698-bca9-a7a289999b97",
                        designation: "Frühstück",
                      },
                      calc_type: "pro Person und Nacht",
                    },
                  },
                },
              },
            },
          },
          specials: {
            type: "array",
            description:
              "Active special offers (JSON repeater). Only specials whose publication status is active are included.",
            items: {
              type: "object",
              properties: {
                name: { type: "string", nullable: true, example: "123123" },
                special_description: {
                  type: "string",
                  nullable: true,
                  example: "qwesaddasd",
                },
                status: {
                  type: "string",
                  nullable: true,
                  example: "published",
                },
                publish_start: {
                  type: "string",
                  format: "date",
                  nullable: true,
                  example: "2026-05-20",
                },
                publish_end: {
                  type: "string",
                  format: "date",
                  nullable: true,
                  example: "2026-06-25",
                },
              },
            },
          },
          image_badge: {
            type: "object",
            properties: {
              status: {
                type: "string",
                nullable: true,
                example: "published_period",
              },
              start_date: {
                type: "string",
                format: "date",
                nullable: true,
                example: "2026-05-12",
              },
              end_date: {
                type: "string",
                format: "date",
                nullable: true,
                example: "2026-05-28",
              },
              translations: {
                type: "object",
                description:
                  "Badge text keyed by ISO 639-1 code. Filtered to the requested lang when lang param is set.",
                additionalProperties: {
                  type: "object",
                  properties: {
                    image_badge_teaser: {
                      type: "string",
                      nullable: true,
                      example: "Text Overview Pages",
                    },
                    image_badge_details: {
                      type: "string",
                      nullable: true,
                      example: "Text Detail Page",
                    },
                  },
                },
                example: {
                  de: {
                    image_badge_teaser: "Text Overview Pages",
                    image_badge_details: "Text Detail Page",
                  },
                },
              },
            },
          },
          pictures: {
            type: "array",
            description: "Hotel media files with asset URLs and metadata.",
            items: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  format: "uuid",
                  example: "0df9e839-5747-4af4-a9cc-72cda5b8bd8d",
                },
                filename: {
                  type: "string",
                  nullable: true,
                  example: "claudio-schwarz-Axx5fWxrcFA-unsplash_optimized_2000",
                },
                url: {
                  type: "string",
                  example: "/assets/0df9e839-5747-4af4-a9cc-72cda5b8bd8d",
                },
                thumbnail_url: {
                  type: "string",
                  example:
                    "/assets/0df9e839-5747-4af4-a9cc-72cda5b8bd8d?width=400&height=300&fit=cover",
                },
                copyright: {
                  type: "string",
                  nullable: true,
                  example: "©none",
                },
                alt_text: { type: "string", nullable: true, example: null },
                caption_i18n: {
                  description:
                    "When lang is set: the caption string for that language (or null). When no lang: an object keyed by ISO 639-1 code. Null when no captions exist.",
                  oneOf: [
                    { type: "string", nullable: true },
                    {
                      type: "object",
                      additionalProperties: {
                        type: "string",
                        nullable: true,
                      },
                    },
                  ],
                  example: null,
                },
                is_map: {
                  type: "boolean",
                  nullable: true,
                  example: false,
                },
                tour32_export: {
                  type: "boolean",
                  nullable: true,
                  example: false,
                },
                dimensions_px: {
                  type: "string",
                  nullable: true,
                  example: null,
                },
                keyword_ids: {
                  type: "array",
                  nullable: true,
                  items: { type: "string" },
                  example: null,
                },
                folder: {
                  type: "object",
                  nullable: true,
                  properties: {
                    id: { type: "string", format: "uuid", nullable: true },
                    name: { type: "string", nullable: true },
                  },
                  example: {
                    id: "118314af-9e4f-4109-9777-582bce3c6cc5",
                    name: "Icons",
                  },
                },
                expiry_date: {
                  type: "string",
                  format: "date-time",
                  nullable: true,
                  example: null,
                },
                sort: {
                  type: "integer",
                  description:
                    "1-based sort position within the hotel's media list.",
                  example: 1,
                },
              },
            },
          },
        },
      },
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string", example: "Validation failed" },
          errors: {
            type: "array",
            items: {
              type: "object",
              properties: {
                field: { type: "string", example: "limit" },
                message: {
                  type: "string",
                  example: "limit must be between 1 and 100",
                },
              },
            },
          },
          meta: { $ref: "#/components/schemas/ResponseMeta" },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: "Missing or invalid Authorization Bearer token",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
            example: {
              success: false,
              message:
                "Missing or malformed Authorization header. Expected: Bearer <token>",
              meta: {
                requestId: "5bc339bd-d3c5-4a86-9a4c-c4cfd9bc79f0",
                timestamp: "2026-05-29T13:24:39.933Z",
              },
            },
          },
        },
      },
      ValidationError: {
        description: "Request validation failed",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
            example: {
              success: false,
              message: "Validation failed",
              errors: [
                { field: "limit", message: "limit must be between 1 and 100" },
              ],
              meta: {
                requestId: "330d2ca7-a418-42e2-a1f0-c03ded46e922",
                timestamp: "2026-05-29T13:24:40.027Z",
              },
            },
          },
        },
      },
      NotFound: {
        description: "Resource not found",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
            example: {
              success: false,
              message: "Hotel not found: non-existent-id-00000",
              meta: {
                requestId: "76082571-e6de-4847-b252-e13cb31d07ea",
                timestamp: "2026-05-29T13:24:40.000Z",
              },
            },
          },
        },
      },
      ServerError: {
        description: "Internal server error",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
            example: {
              success: false,
              message: "Internal server error",
              meta: {
                requestId: "e4690af3-6004-4e38-8c4d-737d9cf4fa22",
                timestamp: "2026-05-29T13:24:27.954Z",
              },
            },
          },
        },
      },
    },
  },
};
