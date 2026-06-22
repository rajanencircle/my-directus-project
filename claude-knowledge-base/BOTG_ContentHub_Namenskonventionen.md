# BOTG ContentHub – Naming Conventions for Collections and Fields

Version 1.3 · 18-06-26 · Basis: Schema analysis Staging (194 Collections) + decisions from the setup of `rental_companies` / `rental_depots` / `vehicles` (+ Camper sub-collections)

> Changes vs. v1.2: new grouping level **`block_`** (card block, group-raw without label) in §3; previous rule "No Raw-in-Raw / no Accordion" replaced by "one `tab_` + 0..n `block_` per tab"; CSS requirement (block_ renders the card, contained section_ lose their card) and migration note (Accordion → `block_`) added.
> Changes vs. v1.1: sort/order fields set to `_sort` (§4.3, not `_rank`).
> Changes vs. v1.0: new section **5 (Labels / Multilingual)**; new sections **4.5 (Data Types)** and **4.6 (all/selected pattern)**; clarified: §2 C4, §3, §4.3 (conditions, contact channels, Repeater, Media); updated decision points E1–E3.

## 1. Principles

1. **snake_case, consistently lowercase**, English, no umlauts.
2. **Written out rather than abbreviated** – no abbreviations like `px`, `ah`, `fk`, `nr`.
3. **No German** in keys (including hybrid forms like `haupt_id_…`).
4. **No auto-keys** left in place (`accordion-obvxyf`, `header-8onw1t`): groups and fields must be named immediately when created.
5. Field keys only need to be **unique within a collection** – identical names across collections (e.g. `ui_tabs`, `name`, `prices`) are explicitly intended.
6. Keys are cleaned up **before real data is loaded**; after that only in exceptional cases and via `schema apply`.

## 2. Collections

| Rule | Convention | Example |
|---|---|---|
| C1 | Multi-record collections in **plural** | `hotels`, `countries`, `hotel_groups`, `rental_companies` |
| C2 | Singletons in singular | `global_configuration` |
| C3 | Product-specific child tables: **product prefix in singular** + content in plural | `hotel_prices`, `tour_routes`, `cruise_price_dates` |
| C4 | Junctions (M2M): `a_b`, both sides plural, alphabetically a before b where there is no domain-specific direction. **Do not double a shared prefix.** | `hotels_accommodation_types`; `camper_specs_equipment` (not `camper_specs_camper_equipment`) |
| C5 | Translation tables: suffix `_translations` (never `_locale`); multiple fields may share a single translation collection | `hotels_translations`, `vehicles_translations` |
| C6 | Multi-word products with underscore | `round_trips`, `day_trips`, `study_trips` |
| C7 | Source/domain prefixes consistently singular | `erp_hotel_…`, `erp_round_trip_…` (not `erp_round_trips_…`) |
| C8 | Folders (namespaces in the navigation) also snake_case lowercase; folder key **never identical** to a collection key | `global_data`, `hotels_metadata` |

**Forbidden:** numbered junction duplicates (`…_translations_1`), double prefixes (`cruises_cruises_…`), generic names without context (`translations`, `mandatory`), demo leftovers in the production schema.

## 3. Layout Fields (Structural, No Data)

`ui_` for presentation fields and the tab container (`ui_header`, `ui_tabs`), `tab_` for tab wrappers (group-raw), `block_` for card blocks (group-raw, without label), `section_` for sections (group-detail).

**Structure (required nesting):** `ui_tabs > tab_* (group-raw) > [block_* (group-raw, optional)] > section_* (group-detail) > fields`. Exactly **one** `tab_` per tab; within it **0..n** `block_`. No nested `section_`, no nested details, no Accordion – card grouping is now handled by `block_`. The hierarchy is defined in the brief by column A (Tab Navigation / Tab / Section / empty = field) + key prefix + row order.

**`block_` – Card Block (new):** technically the same group-raw as `tab_`, hierarchically one level deeper. Groups **multiple** `section_` onto **one** white card and separates them from the next block.
- `block_` only when **≥ 2** `section_` are being grouped. A standalone `section_` sits directly under `tab_` (no empty `block_`, otherwise card-within-card or empty shell).
- `block_` carries **no label** – visible headings come exclusively from the contained `section_` (analogous to `tab_`, which also renders no label of its own).
- **CSS requirement:** `block_` renders the white card; the contained `section_` lose their own card (otherwise card-within-card; analogous to the existing exception "Raw group inside an Accordion loses its card"). A `section_` directly under `tab_` keeps its card.

**Canonical keys** (identical across all products, as they are only collection-internally unique):
- First tab `tab_master_data`; first section within it `section_publication` (Status & Publication).
- Further examples: `section_address`, `section_descriptions`, `tab_description`, `tab_calculator_inputs`, `tab_prices`, `tab_media`, `section_images`; card block e.g. `block_identity`.
- For ambiguous repetitions, add context: `section_price_units` vs. `section_surcharge_units`.

Flat lookup/junction collections (e.g. `camper_equipment`, `camper_specs_equipment`) may omit the tab layout – a single `section_*` is sufficient.

**Migration (current → target):** automatically named accordion groups (`accordion-obvxyf`, `accordion-cob52j`) already serve the `block_` function and are renamed to `block_*`; inconsistent tab wrappers (`master_data_group`, `reservation_main_group`) are renamed to `tab_*`. Key assignments must be verified with the team before renaming.

## 4. Data Fields

### 4.1 Product Name in Field Name

**Principle: no.** The field name describes the role of the value; context is provided by the collection. Within `vehicles` it is `title`/`name`, `equipment`, `category` – not `vehicle_title`. Within `rental_depots` it is `street`, `zip_code` – not `depot_street`.

