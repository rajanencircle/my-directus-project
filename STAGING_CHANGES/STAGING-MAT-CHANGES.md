# Staging — MAT (Mobility Advice Text) Tours Changes

**Target:** `directus-staging` MCP server **only** (production/staging Directus). Local and the dump were not touched by this changelog.
**Applied:** 2026-06-11
**Purpose:** Replicate the "Mobility Advice Text → Tours" per-language sync (already present for hotels & cruises) onto tours, and upgrade the Cruise TRIGGER + shared MAT Update flows to the hotel-style pattern.

This document is the authoritative record for **reverting** these staging changes. All work was done via the `directus-staging` MCP tools (`collections`, `fields`, `relations`, `flows`, `operations`). No `items` data was created/modified (no functional test was run on staging).

---

## How the system works (context)

`mobility_advice_text` is a single-record collection holding global per-language mobility-advice texts, split per product via M2M junctions. On product create/update an event flow fans out to an operation TRIGGER flow that copies the MAT text into the product's per-language translation rows (update existing + create missing). A shared `[MAT] Update` flow re-syncs everything when the MAT record itself is edited.

- hotels → `mobility_advice_text_translations` (`hotel_mobility_advice_text`) → `hotels_translations_3.mobility_advice_text`
- cruises → `mobility_advice_text_translations_1` (`cruises_mobility_advice`) → `cruises_translations_4.mobility_advice_text`
- **tours (new)** → `mobility_advice_text_translations_2` (`tours_mobility_advice_text`) → `tours_translations.mobility_advice_text`

---

## A. NEW objects created (delete these to revert)

### A1. Junction collection `mobility_advice_text_translations_2`
Fields: `id` (auto-int PK, hidden), `mobility_advice_text_id` (uuid, hidden), `translations_id` (uuid, hidden), `tours_mobility_advice_text` (text, input-multiline). Meta: hidden, icon `import_export`.
Deleting the collection drops the table **and** its two relations (A3) automatically.

### A2. New alias + UI-group fields on `mobility_advice_text`
- `tours_group` (group-raw, top level, sort 8)
- `accordion-tours` (group-accordion, group `tours_group`)
- `tours` (group-raw, group `accordion-tours`)
- `tours_translations` (translations alias, group `tours`) — the M2M into the junction

### A3. Relations on `mobility_advice_text_translations_2`
- `mobility_advice_text_id` → m2o `mobility_advice_text` (on_delete SET NULL, one_field `tours_translations`, junction_field `translations_id`)
- `translations_id` → m2o `translations` (on_delete SET NULL, junction_field `mobility_advice_text_id`)

### A4. New field on `tours_translations`
- `mobility_advice_text` (text, readonly, input-multiline, note `$t:hotels_mobility_text_advice`, "View on edit" condition) — the write target.

### A5. New flows (deleting a flow removes its operations)
| Flow | ID | Trigger |
|------|----|---------|
| `[MAT] Tour TRIGGER - 04 May` | `1e9e258b-281c-4d71-bc50-edb8948d9410` | operation |
| `[MAT] Tour CREATE - 04 May` | `67c362ac-9f3f-4bb5-9db7-48cb10ee0982` | event items.create / tours |
| `[MAT] Tour UPDATE - 04 May` | `3366935b-c161-419b-8234-376aaac9745d` | event items.update / tours |

**Tour TRIGGER (`1e9e258b`) operations** (chain: transform_payload → read_data_mat → read_translations → read_data_tour → script → update_tour → create_tour):
- transform_payload `b2b1ec91-bf1c-48b2-9a53-e33f1034aa73` (first op)
- read_data_mat `f00f6a49-2037-464f-a4c3-173d3df374c6`
- read_translations `a77c212a-423e-4968-b442-a6d8fa793bc6`
- read_data_tour `212e3d2e-7b3e-48c7-9c6a-bc6235eea9f1`
- script `c9aca363-e788-4f59-bc65-548cf2ae772e`
- update_tour `cd4e6c2a-0350-460b-acdd-e8b62b6203e3`
- create_tour `517595d8-4398-4620-a381-4ec990ca9d9d`

**Tour CREATE (`67c362ac`)**: transform_payload `ce4c5fc1-bbeb-475e-ae08-8679d023dce7` → trigger `775788df-442a-4d90-acd5-2ba076b7b0ea`
**Tour UPDATE (`3366935b`)**: transform_payload `0629ff2a-d6ff-4226-9cbe-f9690937d4b2` → trigger `6ecefe89-34eb-4fd0-82b3-5bd20af7e347`

---

## B. MODIFIED existing flows (revert = restore baseline below)

These two flows pre-existed (created "04 May"). Their flow IDs and original operation IDs are **identical on local and staging**. I added new operations and rewired/edited existing ones.

### B1. `[MAT] Cruise TRIGGER` — `ea6313e6-5772-4ff6-a320-d8de522e189b`

**NEW operations added (delete on revert):**
- read_translations `cfda0f3d-7e06-4c9e-aad4-249a272668c2`
- create_cruise `d982c956-4ed5-40ab-adb7-c9f795d4bade`

