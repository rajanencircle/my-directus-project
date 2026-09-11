import type { Ref } from "vue";
import type { AxiosInstance } from "axios";

/**
 * A Directus row with configurable, admin-defined field names — the field
 * set is not statically known (it depends on how this interface instance is
 * configured), so `Record<string, any>` is the honest shape here, not an
 * unchecked value.
 */
export type DirectusItem = Record<string, any>;

/** All admin-configurable options this interface's `props` can carry. */
export interface SurchargeProps {
  value?: DirectusItem[];
  primaryKey?: string | number | null;
  collection?: string;
  field?: string;
  disabled?: boolean;
  values?: Record<string, any>;
  sortField?: string;
  percentageTypeField?: string;
  marginField?: string;
  provisionField?: string;
  roundHalfLogic?: string;
  calculateSellPriceLogic?: string;
  surchargesCollection?: string;
  translationsCollection?: string;
  ratesCollection?: string;
  parentField?: string;
  buyPriceField?: string;
  sellPriceField?: string;
  exchangeRateField?: string;
  junctionParentField?: string;
  junctionLanguageField?: string;
  surchargeNameField?: string;
  translationsSurchargeField?: string;
  translationsLanguageField?: string;
  fromCurrencyField?: string;
  toCurrencyField?: string;
  currencySymbolField?: string;
  type?: string | null;
  relation?: Record<string, any> | null;
  fieldData?: Record<string, any> | null;
  placement?: string;
  label?: string;
  loadingText?: string;
  headerSurchargeLabel?: string;
  headerPricingLabel?: string;
  buyLabel?: string;
  sellLabel?: string;
  emptyStateTitle?: string;
  emptyStateHint?: string;
}

/**
 * Everything in the surcharge-prices interface that talks to the Directus API
 * or runs the pricing formula: context (parent/language) resolution, the
 * surcharge + translation fetches, the orphan-translation cleanup, the save
 * path, and the sell-price calculation. All state lives in refs the caller
 * owns and passes in — the composable only reads/writes them and never
 * creates component-level reactive state of its own.
 *
 * `props` and `api` are closure values from the component's `setup`; the
 * remaining options are the shared refs.
 */
export interface SurchargeDataOptions {
  props: SurchargeProps;
  api: AxiosInstance;
  parentId: Ref<string | null>;
  languageId: Ref<string | null>;
  items: Ref<DirectusItem[]>;
  originalItems: Ref<DirectusItem[]>;
  hasBuyChanges: Ref<boolean>;
  buyCurrencySymbol: Ref<string>;
  sellCurrencySymbol: Ref<string>;
  lastLoadedParentId: Ref<string | null>;
  loading: Ref<boolean>;
  calculating: Ref<boolean>;
  errorMessage: Ref<string>;
}
