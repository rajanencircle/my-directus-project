# BOTG ContentHub — Schema Build Spec

Version 1.5 · 25-06-26 · EN

> v1.5: §3 — added **§3.1 relational display & translated values** (translated-name templates `{{<rel_fk>.translations.name}}`; *when a picker renders wrong values, fix the target lookup's translations, not the consuming field* — the Continents/Countries finding) and **§3.2 deriving field configuration from a working reference** (port `interface`+`options`, adapt field names, labels always from Excel, don't blindly port legacy-bound custom interfaces). Consolidates the two parallel v1.4 drafts (this branch's §8.7 packaging + the §3 relational learnings).
>
> v1.4: §8 — added **packaging rules** (§8.7) learned from the first Tours/Excursions staging deploy: define folder/group collections first; keep groups self-contained (no cross-product `group:`); `schema: null` for folder collections; 2-space list indentation; test on a local mirror with `--dry-run` first.
> v1.1: §3 Supplementary → translatable JSON-repeater column in the relevant `_translations` table (was O2M sub-collection); added controlled-name-list (`_names` lookup) vs. self-contained guidance.
>
> v1.2: §4 **mandatory DE/EN/NL labels** on every user-facing field — a YAML is never emitted with an unlabeled user-facing field; §5 strikethrough (kill) rows must be excluded and purged; §9 added label-coverage and no-killed-field pre-emit checks.
>
> v1.3: §4 added the **brief column map**, the **mandatory `note` (column I → `meta.note`)** rule and the **ambiguous-cell resolution** rule (align to the reference products); §5 strikethrough detection covers rows with a **blank key cell**; §9 added the **note-coverage** pre-emit check.

**Purpose.** This document defines the *generation and structural rules* applied when turning a per-product DEV brief (the Excel sheet) plus the two existing standards — **Naming Conventions** (`BOTG_ContentHub_Namenskonventionen`, field/collection keys) and **Navigation** (`BOTG_ContentHub_Navigation_EN`, nav hierarchy) — into a deployable Directus `schema apply` YAML.

It is the **fourth input** to YAML generation. Naming and Navigation cover *what things are called* and *where they sit in the menu*; this spec covers *how the schema is typed, related, completed, healed, and deployed*. Where this spec and the Naming Conventions overlap (data types, translation collections), the Naming Conventions own the **key/label** and this spec owns the **type/relation/structure**; cross-references are noted.

Scope: all products (hotels, excursions, tours, cruises, rentals). Product-specific open questions are resolved in a per-product clarification phase, not here.

---

## 1. Primary key & foreign key types

**Rule.** Every product-owned collection — the product collection itself and all its `<product>_*` sub-collections, repeaters, translation companions and junctions — uses an **`integer` auto-increment** primary key. A foreign key's type **equals the primary-key type of its target collection**.

**uuid is used only for FKs whose target has a uuid PK.** In the current platform these uuid-PK targets are:

`translations`, `directus_files`, `directus_users`, `booking_partners`, `partner`, `travel_categories`, `trips_frequencies`, `mobility_advice_text`.

**Integer-PK shared lookups** referenced by products: `places`, `countries`, `states`, `seasons`, `destinations`, `locations_tour32` (and all product-owned collections).

**Consequences.**
- Never blanket-type FKs as uuid. A uuid FK onto an integer PK fails `schema apply` with Postgres error `42804` (type mismatch).
- Legacy uuid PKs inherited from the Primarix dump (e.g. the old `daytrips`, `daytrips_categories`, `daytrips_room_occupancies`) **must be converted to integer auto-increment** when migrated into a new product, and every FK pointing at them re-typed to integer.
- Shared master-data lookups that already carry a uuid PK (`travel_categories`, `trips_frequencies`, `booking_partners`, `partner`, `mobility_advice_text`) keep uuid — they are referenced by uuid FKs across multiple products; converting them would break those products.
- `user_created` / `user_updated` are uuid (→ `directus_users`).

This corrects the over-general statement in Naming Conventions §4.5 ("M2O FK = integer throughout"): integer is the **default**, but the uuid-target list above takes precedence.

---

## 2. Translation patterns

Two patterns exist in the platform; pick deliberately.

**Central pattern (dominant — ~44 of 47 translation collections). Use for all new product translation collections.**
`<collection>_translations` carries:
- `<collection>_id` — integer FK to the parent (on_delete `CASCADE`);
- `translations_id` — **uuid** FK to the central `translations` table;
- the translatable fields themselves.

**Direct-languages pattern (minority — e.g. `travel_categories_translations`).** Uses `languages_code` (string → `languages.code`) instead of `translations_id`. **Retain only where it already exists; do not introduce it for new collections.**

**Other rules.**
- Multiple translation companions on one collection are **theme-qualified**, never numbered (`…_translations_1` is forbidden) — see Naming Conventions §2 C5.
- Translatable fields are declared in the brief via the *Translatable?* column; non-translatable text stays on the parent collection.

---

## 3. Relation modelling — O2M vs M2M vs JSON

Decision guide for repeating / linked data:

| Shape | Use when | Examples |
|---|---|---|
| **O2M sub-collection** (`<product>_<thing>` with `<product>_id` FK + `one_field` on the parent) | repeating structured records that need their own translatable text, are referenced by other collections, or require FK integrity | `*_price_periods`, `*_prices`, `*_surcharges`, the per-product categories repeater, `*_description_supplementary`, `*_price_info_supplementary` |
| **M2M junction** (`<a>_<b>`, both plural) | many-to-many links to **shared lookups** | `*_directus_files` (media), `*_travel_categories`, `*_countries`, `*_partner` |
| **JSON repeater** (`json` field, `cast-json` special, `list` interface, full width) | repeating data that is **not** referenced elsewhere and needs no FK integrity | `routes`, `departures` |

**JSON trade-off (explicit).** Lookup references inside a JSON repeater (e.g. `places`, `trips_frequencies` inside `departures`/`routes`) are stored as plain IDs — **no FK enforcement, no cascade, no referential integrity**. Choose JSON only when that is acceptable; otherwise model as O2M/M2M.

**Supplementary blocks** (`description_supplementary`, `price_info_supplementary`) are modelled as a **translatable JSON repeater column inside the relevant `_translations` table** (`description_supplementary` → `*_description_translations`, `price_info_supplementary` → `*_price_info_translations`) — one JSON row per language, fields `headline`/`text` — **not** as separate sub-collections. Per-language content is preserved while avoiding extra collections; trade-off: individual blocks are not relationally queryable (acceptable for descriptive text).

**Controlled, reused name lists** (e.g. price-tier names, occupancy names) → a shared `_names` lookup (`<entity>_price_categories_names`, `<entity>_occupancies_names`; singular prefix) referenced by an M2O. Free per-record text (e.g. supplier product categories) stays **self-contained** on the child collection — no lookup.

### 3.1 Relational display & translated values

A relation field whose target is a **translatable lookup** must render the translated name, not the raw id:

- Set the interface `options.template` to the target's translated name *via the relation field*, e.g. `{{destinations_id.translations.name}}`, `{{countries_id.translations.name}}`, `{{cruises_types_id.translations.name}}`. Mirror it in `display: related-values` with the same template for the read/list view. Use `enableCreate: false` on lookups that are picked, not created inline.
- **When a picker renders the wrong values, fix the lookup — not the consuming field.** Two relation fields can carry identical config and still render differently. In the cruises DEV build, `destinations` ("Continents") and `countries` had the *same* `{{…_id.translations.name}}` template, yet Countries showed wrong/duplicated values while Continents was correct. The cause was the **target lookup's own translation setup** — its `_translations` companion and the `translations` relation/alias on the lookup — not the consuming field. So when translated values don't appear, audit the lookup's translations, not just the field that points at it.

### 3.2 Deriving field configuration from a working reference

Where a field's behaviour (choices, min/max, relational template, custom interface + options) already works in another product or a DEV/staging build, **port that `meta.interface` + `meta.options`** rather than re-deriving — but **adapt field references to this snapshot's names** (e.g. DEV `cruise_types.label` → this build's `cruises_types.translations.name`; DEV `cruise_id` → `cruises_id`). **Labels always come from the Excel brief (cols F/G/H), never from the reference JSON** (see §4). Custom interfaces bound to a legacy field shape (e.g. a `cruise-prices-table` / `occupancy-selector` that expects `price_start` / `sell_price` / `value`) are **not** ported blindly — flag the field-shape mismatch as a model-alignment decision instead of silently wiring options that point at fields this model doesn't have. (`status_primarix` choices: see §4.)

---

## 4. Hidden standards (applied even when absent from the brief)

These layout/technical fields are added on every product unless explicitly excluded.

**Reading the brief (column map).** Each product sheet uses a fixed column layout (header in row 7). The generator reads:

| Col | Meaning | Becomes in the YAML |
|---|---|---|
| A | Special field-type marker: `Above Tabs`, `Tab`, `Block`, `Section (open/closed)`, `Builder (layer right side)`, `COMMENT`, `Field hidden`, `Tab-Navigation` | layout role — `Tab`→`tab_*` (group-raw); `Block`→`block_*` (group-raw); `Section`→`section_*` (group-detail, `collapse` open/closed); `Builder`→a JSON repeater / calculator sub-collection (named by the following `COMMENT` row + its `E` target); `Above Tabs`→`group: null` alias; `Field hidden`→`hidden: true`; `COMMENT` / `Tab-Navigation`→not a field |
| B | `field_key` (Directus) — **may be blank** on Builder/COMMENT rows and even on a struck field row | field key |
| C | `data_type` | column type |
| D | `interface` | `meta.interface` |
| E | Relation (Sub-Collection) / lookup target | M2O / M2M target, or the owning sub-collection |
| F / G / H | Label DE / GB / NL | `meta.translations` (de-DE / en-GB / nl-NL) — see *Labels* below |
| I | **Info-Text (below the field)** | **`meta.note`** — see *Help texts* below |
| K | Translatable? (Yes / No) | routes the field into the `L`-named `_translations` collection |
| L | Naming Translation-Collection | target `_translations` collection |
| N | `fieldid Primarix` | provenance only (migration crosswalk); not built |

`-` / `—` / blank in a label or info cell means *intentionally none*.

**Help texts (notes) are mandatory.** Every field carrying an Info-Text in **column I** receives that text as `meta.note` (shown below the field in the editor). Set it even on hidden fields where the I-text is a genuine description (e.g. `price_subline` → "Import only — hidden in UI."). **Exempt only** the above-tabs presentation/sync aliases — `header`, `item_preview_button`, `sell_prices_status`, `sell_prices_updated_at` — whose column-I text is a build annotation, not editor help. Reference implementation: **excursions**, which additionally carries a few hand-authored calculator notes (e.g. `*_from` → "Mark this … as the starting price reference for the calculation.").

**Ambiguous / conflicting brief cells.** Where the type/interface cells (C/D) are malformed or contradict each other (e.g. cruises `status_primarix` with C=`integer` / D=`string`; `participants_min` with D=`text area`), do **not** take the cell at face value — resolve by aligning to the decision already taken for the **same field** in the reference products (hotels → excursions → tours). Worked examples: `status_primarix` = `string` / `select-dropdown`; `participants_min` = `integer` / `input`.


- **`header`** — alias, interface `header`, placed above the tabs (`group: null`). Options `title = {{name}}`, `subtitle = {{object_id}} - {{season.season}}`. Condition *"Hide on create"* (`id` is null → hidden).
- **`item_preview_button`** — alias, interface `item-preview-button`, above the tabs.
- **Sync fields** (above tabs, hidden): `sell_prices_status` (`string`) and `sell_prices_updated_at` (`timestamp`) — track the async sell-price calculation state.
- **`save_and_stay` triggers** — alias `save-and-stay-trigger-flow` inside the calculation sections (`save_stay_<product>`, `save_stay_surcharge`).
- **Geo cascade** — `place` / `state` / `country` / `location_tour32` use the `cascading-individual-select` interface (M2O, integer).
- **`status_primarix` config** — default `draft`; choices: `Published` (value `published`, no colour/icon) and `Draft` (value `draft`, colour `#2ECDA7`, icon `circle`).
- **Field width** — default Half; Full only for Textarea, WYSIWYG, Repeater, Gallery.
- **Meta row** — Object-ID chip + Season chip + Status pill; Object-ID / Last Update / by are hidden inside the form.

- **Labels are mandatory (non-negotiable).** Every user-facing field — including the `tab_*` / `section_*` / `block_*` layout groups and every lookup value field (`name`, `iata_code`, …) — **must** carry `meta.translations` for **de-DE / en-GB / nl-NL**, taken from the brief's Label columns (F/G/H). Generic value fields with no brief label get a sensible default (`name` → "Name / Name / Naam"). **System / hidden fields are exempt**: `id`, `sort`, `status`, `*_id` FKs, `user_created/updated`, `date_created/updated`, `*_at`, `object_id`, `*_primarix`, `*_tour32`, `code`, and any field flagged `hidden`. **A YAML is never emitted while any non-exempt field lacks a label** (verified in §9).

For the source field configurations (interface, options, conditions), mirror the equivalent field on the **hotels** collection, which is the reference implementation.

---

## 5. Artefact drops & legacy mapping

When migrating a product from a legacy Primarix family, the inherited subgraph must be **healed** before emit:

- **Drop double-prefix junction artefacts** — `<x>_<x>_…` (e.g. `daytrips_daytrips_room_occupancies`).
- **Drop struck-through (kill) rows** — any field row in **strikethrough font** in the brief is *kill / not imported*. Exclude it from the build, and **purge any that slipped into an existing YAML** (e.g. excursions `brox_*`, `price_sample_*`). The same applies to fields no longer present in the current brief that are German-named legacy artefacts (`touren_*`). Strikethrough may sit on a row whose **key cell (B) is blank** — the field is then identified only by its labels (F/G/H) and its C/E cells; the kill-detector must inspect the **font of the row regardless of whether B holds a value** (e.g. cruises `departure_number`, struck with an empty B cell, must still be excluded).
- **Drop cross-product contamination** — relations and stray fields pointing at the *other* product of an entangled family (the daytrips↔tours entanglement: `tour_id` on a daytrips child, `tours_*` relations on shared sub-collections).
- **Drop bogus relations** — dropdown value sets mis-modelled as M2O to non-existent collections (`mandatory`, `calculation_method`). Keep the field as a dropdown; remove the relation.
- **Heal dangling group references** — a field whose `group` points to a removed layout field is reset to `null`.

**Primarix origin notes.**
- The legacy `tours` collection actually holds *day-trip* data → it became **`excursions`**. The **new `tours`** (Rundreisen) is built fresh from the Primarix **`trips`** source, not from the legacy `tours`.
- `studytrips` folds into `tours` via a `tour_type` discriminator.
- The Primarix `/full` dump remains the legacy format consumed by downstream import jobs; legacy field names are coupling points for consumers migrating to the new API.

---

## 6. Navigation meta application

Applies the hierarchy defined in `BOTG_ContentHub_Navigation_EN`. Per generated product:

- **Product collection** — `hidden: false`, `group: null` (Tier-1, top-level), product icon + colour `#0DA4DE`.
- **Shared `<family>_meta` folder** — a collection with `schema: null` (no table). Groups the family's master-data lookups (e.g. `trips_meta` for tours + excursions: `*_category` lookups, `travel_categories`, `trips_frequencies`). **Defined exactly once** in the first product schema that ships it; later products only *reference* it via `group`, never redefine it.
- **Master-data lookups** (singular `*_category` lookup, `travel_categories`, `trips_frequencies`) — `hidden: false`, `group: <family>_meta`.
- **All `<product>_*` sub-collections, translation companions and junctions** — `hidden: true`.

---

## 7. API / transformer coordination

- New schema fields do **not** automatically surface in the ContentHub API. The Directus transformer layer is **default-deny** (intentional).
- Exposing a field requires a separate API-field-request step plus the monthly consumer sync; consumer-facing additions must be documented for the API owners (Caravane / Cruising etc.).
- The `audience` flag in the API control plane is security-relevant — a misconfigured value is a potential data-exposure vector. Default-deny enforcement is required.

---

## 8. Deploy procedure (staging → production)

**Prerequisites.** The external collections the snapshot *references but does not define* must already exist on the target environment. Derive the list per product from the snapshot's relations (e.g. excursions: `directus_users`, `directus_files`, `translations`, `booking_partners`, `partner`, `mobility_advice_text`, `places`, `countries`, `states`, `seasons`, `destinations`, `locations_tour32`).

1. **Back up** the current schema: `npx directus schema snapshot ./backup-<env>-<date>.yaml`.
2. **Delete shared lookups** on the target *first* if the snapshot redefines them (e.g. `travel_categories`, `travel_categories_translations`, `trips_frequencies`). Note the cascade: deleting a shared lookup drops FK relations to it from other collections on that environment.
3. **Dry-run review** (applies nothing): `npx directus schema apply --dry-run ./<product>_schema_<date>.yaml`. Confirm collection counts, no unexpected drops, version/vendor match.
4. **Apply**: `npx directus schema apply ./<product>_schema_<date>.yaml` (interactive confirmation; add `--yes` only for CI).
5. **Validate**: integer PKs on product-owned collections; nav placement (product top-level, lookups under `<family>_meta`); relations resolve; open an item and confirm tabs/blocks/sections, `header`, `item_preview_button`, JSON repeaters and M2O fields render.
6. **Production** only after staging validation passes.

**8.7 Packaging rules (Directus import-safety).** Learned from the first Tours/Excursions staging deploy; apply to every YAML:

1. **Define folder/group collections first.** If a collection carries `group: X`, then `X` must appear *earlier in the same YAML* or already exist on the target. Never assume it is there. (Worked failures: `day_trips`, `trips_meta` referenced as a group but never defined → Directus "cannot read fields" crash.)
2. **Keep groups self-contained.** Never reference another product's folder (e.g. never `group: tours` inside the excursions YAML). If the parent folder is not part of this YAML, use `group: null` (re-parent later if needed).
3. **`schema: null` for folder collections.** Any collection that is only a UI grouping folder (not a real table) must carry `schema: null`; otherwise Directus tries to create an actual table for it.
4. **2-space indentation for all list items** (`  - collection:`). Directus' import tooling is indent-sensitive; 0-space list items cause *silent* parse failures across some import paths.
5. **Test on a local mirror first.** Clone the target, run `--dry-run` locally, and only then touch staging — this catches the structural issues above at zero risk. For YAMLs that contain deletions, confirm the dry-run shows *exactly* the intended drops and nothing else. The validated safe apply path is "merge current schema + product YAML into one combined file, then apply."

> Note on `group` scope: these rules concern the **collection-level** `group` (data-model folders). The **field-level** `meta.group` (form sections) follows the same define-before-reference principle within a collection, and section/alias fields likewise carry `schema: null`.

---

## 9. Internal integrity checks (pre-emit)

The generator must pass these before writing the YAML (zero findings):
- no duplicate field keys within a collection;
- no field whose `group` references a non-existent layout field;
- every relation's `collection` is defined; every `related_collection` is defined or a known external collection;
- every relation's `field` exists on its collection;
- FK field type equals the target collection's PK type.
- **label coverage** — every non-exempt (user-facing, non-hidden) field carries `meta.translations` for de-DE/en-GB/nl-NL; zero unlabeled user-facing fields;
- **no killed fields** — no field corresponding to a strikethrough brief row remains in the YAML.
- **note coverage** — every brief row carrying an Info-Text (column I) is reflected as a field `note`, the four above-tabs presentation/sync aliases excepted.
