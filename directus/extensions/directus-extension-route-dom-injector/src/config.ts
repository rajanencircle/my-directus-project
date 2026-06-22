/**
 * config.ts
 *
 * Route-based DOM action configuration.
 * Edit this file to control which routes get which DOM manipulations.
 */

export interface HideLabelsByField {
  /** Only hide labels for these specific field names (matched via [data-field] attribute) */
  fields: string[];
}

export interface AddClassAction {
  /** CSS selector to target elements */
  selector: string;
  /** Class name to add to matching elements */
  className: string;
}

export interface TabGroupRawStyleAction {
  /**
   * List of tab group field IDs (e.g. 'master_data_group').
   * Matched against tab panel IDs like: reka-tabs-v-0-content-master_data_group
   */
  tabIds: string[];
  /**
   * CSS property → value pairs to apply (with !important) to the first
   * .group-raw found inside each matched tab panel.
   * e.g. { 'background-color': 'transparent', 'padding': '0px' }
   */
  styles: Record<string, string>;
}

export interface RouteActions {
  /**
   * Hide field labels.
   * - `true`: hide ALL labels on the page
   * - `{ fields: ['name', 'price'] }`: hide only the listed fields
   */
  hideLabels?: true | HideLabelsByField;

  /**
   * Add CSS classes to matching elements.
   * Each entry targets one or more elements with a selector and adds a class.
   */
  addClasses?: AddClassAction[];

  /**
   * Apply inline styles to the first .group-raw inside specific tab panels
   * of a .group-tabs component. Identified by tab group field ID.
   */
  tabGroupRawStyles?: TabGroupRawStyleAction[];

  /**
   * Arbitrary DOM scripts to run after the route is matched.
   * Each function is called once per MutationObserver tick.
   */
  scripts?: Array<() => void>;
}

export interface RouteConfig {
  /** The route path to match against window.location.pathname */
  path: string;
  /**
   * If true, match this path and all subroutes (startsWith).
   * If false, match only the exact path.
   */
  children: boolean;
  /** DOM actions to apply when this route is active */
  actions: RouteActions;
}

/**
 * Demo configuration — three scenarios:
 *
 * 1. /content/rooms  (+ children)  → hide specific field labels + add highlight class to price
 * 2. /content/hotels (exact only)  → hide ALL field labels
 * 3. /content/bookings (+ children) → add a class to the status field only
 *
 * Replace or extend these entries to match your actual Directus collections and fields.
 */
const routeConfig: RouteConfig[] = [
  {
    path: "/content/geo_location",
    children: true,
    actions: {
      hideLabels: {
        fields: ["geographies"],
      },
      addClasses: [],
    },
  },
  {
    path: "/content/hotels",
    children: true,
    actions: {
      hideLabels: {
        fields: [
          "partner_type",
          "booking_partner",
          "partner",
          "item_preview_button",
          "image_badge_translations",
          "hotel_descriptions_translations",
          "price_info_translations",
          "save_and_stay_price",
          "save_and_stay_surcharge",
        ],
      },
      addClasses: [],
      tabGroupRawStyles: [
        {
          tabIds: ["master_data_group"],
          styles: {
            "background-color": "transparent",
            padding: "0px",
            border: "0px solid #E5E7EB",
          },
        },
      ],
    },
  },
  {
    path: "/content/cruises",
    children: true,
    actions: {
      hideLabels: {
        fields: [
          "partner_type",
          "booking_partner",
          "partner",
          "item_preview_button",
          "translations",
          "price_infos_translations",
          "travel_program_translations",
          "image_badge_translations",
          "save_and_stay_price",
          "save_and_stay_surcharge",
        ],
      },
      addClasses: [],
      tabGroupRawStyles: [
        {
          tabIds: ["master_data_group"],
          styles: {
            "background-color": "transparent",
            padding: "0px",
            border: "0px solid #E5E7EB",
          },
        },
      ],
    },
  },
  {
    path: "/content/tours",
    children: true,
    actions: {
      hideLabels: {
        fields: [
          "partner_type",
          "booking_partner",
          "partner",
          "item_preview_button",
          "image_badge_translations",
          "save_and_stay_surcharge",
          "tours_description_translations",
          "tours_dates_translations",
          "price_info",
          "tour_prices",
          "tours_specials",
          "image_badge_translations",
        ],
      },
      addClasses: [],
      tabGroupRawStyles: [
        {
          tabIds: ["master_data_group"],
          styles: {
            "background-color": "transparent",
            padding: "0px",
            border: "0px solid #E5E7EB",
          },
        },
      ],
    },
  },
  {
    path: "/content/excursions",
    children: true,
    actions: {
      hideLabels: {
        fields: [
          "booking_partner",
          "partner",
          "item_preview_button",
          "image_badge_translations",
          "price_info_translations",
          "save_and_stay_price",
          "save_and_stay_surcharge",
        ],
      },
      addClasses: [],
      tabGroupRawStyles: [
        {
          tabIds: ["tab_master_data", "tab_calculator_inputs"],
          styles: {
            "background-color": "transparent",
            padding: "0px",
            border: "0px solid #E5E7EB",
          },
        },
      ],
    },
  },
  {
    path: "/content",
    children: true,
    actions: {
      addClasses: [
        {
          selector: ".search-input",
          className: "active",
        },
      ],
      scripts: [
        () => {
          document
            .querySelectorAll<HTMLElement>(".field-label .field-name")
            .forEach((el) => {
              el.setAttribute("tabindex", "-1");
            });
        },
      ],
    },
  },

  // {
  //   // Demo 3: Add a visual indicator class to a specific field
  //   path: '/content/bookings',
  //   children: true,
  //   actions: {
  //     addClasses: [
  //       {
  //         selector: '[data-field="status"]',
  //         className: 'rdi-status-field',
  //       },
  //       {
  //         selector: '[data-field="check_in_date"]',
  //         className: 'rdi-date-field',
  //       },
  //     ],
  //   },
  // },
];

export default routeConfig;