**Two exceptions:**
- M2O fields whose role is the referenced entity itself: field name = singular of the target collection (`rental_company`, `hotel_group`).
- Fields that reference a **different** product (in which case the product is the necessary context).

### 4.2 Singular / Plural – Cardinality Decides

| Case | Rule | Example |
|---|---|---|
| M2O (exactly one reference) | **Singular** | `country`, `season`, `rental_company` |
| O2M / M2M / Files / Repeater (list) | **Plural** | `surcharges`, `depots_selected`, `media` |
| Scalar | Singular | `name`, `street`, `zip_code` |

### 4.3 Type and Topic Suffixes

| Topic | Convention | Example |
|---|---|---|
| Timestamp | Suffix `_at` | `sell_prices_updated_at` |
| Date only | Suffix `_date` | `image_badge_start_date` |
| Status/Enum | Suffix `_status` | `image_badge_status` |
| Sort / order | Suffix `_sort` (Directus standard sort field; **not** `_rank`) – `_rank` only for genuine domain ranking | `price_period_sort`, `rental_period_sort`, `media_sort` |
| Boolean | Prefix `is_` / `has_` / `use_` | `is_map`, `has_multi_rental_discount`, `use_tour32` |
| Source system reference | Source written out as suffix | `status_primarix`, `location_tour32`, `source_id_primarix` |
| Translations | Standard field `translations`; topic-specific `<topic>_translations` without product prefix | `price_infos_translations` |
| **Rental conditions** | Topic family `conditions_*`; `terms` remains permissible where contractually appropriate | `conditions_driver`, `conditions_calculation`, `conditions_oneway`; `deviating_cancellation_terms` |
| **Contact channels** | Base name without qualifier, as long as unique within the collection; for **multiple** channels of the same type, **all** must be qualified with a suffix (channel first) | `email` (single); `email_general` + `email_booking`, `phone_general` + `phone_after_hours` |
| **Media block** | Prefix `media_*` for block fields; flags as `is_`/`use_` | `media_filename_fotoweb`, `media_copyright`, `is_map`, `use_tour32` |
| **Repeater sub-fields** | Local keys from the label (never `-`); live in the repeater options | `headline`, `text` |
| FK fields in junctions | `<target_collection>_id` (Directus default) | `camper_specs_id`, `camper_equipment_id` |

### 4.4 Identifiers

`object_id` is the domain object ID of the ContentHub (set from Primarix). Additional foreign IDs follow `<role>_id_<source>` or `<role>_<source>`: `main_id_tour_user`, `source_id_primarix`. No more `id_<source>` pattern.

### 4.5 Data Types (new)

| Case | Type | Note |
|---|---|---|
| M2O foreign key | **`integer`** consistently | matching the integer PKs of the target collections |
| Exception `user_updated` | `uuid` | references `directus_users` (system collection) |
| Measurements / dimensions | `decimal` | `length_m`, `width_m`, `interior_height_m` |
| Counts / capacities / volumes | `integer` | `berths_adults`, `fuel_tank_l`, `persons_max` |
| `status_primarix` | `string` + `dropdown` (not M2O) | source is `freigabe` (0/1), no reference collection |

### 4.6 "all / selected" Pattern (new)

Recurring pattern for "applies to all vs. selected": a **Radio** (`all` / `selected`) controls the visibility of a **conditional M2M list** whose key carries the suffix `_selected`.

- The noun of the radio is determined by **semantics**, not the pattern: `partner_visibility` (visible to whom) ≠ `depot_availability` (available where).
- The selection list carries `_selected`: `partner_selected`, `depots_selected`.
- M2M only visible when Radio ≠ `all` (conditional).

Standard naming for the partner filter (controls which BOTG partners are granted access to the object): **`partner_visibility` / `partner_selected`** (binding; align `partner_type`/`partner` accordingly).

## 5. Labels / Multilingual (new)

Labels are the translated field/group names visible in the UI (Directus `meta.translations`, languages `de-DE` / `en-GB` / `nl-NL`). They are independent of the (English, snake_case) field key.

### 5.1 Capitalisation by Language

| Language | Rule | Example |
|---|---|---|
| **English (en-GB)** | **Title Case** – every meaningful word capitalised | "Street Number", "Rental Company", "Vehicle Category" |
| **German (de-DE)** | Per Duden – nouns capitalised, rest lowercase | "Hausnummer", "Vermieter", "Status & Veröffentlichung" |
| **Dutch (nl-NL)** | **Sentence case** – only first word capitalised, nouns lowercase; exception: proper nouns | "Huisnummer", "Verhuurder", "Status & publicatie", "Beschikbaar op alle depots" |

Applying English Title Case to Dutch ("Beschikbaar Op Alle Depots") is incorrect.

### 5.2 Context Suffix

Where the plain field name would be ambiguous, add context in parentheses – in all three languages: "Name (Rental Company)" / "Name (Vermieter)" / "Naam (verhuurder)".

### 5.3 Consistency

Identical terms are translated consistently throughout – always "Object-ID", "Status Primarix", "Last Update", "by". Recurring structural labels are uniform across all products, e.g. the first section always "Status & Publication" / "Status & Veröffentlichung" / "Status & publicatie".

## 6. Decision Points

| # | Status | Resolution |
|---|---|---|
| E1 | **superseded** | Instead of `rentalcars`/`rental_cars` the new model applies: `rental_companies` + `rental_depots` + **`vehicles`** (rental cars and campers in one collection, discriminated via `rental_type`). |
| E2 | **resolved** | Conflict `booking` vs. `booking_partner`: **`booking_partner` wins** (standard). |
| E3 | **open** | Unify `erp_`/`mp_` families to singular product – still to be clarified. |

### Product-specific Note

`rental_period_zone` (calculator dimension instead of "room_category") applies **only in `vehicles`**, not globally.
