import type { DirectusItem, SurchargeDataOptions } from "../types";

// Prices are always displayed and saved to 2 decimal places — Directus
// returns `decimal` fields as full-precision strings (e.g. a drifted
// buy_price column typed decimal(10,5)), which round-trips as
// "123.00000" instead of "123.00" unless rounded here. Applied both on
// read (for display) and before every write (buy price save + calculated
// sell price), so the database itself never stores more than 2 decimal
// places either.
const PRICE_PRECISION = 2;

function roundToPricePrecision(value: unknown): any {
  if (value === null || value === undefined || value === "") return value;
  const num = Number(value);
  if (!Number.isFinite(num)) return value;
  const factor = 10 ** PRICE_PRECISION;
  return Math.round(num * factor) / factor;
}

// Identifies a request we cancelled ourselves (via AbortController, when a
// newer loadData() call superseded an older in-flight one) so it can be
// swallowed silently instead of surfacing a spurious error message.
function isAbortError(err: unknown): boolean {
  const e = err as { name?: string; code?: string } | null | undefined;
  return e?.name === "AbortError" || e?.name === "CanceledError" || e?.code === "ERR_CANCELED";
}

export function useSurchargeData(options: SurchargeDataOptions) {
  const {
    props,
    api,
    parentId,
    languageId,
    items,
    originalItems,
    hasBuyChanges,
    buyCurrencySymbol,
    sellCurrencySymbol,
    lastLoadedParentId,
    loading,
    calculating,
    errorMessage,
  } = options;

  /*
   * Compiles the admin-authored `roundHalfLogic`/`calculateSellPriceLogic`
   * formula text (stored on this field's own saved options) into a
   * callable function. Sell-price calculation used to be delegated to a
   * dedicated `/surcharge-calculator/calculate` backend endpoint that did
   * exactly this compilation inside a Node `vm` sandbox; running it here
   * instead does not change the trust model — the formula is still
   * authored exclusively by an admin through this field's configuration,
   * never by an end user — it simply removes the need for a bespoke
   * backend route to execute logic the browser can run itself.
   */
  const compileCalculator = (roundHalfCode: string, calcCode: string) => {
    try {
      // eslint-disable-next-line no-new-func
      const factory = new Function(
        `${roundHalfCode}\n${calcCode}\nreturn { roundHalf, calculateSellPrice };`,
      );
      const { roundHalf, calculateSellPrice } = factory();
      if (
        typeof roundHalf !== "function" ||
        typeof calculateSellPrice !== "function"
      ) {
        return {
          error:
            "Formula must define exactly named functions roundHalf(val) and calculateSellPrice(buyPrice, settingsRow, surchargeRow, rateValue).",
        };
      }
      return { calculateSellPrice };
    } catch (err: any) {
      return { error: `Failed to compile formula: ${err.message}` };
    }
  };

  /*
   * Returns the human-readable admin option names (matching this
   * interface's own settings panel) that are unset among the given
   * list — fails loudly and specifically before ever attempting an API
   * call, instead of a generic "Failed to calculate" once a request
   * breaks on a field name that was never configured.
   */
  const describeMissingConfig = (
    fields: { value: unknown; label: string }[],
  ): string[] => fields.filter((f) => !f.value).map((f) => f.label);

  const calculateRequiredFields = () =>
    describeMissingConfig([
      { value: props.surchargesCollection, label: "Surcharges Collection" },
      { value: props.translationsCollection, label: "Translations Collection" },
      { value: props.parentField, label: "Parent Foreign Key" },
      { value: props.buyPriceField, label: "Buy Price Field" },
      { value: props.sellPriceField, label: "Sell Price Field" },
      { value: props.exchangeRateField, label: "Exchange Rate Field" },
      { value: props.junctionParentField, label: "Junction Parent Field" },
      { value: props.junctionLanguageField, label: "Junction Language Field" },
      { value: props.percentageTypeField, label: "Percentage Type Field" },
      { value: props.marginField, label: "Margin Percentage Field" },
      { value: props.provisionField, label: "Provision Percentage Field" },
      { value: props.ratesCollection, label: "Rates Collection" },
      { value: props.translationsSurchargeField, label: "Translations → Surcharge FK Field" },
      { value: props.translationsLanguageField, label: "Translations → Language FK Field" },
      { value: props.roundHalfLogic as string, label: "Round Half Logic" },
      { value: props.calculateSellPriceLogic, label: "Calculate Sell Price Logic" },
    ]);

  const missingConfigMessage = (missing: string[]) =>
    `This surcharge table isn't fully configured yet — missing: ${missing.join(", ")}. Set these in this field's interface options.`;

  /*
   * Ranks surcharge rows that share the same identity (name, for this
   * parent) so the most complete one is kept and shown, instead of every
   * duplicate rendering as its own separate row. Preference order: has a
   * non-zero buy price > has a sell-price translation for the current
   * language > lower id (stable tiebreak).
   *
   * Mirrors the same real, recurring data-conflict pattern the price-table
   * interface guards against (duplicate rows from non-idempotent upstream
   * writes) — without this, a duplicated surcharge either shows as two
   * confusing rows for the "same" surcharge, or (once one is edited) makes
   * it unclear which row's buy/sell price is actually in effect.
   */
  const pickBestSurchargeRow = (
    candidates: DirectusItem[],
    buyPriceField: string,
  ): DirectusItem => {
    if (candidates.length <= 1) return candidates[0];
    const sorted = [...candidates].sort((a, b) => {
      const hasBuyA = a[buyPriceField] != null && Number(a[buyPriceField]) !== 0;
      const hasBuyB = b[buyPriceField] != null && Number(b[buyPriceField]) !== 0;
      if (hasBuyA !== hasBuyB) return hasBuyA ? -1 : 1;

      const hasSellA = a._trans_id != null;
      const hasSellB = b._trans_id != null;
      if (hasSellA !== hasSellB) return hasSellA ? -1 : 1;

      const updatedA = a.date_updated ?? "";
      const updatedB = b.date_updated ?? "";
      if (updatedA !== updatedB) return updatedA < updatedB ? 1 : -1;

      return String(a.id).localeCompare(String(b.id));
    });
    const ignoredIds = sorted.slice(1).map((c) => c.id);
    // eslint-disable-next-line no-console
    console.warn(
      "[SurchargePrices] multiple surcharge rows with the same name for this parent — " +
        `picked ${sorted[0].id}, ignored [${ignoredIds.join(", ")}]. ` +
        "This is a data conflict, not a resolved one — needs manual review.",
    );
    return sorted[0];
  };

  // Resolves which parent record and language this instance is currently
  // showing, in priority order: (1) the parent/language FKs in `values`
  // (junction context), (2) the saved junction record when `primaryKey` is a
  // real ID (fetching its exchange rate key for the currency symbols), (3)
  // `primaryKey` itself when the interface sits directly on the parent
  // collection, and (4) as a last resort for new records, the parent ID
  // parsed from the page URL.
  const resolveContext = async () => {
    const hf = props.junctionParentField as string;
    const lf = props.junctionLanguageField as string;

    parentId.value = props.values?.[hf]?.id ?? props.values?.[hf] ?? null;
    languageId.value = props.values?.[lf]?.id ?? props.values?.[lf] ?? null;

    if (props.primaryKey && props.primaryKey !== "+") {
      try {
        const { data } = await api.get(
          `/items/${props.collection}/${props.primaryKey}`,
          { params: { fields: [hf, lf, props.exchangeRateField] } },
        );
        if (data?.data) {
          parentId.value = data.data[hf]?.id ?? data.data[hf] ?? parentId.value;
          languageId.value =
            data.data[lf]?.id ?? data.data[lf] ?? languageId.value;
          const rateKey = data.data[props.exchangeRateField as string]?.key;
          if (rateKey) fetchCurrencySymbols(rateKey);
        }
      } catch (err) {
        console.error("[SurchargePrices] resolveContext error:", err);
        errorMessage.value = "Failed to resolve the parent record and language for this surcharge table.";
      }
    }

    // Fallback: when the interface is placed directly on the hotel collection,
    // primaryKey IS the hotel ID and junctionParentField won't resolve from values.
    if (!parentId.value && props.primaryKey && props.primaryKey !== "+") {
      parentId.value = String(props.primaryKey);
    }

    // Final fallback: for new junction records (pk="+"), extract the parent
    // id from the current page URL — works when rendered inside the
    // parent's edit form. Id shape varies by collection: hotels use UUIDs,
    // but excursions/tours/etc. use plain integer ids — match either.
    if (!parentId.value) {
      const idMatch = window.location.pathname.match(
        /\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\d+)(?:\/|$)/i,
      );
      if (idMatch) parentId.value = idMatch[1];
    }
  };

  const fetchCurrencySymbols = async (rateKey: string) => {
    try {
      const fc = props.fromCurrencyField as string;
      const tc = props.toCurrencyField as string;
      const sf = props.currencySymbolField as string;
      const { data } = await api.get(
        `/items/${props.ratesCollection}/${rateKey}`,
        { params: { fields: [`${fc}.${sf}`, `${tc}.${sf}`] } },
      );
      buyCurrencySymbol.value = data.data[fc]?.[sf] ?? "";
      sellCurrencySymbol.value = data.data[tc]?.[sf] ?? "";
    } catch (err) {
      console.error("[SurchargePrices] fetchCurrencySymbols error:", err);
      errorMessage.value = "Failed to load currency symbols for the surcharge table header.";
    }
  };

  let loadDataRequestId = 0;
  let loadDataAbortController: AbortController | null = null;

  const loadData = async () => {
    if (!parentId.value || parentId.value === "+") return;

    // Guards against out-of-order responses: an older in-flight loadData()
    // call that resolves after a newer one must not overwrite items.value
    // with stale data (mirrors the price-table interface's fetchItems).
    loadDataAbortController?.abort();
    const controller = new AbortController();
    loadDataAbortController = controller;
    const requestId = ++loadDataRequestId;
    const isStale = () => requestId !== loadDataRequestId;

    loading.value = true;
    errorMessage.value = "";
    try {
      const nameField = props.surchargeNameField as string;
      const tSurchargeField = props.translationsSurchargeField as string;
      const tLanguageField = props.translationsLanguageField as string;

      /*
       * Only meaningful when reloading the *same* record's surcharges,
       * not when switching to a different one entirely — see
       * `lastLoadedParentId`'s doc comment above for why.
       */
      const sameRecordAsBefore = lastLoadedParentId.value === parentId.value;
      const previousSurchargeIds = sameRecordAsBefore
        ? new Set(items.value.map((i: DirectusItem) => i.id))
        : new Set();

      const { data: sRes } = await api.get(
        `/items/${props.surchargesCollection}`,
        {
          params: {
            filter: { [props.parentField as string]: { _eq: parentId.value } },
            fields: [
              "id",
              nameField,
              props.buyPriceField,
              ...(props.sortField ? [props.sortField as string] : []),
            ],
            sort: props.sortField ? [props.sortField as string] : undefined,
            limit: -1,
          },
          signal: controller.signal,
        },
      );

      const sIds = sRes.data.map((s: DirectusItem) => s.id);
      const translations: Record<string, DirectusItem> = {};

      if (sIds.length > 0 && languageId.value) {
        const { data: tRes } = await api.get(
          `/items/${props.translationsCollection}`,
          {
            params: {
              filter: {
                _and: [
                  { [tSurchargeField]: { _in: sIds } },
                  { [tLanguageField]: { _eq: languageId.value } },
                ],
              },
              fields: ["id", tSurchargeField, props.sellPriceField],
              limit: -1,
            },
            signal: controller.signal,
          },
        );
        tRes.data.forEach((t: DirectusItem) => {
          translations[t[tSurchargeField]] = t;
        });
      }

      const mappedItems = sRes.data.map((s: DirectusItem) => ({
        ...s,
        [props.buyPriceField as string]: roundToPricePrecision(
          s[props.buyPriceField as string],
        ),
        [props.sellPriceField as string]: roundToPricePrecision(
          translations[s.id]?.[props.sellPriceField as string] ?? null,
        ),
        _trans_id: translations[s.id]?.id || null,
        _dirty: false,
        _buyDirty: false,
      }));

      // A newer loadData() call has since superseded this one — discard
      // this response rather than regressing items.value to older data.
      if (isStale()) return;

      const candidatesByName = new Map<string, DirectusItem[]>();
      mappedItems.forEach((item: DirectusItem) => {
        const identity = item[nameField];
        const bucket = candidatesByName.get(identity);
        if (bucket) bucket.push(item);
        else candidatesByName.set(identity, [item]);
      });
      items.value = Array.from(candidatesByName.values()).map((candidates) =>
        pickBestSurchargeRow(candidates, props.buyPriceField as string),
      );

      /*
       * A surcharge deleted elsewhere (the native list-o2m repeater this
       * component doesn't itself render) leaves its own translation rows
       * behind — Directus has no cascading foreign key for this on
       * purpose (same reasoning as price-table's cascade-delete), so this
       * component cleans up after itself here, generically, using
       * whichever collection/field names this instance is configured
       * with.
       */
      if (sameRecordAsBefore && previousSurchargeIds.size) {
        const currentSurchargeIds = new Set(sIds);
        const removedSurchargeIds = Array.from(previousSurchargeIds).filter(
          (id) => !currentSurchargeIds.has(id),
        );
        if (removedSurchargeIds.length) {
          try {
            const { data: orphanRes } = await api.get(
              `/items/${props.translationsCollection}`,
              {
                params: {
                  filter: { [tSurchargeField]: { _in: removedSurchargeIds } },
                  fields: ["id"],
                  limit: -1,
                },
              },
            );
            const orphanTranslationIds = (orphanRes.data || []).map(
              (t: DirectusItem) => t.id,
            );
            if (orphanTranslationIds.length) {
              await api.delete(`/items/${props.translationsCollection}`, {
                data: orphanTranslationIds,
              });
            }
          } catch (cleanupErr) {
            console.error(
              "[SurchargePrices] Error cascading deletion of orphaned translations:",
              cleanupErr,
            );
            errorMessage.value =
              "Failed to clean up sell-price translations for a removed surcharge — some orphaned rows may remain.";
          }
        }
      }
      lastLoadedParentId.value = parentId.value;

      originalItems.value = JSON.parse(JSON.stringify(items.value));
      hasBuyChanges.value = false;
    } catch (err: any) {
      if (isAbortError(err)) return;
      console.error("[SurchargePrices] loadData error:", err);
      errorMessage.value =
        err?.response?.data?.errors?.[0]?.message ||
        err?.message ||
        "Failed to load surcharge prices.";
    } finally {
      // Only the current (non-superseded) request may clear the spinner —
      // an older request finishing its cleanup after a newer one already
      // started must not flip loading back off underneath it.
      if (!isStale()) loading.value = false;
    }
  };

  // Persists every dirty surcharge row and its sell-price translation. Price
  // rows are PATCHed in place; translations are PATCHed when they already
  // exist (`_trans_id`) or POSTed (single, not bulk — each newly created
  // translation is a separate record) otherwise. All requests are
  // independent, so they fire together in one `Promise.all`.
  /*
   * Returns the buy price this call just confirmed persisting, per row
   * (`{ id, [buyPriceField]: value }`), for every dirty row. Lets a caller
   * (the Save & Stay button) hand the sell-price calculator known-good buy
   * prices instead of it re-fetching them itself — that independent
   * re-fetch is what raced this write and produced `sell_price = 0` (see
   * save-and-stay-trigger-flow's `calculateSurchargesClient`).
   */
  const saveChanges = async (): Promise<DirectusItem[]> => {
    const tSurchargeField = props.translationsSurchargeField as string;
    const tLanguageField = props.translationsLanguageField as string;
    const tasks: Promise<any>[] = [];
    const freshRows: DirectusItem[] = [];
    for (const item of items.value as DirectusItem[]) {
      if (!item._dirty) continue;
      const freshBuyPrice = roundToPricePrecision(
        item[props.buyPriceField as string],
      );
      freshRows.push({ id: item.id, [props.buyPriceField as string]: freshBuyPrice });
      tasks.push(
        api.patch(
          `/items/${props.surchargesCollection}/${item.id}`,
          {
            [props.buyPriceField as string]: freshBuyPrice,
          },
          { params: { fields: ["id"] } },
        ),
      );
      if (item._trans_id) {
        tasks.push(
          api.patch(
            `/items/${props.translationsCollection}/${item._trans_id}`,
            {
              [props.sellPriceField as string]: roundToPricePrecision(
                item[props.sellPriceField as string],
              ),
            },
            { params: { fields: ["id"] } },
          ),
        );
      } else if (languageId.value) {
        tasks.push(
          api.post(
            `/items/${props.translationsCollection}`,
            {
              [tSurchargeField]: item.id,
              [tLanguageField]: languageId.value,
              [props.sellPriceField as string]: roundToPricePrecision(
                item[props.sellPriceField as string],
              ),
            },
            { params: { fields: ["id"] } },
          ),
        );
      }
    }
    await Promise.all(tasks);
    return freshRows;
  };

  const calculateAndSave = async () => {
    const missing = calculateRequiredFields();
    if (missing.length) {
      errorMessage.value = missingConfigMessage(missing);
      return;
    }

    calculating.value = true;
    errorMessage.value = "";
    try {
      if (items.value.some((i: DirectusItem) => i._dirty)) await saveChanges();

      const compiled = compileCalculator(
        props.roundHalfLogic as string,
        props.calculateSellPriceLogic as string,
      );
      if (compiled.error) throw new Error(compiled.error);
      const { calculateSellPrice } = compiled;

      const tSurchargeField = props.translationsSurchargeField as string;
      const tLanguageField = props.translationsLanguageField as string;

      /*
       * Formerly a single call to a dedicated
       * `/surcharge-calculator/calculate` backend route. That endpoint's
       * only real job was fetching this same data and running this same
       * formula server-side; both are ordinary, already-authenticated
       * Directus `items` reads and the formula is just as safe to
       * execute here (see `compileCalculator` above), so the round trip
       * through a bespoke endpoint added no capability this component
       * didn't already have direct access to.
       *
       * The junction/settings rows come first — their configured exchange
       * rates determine which rate records the loop can possibly touch —
       * so the rates request can be scoped to exactly those keys (`_in`)
       * and only their `rate` value. Surcharges come from `items.value`
       * (just synced by `saveChanges` above) rather than a redundant
       * re-fetch of the surcharges collection.
       */
      const settingsRows = await api
        .get(`/items/${props.collection}`, {
          params: {
            filter: { [props.junctionParentField as string]: { _eq: parentId.value } },
            fields: ["*"],
            limit: -1,
          },
        })
        .then((r) => r.data.data || []);

      const usedRateKeys = Array.from(
        new Set(
          settingsRows
            .map((s: DirectusItem) => s[props.exchangeRateField as string]?.key)
            .filter((k: unknown) => !!k),
        ),
      );

      const [surcharges, rates, existingTranslations] = await Promise.all([
        Promise.resolve(items.value),
        usedRateKeys.length
          ? api
              .get(`/items/${props.ratesCollection}`, {
                params: {
                  filter: { id: { _in: usedRateKeys } },
                  fields: ["id", "rate"],
                  limit: -1,
                },
              })
              .then((r) => r.data.data || [])
          : Promise.resolve([]),
        api.get(`/items/${props.translationsCollection}`, {
          params: {
            filter: {
              [tSurchargeField]: {
                [props.parentField as string]: { _eq: parentId.value },
              },
            },
            fields: ["id", tSurchargeField, tLanguageField, props.sellPriceField],
            limit: -1,
          },
        }).then((r) => r.data.data || []),
      ]);

      const rateById = new Map<string, DirectusItem>(rates.map((r: DirectusItem) => [r.id, r]));
      const translationByKey = new Map<string, DirectusItem>(
        existingTranslations.map((t: DirectusItem) => [
          `${t[tSurchargeField]}|${t[tLanguageField]}`,
          t,
        ]),
      );

      const translationUpdates: { id: string | number; [key: string]: any }[] = [];
      const translationCreates: DirectusItem[] = [];
      let formulaErrorCount = 0;

      /*
       * Core pricing loop: for every language configuration (each with
       * its own margin/rate), compute a localized sell price for every
       * surcharge — identical logic to the retired server endpoint.
       */
      settingsRows.forEach((settingsRow: DirectusItem) => {
        const langId = settingsRow[props.junctionLanguageField as string];
        if (!langId) return;

        const exchangeRateInfo = settingsRow[props.exchangeRateField as string];
        const rateRecord =
          exchangeRateInfo && exchangeRateInfo.key
            ? rateById.get(exchangeRateInfo.key)
            : undefined;
        if (!rateRecord) return;
        const rateValue = parseFloat(rateRecord.rate);

        surcharges.forEach((surcharge: DirectusItem) => {
          let sellPrice = null;
          const buyRaw = surcharge[props.buyPriceField as string];
          const buyIsZero =
            buyRaw === null ||
            buyRaw === undefined ||
            buyRaw === "" ||
            Number(buyRaw) === 0;
          if (buyIsZero) {
            // Zero buy price never goes through the formula — the sell
            // price is 0 outright (both speed and a hard invariant that
            // zero-buy surcharges can never pick up a stray value).
            sellPrice = 0;
          } else {
            try {
              const result = calculateSellPrice(
                buyRaw,
                settingsRow,
                surcharge,
                rateValue,
              );
              if (result === null || Number.isFinite(result)) {
                sellPrice = roundToPricePrecision(result);
              }
            } catch (calcErr) {
              console.error(
                "[SurchargePrices] Formula threw for surcharge",
                surcharge.id,
                calcErr,
              );
              formulaErrorCount += 1;
            }
          }

          const key = `${surcharge.id}|${langId}`;
          const existing = translationByKey.get(key);
          if (existing) {
            /*
             * Skip no-op updates: most surcharges recompute to the same
             * sell price already stored. Writing those back bloats the
             * bulk-PATCH payload and (since `updateBatch` applies each row
             * sequentially inside one transaction) is exactly what makes
             * the whole request slow. Only rows whose stored sell price
             * actually differs need to be sent.
             */
            const current = existing[props.sellPriceField as string];
            const currentNum =
              current === null || current === undefined || current === ""
                ? null
                : Number(current);
            const unchanged =
              sellPrice === null || sellPrice === undefined
                ? currentNum === null
                : currentNum !== null && currentNum === sellPrice;
            if (!unchanged) {
              translationUpdates.push({
                id: existing.id,
                [props.sellPriceField as string]: sellPrice,
              });
            }
          } else {
            translationCreates.push({
              [tSurchargeField]: surcharge.id,
              [tLanguageField]: langId,
              [props.sellPriceField as string]: sellPrice,
            });
          }
        });
      });

      /*
       * Batch the writes: Directus's `PATCH /items/{collection}` accepts an
       * array body of `{id, ...fields}` objects and updates each record in
       * one request, so every changed translation collapses into a single
       * call. Creates remain a single bulk POST. The two are independent
       * (different records), so they fire together in one `Promise.all`
       * instead of two sequential waits.
       */
      await Promise.all([
        translationUpdates.length
          ? api.patch(
              `/items/${props.translationsCollection}`,
              translationUpdates,
              { params: { fields: ["id"] } },
            )
          : Promise.resolve(),
        translationCreates.length
          ? api.post(
              `/items/${props.translationsCollection}`,
              translationCreates,
              { params: { fields: ["id"] } },
            )
          : Promise.resolve(),
      ]);

      /*
       * Only sell prices changed — the surcharges themselves didn't, so
       * there's no need to re-fetch the whole surcharge collection (a
       * full `loadData` also re-ran the orphan-translation cleanup and a
       * second translations read). The only thing the table needs
       * refreshed is the sell price for the currently displayed language,
       * so merge just that from a single translations request scoped to
       * the rows already on screen.
       */
      const sIds = items.value.map((i: DirectusItem) => i.id);
      const translationBySurcharge = new Map<string, DirectusItem>();
      if (sIds.length > 0 && languageId.value) {
        const { data: tRes } = await api.get(
          `/items/${props.translationsCollection}`,
          {
            params: {
              filter: {
                _and: [
                  { [tSurchargeField]: { _in: sIds } },
                  { [tLanguageField]: { _eq: languageId.value } },
                ],
              },
              fields: ["id", tSurchargeField, props.sellPriceField],
              limit: -1,
            },
          },
        );
        tRes.data.forEach((t: DirectusItem) => {
          translationBySurcharge.set(t[tSurchargeField], t);
        });
      }
      items.value.forEach((item: DirectusItem) => {
        const t = translationBySurcharge.get(item.id);
        item[props.sellPriceField as string] =
          t?.[props.sellPriceField as string] ?? null;
        item._trans_id = t?.id ?? null;
        item._dirty = false;
        item._buyDirty = false;
      });
      originalItems.value = JSON.parse(JSON.stringify(items.value));
      hasBuyChanges.value = false;
      if (formulaErrorCount > 0) {
        errorMessage.value = `Calculate Sell Price Logic threw an error for ${formulaErrorCount} surcharge(s) — see the browser console for details.`;
      }
    } catch (err: any) {
      console.error("[SurchargePrices] calculateAndSave error:", err);
      errorMessage.value =
        err?.response?.data?.error ||
        err?.response?.data?.errors?.[0]?.message ||
        err?.message ||
        "Failed to calculate sell prices.";
    } finally {
      calculating.value = false;
    }
  };

  return {
    resolveContext,
    fetchCurrencySymbols,
    loadData,
    saveChanges,
    calculateAndSave,
  };
}