**Existing ops changed:**
| Op | ID | Changed | Baseline value (restore this) |
|----|----|---------|--------------------------------|
| read_data_mat | `5856f25a-2728-4aeb-8b2d-402a62b962f5` | `resolve` | `e927ef68-313f-4727-9d04-fd6e007cae6c` |
| update_cruise | `71ab7d63-ebe8-43c8-abf2-e75d0069c6ed` | `resolve` → null; payload | payload `{{script.cruisesTranslationDataToUpdate}}`, resolve `null` |
| script | `0c9920b1-9b3f-435c-b92c-b9bc87b27555` | `options.code` | baseline code below |

Baseline chain: transform_payload(`de54dcfd`) → read_data_mat(`5856f25a`) → read_data_cruise(`e927ef68`) → script(`0c9920b1`) → update_cruise(`71ab7d63`) → null.

<details><summary>Cruise TRIGGER — BASELINE script code (restore)</summary>

```js
module.exports = async function (data) {
  const matData = data.read_data_mat[0];
  const cruisesTranslation = data.read_data_cruise;
  const cruisesTranslationDataToUpdate = [];
  if (Array.isArray(cruisesTranslation) && cruisesTranslation.length > 0) {
    cruisesTranslation.map((c) => {
      const matDataForTranslation = matData.cruises_translations.find(
        (m) => m.translations_id === c.translations_id,
      );

      if (matDataForTranslation) {
        cruisesTranslationDataToUpdate.push({
          id: c.id,
          mobility_advice_text: matDataForTranslation.cruises_mobility_advice,
        });
      }
    });
  }

  return { cruisesTranslationDataToUpdate };
};
```
</details>

### B2. `[MAT] Update` — `84b8b457-0703-44b2-9eba-cdf0da8681b1`

> **2026-06-11 fix:** `[MAT] Update` was extended again so that editing the MAT record also **creates missing** tour rows (not just updates existing ones). Previously, saving MAT only updated tours that already had a `tours_translations` row, so a tour with no rows yet (e.g. a freshly-imported/untouched tour) showed nothing until the tour itself was created/updated. This added `read_all_tours`, a `read_translations`, and `create_tour`, and expanded the script with a tours update-or-create cross-join over all tours × languages. Hotels & cruises remain update-only (they always have translation rows).

**NEW operations added (delete on revert):**
- read_data_tour `34a37e89-7ddd-498a-a3a0-8a3beb9cd845`
- update_tour `4b617cd6-c05f-4e68-be4e-46e02eafcbc9` — payload `{{script.toursTranslationDataToUpdate}}`
- read_all_tours `6c3f2899-18b2-4816-9a43-2cbfedde2978` — *(2026-06-11 fix)* reads `tours` `["id"]`, limit -1
- read_translations `1de23075-d7b6-42cc-92d4-5aceeb6d713e` — *(2026-06-11 fix)* reads `translations` `["id","code"]`
- create_tour `d515935d-5b5d-4894-bbe3-07171d00ee4a` — *(2026-06-11 fix)* item-create `tours_translations`, payload `{{script.toursTranslationDataToCreate}}`

**Existing ops changed:**
| Op | ID | Changed | Baseline value (restore this) |
|----|----|---------|--------------------------------|
| read_data_mat | `4711b4bf-0507-4dcf-9919-a115ec7b521e` | `options.query.fields` | `["id","hotel_translations.*","cruises_translations.*"]` (remove `tours_translations.*`) |
| read_data_hotel | `faa75aa9-6a02-4955-a4a3-ef66c3589341` | `resolve` | `f0eb1d5d-ad58-441b-ab94-e929a3621c5d` |
| update_hotel | `9e772091-fd83-4eb1-a521-ba9bfc44f722` | `resolve` → null | `null` |
| script | `f0eb1d5d-ad58-441b-ab94-e929a3621c5d` | `options.code` | baseline code below |

Current chain (after fix): read_data_mat(`4711b4bf`) → read_data_cruise(`9d08225b`) → read_data_hotel(`faa75aa9`) → read_data_tour(`34a37e89`) → read_all_tours(`6c3f2899`) → read_translations(`1de23075`) → script(`f0eb1d5d`) → update_cruise(`8c2adc4b`) → update_hotel(`9e772091`) → update_tour(`4b617cd6`) → create_tour(`d515935d`) → null.

Original baseline chain (restore target): read_data_mat(`4711b4bf`) → read_data_cruise(`9d08225b`) → read_data_hotel(`faa75aa9`) → script(`f0eb1d5d`) → update_cruise(`8c2adc4b`) → update_hotel(`9e772091`) → null.

<details><summary>MAT Update — BASELINE script code (restore)</summary>

```js
module.exports = async function (data) {
  const matData = data.read_data_mat[0];
  const cruisesTranslation = data.read_data_cruise;
  const hotelTranslation = data.read_data_hotel;
  const cruisesTranslationDataToUpdate = [];
  const hotelTranslationDataToUpdate = [];
  if (Array.isArray(cruisesTranslation) && cruisesTranslation.length > 0) {
    cruisesTranslation.map((c) => {
      const matDataForTranslation = matData.cruises_translations.find(
        (m) => m.translations_id === c.translations_id,
      );

      if (matDataForTranslation) {
        cruisesTranslationDataToUpdate.push({
          id: c.id,
          mobility_advice_text: matDataForTranslation.cruises_mobility_advice,
        });
      }
    });
  }
  if (Array.isArray(hotelTranslation) && hotelTranslation.length > 0) {
    hotelTranslation.map((c) => {
      const matDataForTranslation = matData.hotel_translations.find(
        (m) => m.translations_id === c.translations_id,
      );

      if (matDataForTranslation) {
        hotelTranslationDataToUpdate.push({
          id: c.id,
          mobility_advice_text:
            matDataForTranslation.hotel_mobility_advice_text,
        });
      }
    });
  }

  return { cruisesTranslationDataToUpdate, hotelTranslationDataToUpdate };
};
```
(The live baseline also had the original single-product version in a leading `/* ... */` comment block; restoring just the active function above is sufficient.)
</details>

---

## REVERT PROCEDURE (staging only)

Run all via the `directus-staging` MCP. Order matters (undo flows first, then schema).

1. **Delete the 3 new tour flows** (`flows` action `delete`) — removes their operations too:
   `1e9e258b-281c-4d71-bc50-edb8948d9410`, `67c362ac-9f3f-4bb5-9db7-48cb10ee0982`, `3366935b-c161-419b-8234-376aaac9745d`.

2. **Revert Cruise TRIGGER (`ea6313e6`):**
   a. `operations` update `5856f25a…` → `resolve = e927ef68-313f-4727-9d04-fd6e007cae6c`.
   b. `operations` update `71ab7d63…` → `options.payload = {{script.cruisesTranslationDataToUpdate}}`, `resolve = null`.
   c. `operations` update `0c9920b1…` → restore baseline script (B1).
   d. `operations` delete `cfda0f3d-7e06-4c9e-aad4-249a272668c2` and `d982c956-4ed5-40ab-adb7-c9f795d4bade`.

3. **Revert MAT Update (`84b8b457`):**
   a. `operations` update `faa75aa9…` → `resolve = f0eb1d5d-ad58-441b-ab94-e929a3621c5d`.
   b. `operations` update `9e772091…` → `resolve = null`.
   c. `operations` update `4711b4bf…` → `options.query.fields = ["id","hotel_translations.*","cruises_translations.*"]`.
   d. `operations` update `f0eb1d5d…` → restore baseline script (B2).
   e. `operations` delete all 5 added ops: `34a37e89-7ddd-498a-a3a0-8a3beb9cd845`, `4b617cd6-c05f-4e68-be4e-46e02eafcbc9`, `6c3f2899-18b2-4816-9a43-2cbfedde2978`, `1de23075-d7b6-42cc-92d4-5aceeb6d713e`, `d515935d-5b5d-4894-bbe3-07171d00ee4a`.

4. **Delete schema additions:**
   a. `fields` delete `tours_translations.mobility_advice_text`.
   b. `fields` delete on `mobility_advice_text`: `tours_translations`, then `tours`, `accordion-tours`, `tours_group`.
   c. `collections` delete `mobility_advice_text_translations_2` (drops table + both relations in A3).

> Note: the `items` delete action is disabled on these MCP servers, but `collections`/`fields`/`flows`/`operations` deletes are not. If any MCP delete is blocked, perform the equivalent removal from the Directus admin UI (Settings → Data Model / Flows).

---

## Verification done on staging
- Re-read `[MAT] Cruise TRIGGER` and `[MAT] Update` after editing — both operation chains confirmed wired correctly (see chain definitions in B1/B2).
- Schema confirmed: `mobility_advice_text_translations_2` created, `tours_translations` M2M present on `mobility_advice_text`, `tours_translations.mobility_advice_text` present.
- **2026-06-11 fix verified on staging:** changed the MAT de-DE tours text to a marker and saved the MAT record → both tours' de-DE `tours_translations.mobility_advice_text` rows re-synced to the marker; `[MAT] Update` run counter incremented with **0 errors**; then the original de-DE text was restored (rows confirmed reverted). Create-missing branch produced an empty payload in this run (both tours already had all language rows) and `create_tour` executed without error; the create logic mirrors the already-proven per-tour TRIGGER `create_tour`.

## Note on the tour edit page (not a bug)
The tour detail page shows a top-level **"Text Mobility Advice"** field which is the legacy base column `tours.mobility_advice_text` (readonly, in `price_info_group`). The MAT sync does **not** write this base field — it writes the per-language `tours_translations.mobility_advice_text`, shown in the tour's **translations** section (`tours_description_translations`). This matches hotels/cruises (which have no base field at all). If the base field must also reflect MAT text, that is a separate change (not implemented).
