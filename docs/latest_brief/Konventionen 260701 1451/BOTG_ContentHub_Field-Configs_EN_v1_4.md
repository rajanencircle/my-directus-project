# BOTG ContentHub — Field Configurations

Version 1.4 · 26-07-01 · EN · Basis: DEV field-harmonisation session + geography collections build + conditional-reveal patterns (operator / booking) + caption-less-radio rule-ID + status-subcollection rule-ID

**Purpose.** This document is the **configuration catalogue for recurring, cross-collection fields** — the concrete *recipe* (interface, options, conditions, width, default, validation, display) for each field that appears in more than one product collection and must look and behave identically everywhere. **hotels** is the reference implementation; every other product mirrors it (adapting field references, never copying hotels' labels).

It complements — and does not duplicate — the three existing standards. Where they overlap, the owner is:

| Document | Owns | One-line scope |
|---|---|---|
| **`BOTG_ContentHub_Schema_Build_Spec_EN`** | **Type / structure / generation / deploy** | PK/FK types (§1), translation patterns (§2), O2M-M2M-JSON choice (§3), relational display templates (§3.1), deriving config from a reference (§3.2), hidden standards + brief column map + label/note rules (§4), legacy healing (§5), nav-meta + icon colours (§6), API (§7), deploy (§8), pre-emit checks (§9). |
| **`BOTG_ContentHub_Namenskonventionen`** | **Keys / labels / layout-prefix naming** | snake_case rules (§1), collection names C1–C9 (§2), layout levels `ui_/tab_/block_/section_` (§3), field keys incl. `name_<entity>`, suffixes, data types, the `all/selected` + `_channel`/`_partner` **naming** patterns (§4, §4.6), labels & multilingual (§5). |
| **`BOTG_ContentHub_Navigation_EN`** | **Menu placement** | Product Tier-1, master-data folders and their lookups, per-collection bookmarks, sidebar icon colours. |
| **this document — `BOTG_ContentHub_Field-Configs_EN`** | **Field configuration** | How each recurring field is *wired* once its key/label (Naming) and menu slot (Navigation) are fixed and its type/structure (Build Spec) is set. |

> **Reading order for a recurring field:** Naming Conventions (key + label) → this document (interface/options/conditions) → Build Spec (type/relation, pre-emit checks). Cross-references below are to base document names, never to a version.

---

## 0. Conventions used here

- **Config blocks** list only the **non-default, standard-defining** keys. Anything unlisted follows the Build Spec / Directus defaults.
- **Labels always come from the Excel brief** (cols F/G/H) — see Build Spec §4 and Naming Conventions §5. This document never hard-codes a user-facing label except where a field is intentionally **caption-less**.
- **Empty label = `translations: null`** (the whole translations array cleared), **never** a literal `"-"`. Applies to **caption-less radios** whose meaning is already carried by their **own choice labels** *and/or* the **section title** — a separate field label would be redundant. **Scope (rule `caption-less-radio`):** only radios whose choice labels are self-explanatory — the reveal-pattern radios `partner_visibility` (§3.1), `booking_channel` (§4.1) and `operator_direct` (§5.1); a radio that genuinely needs a caption still gets one. Rule-ID registry: Naming Conventions §7.3.
- **Width default = half**; full only for textarea / WYSIWYG / repeater / gallery (Build Spec §4).
- **The translatable name is the Directus `translations` alias field**, not a separate `name` column. A brief row keyed `name` (translatable = Yes) maps to that collection's `translations` field — set its **label/note there**.
- **Field config is ported from the hotels reference and adapted to local field names** (Build Spec §3.2); labels are *not* ported.

---

## 1. Status & publication

### 1.1 `status_primarix` (select-dropdown, 4 choices)

> **Supersedes** the 2-choice note in Build Spec §4 (Published/Draft). The current standard is four choices with fixed colours. Build Spec §4 should point here.

```
type:            string
interface:       select-dropdown
display:         labels
default_value:   "draft"
options.choices  (order + colour, each icon "circle", showAsDot: false):
  Draft        value "draft"        #6B7785
  Published    value "published"    #2ECDA7
  Unpublished  value "unpublished"  #F2994A
  Archived     value "archived"     #E35169
display_options.choices: foreground = colour, background = light tint
  Draft #EDEFF2 · Published #E9F9F4 · Unpublished #FDF0E6 · Archived #FCEAED
label:           system field — exempt (no translations required)
```

Applied in DEV: hotels, excursions, tours, vehicles.

### 1.2 `object_id`

```
type:       integer
readonly:   true
options:    { min: 1, max: 1000000000 }
note:       "$t:hotels_object_id_note"
label:      system field — exempt
```

---

### 1.3 `status` (geography collections)

> Geography **lifecycle** status — distinct from `status_primarix` (product publication). Same colour/icon palette as §1.1. Applied to: countries, destinations, states, regions, places, locations_tour32 (**not** destinations_cluster — fixed set, no status per decision F1). Drives soft-delete via the collection meta (`archive_field = status`, `archive_value = archived`, `unarchive_value = active`).

```
type:            string
interface:       select-dropdown
display:         labels
default_value:   "new"
is_nullable:     false
options.choices  (order + colour, each icon "circle", showAsDot: false):
  New        value "new"        #6B7785
  In review  value "in review"  #F2994A
  Active     value "active"      #2ECDA7
  Archived   value "archived"    #E35169
display_options.choices: foreground = colour, background = light tint
  New #EDEFF2 · In review #FDF0E6 · Active #E9F9F4 · Archived #FCEAED
label:           "Status" (DE/GB/NL)
```

Stored values must match the migration import CSVs **exactly** — `in review` is lower-case with a space (Naming §5.4). Applied in DEV across all seven geo collections (cluster excepted).

---

### 1.4 `status` (master-data / other sub-collections)

> Lifecycle status for **non-product, non-geography master-data / lookup sub-collections** (e.g. `booking_partners`) — distinct from `status_primarix` (§1.1, product publication) and the geography lifecycle (§1.3). Three states; drives soft-delete via the collection meta (`archive_field = status`). Rule-ID `status-subcollection`.

```
type:            string
interface:       select-dropdown
display:         labels
default_value:   "active"
is_nullable:     false
options.choices  (order + colour, each icon "circle", showAsDot: false):
  Active     value "active"     #2ECDA7
  Archived   value "archived"   #F2994A
  Deleted    value "deleted"    #E35169
display_options.choices: foreground = colour, background = light tint
  Active #E9F9F4 · Archived #FDF0E6 · Deleted #FCEAED
label:           "Status" (DE/GB/NL)
```

**Collection meta:** `archive_field = status`, `archive_value = "deleted"`, `unarchive_value = "active"`, `archive_app_filter = true`. **`deleted` is the value the Directus delete action writes** (soft-delete — the item is hidden by the app filter, the row is retained); **`archived`** is an editor-set, still-visible "set aside" state; **`active`** is the live default. Hard removal stays a separate, explicit step.

> **Difference to §1.3 (geography lifecycle):** geography uses `new → in review → active → archived` (a review workflow); this is the lighter `active / archived / deleted` model where `deleted` is wired to the app's delete action.

Applied in DEV: booking_partners (first). Apply to further master-data / lookup collections as they gain a lifecycle / soft-delete need.

---

## 2. Internal notes

### 2.1 `internal_remarks`

```
type:       text
interface:  input-multiline
options:    { trim: true, softLength: null }
width:      fill
note:       "$t:hotel_internal_remarks_note"
labels:     DE "Interne Hinweise" · GB "Internal Remarks" · NL "Interne opmerking"
```

---

## 3. BOTG company assignment (partner filter)

A caption-less All/Selected radio that reveals an M2M partner picker. Field **names** follow Naming Conventions §4.6 (`all/selected` pattern); this section fixes the **config**.

**Containing group** (group-detail):

```
key:     section_botg_filter      (excursions, tours)      options.start = "open"
         section_botg_companies   (rental_companies, vehicles) options.start = "closed"
labels:  DE "BOTG-Firmen-Zuordnung" · GB "BOTG Company Assignment" · NL "BOTG-bedrijfstoewijzing"
```

### 3.1 `partner_visibility` (radio)

```
type:           string
interface:      select-radio
options.choices: [ {text "All", value "all"}, {text "Selected", value "selected"} ]
default_value:  "all"
translations:   null            (caption-less — meaning from section title)
width:          full
```

### 3.2 `partner_selected` (M2M → partner)

```
type:        alias        special ["m2m"]        interface list-m2m
options.template / display_options.template: "{{partner_id.label}}"
display:     related-values
conditions:  hidden = true  WHEN  partner_visibility _eq "all"
translations: null           (caption-less)
width:       full
junction:    <product>_partner  — relation wired with meta.one_field "partner_selected"
             and junction_field set on both sides (partner_id / <product>_id)
```

Applied in DEV: excursions, tours, rental_companies, vehicles.

---

## 4. Booking (channel + partner)

First two fields of the reservation/booking section. A caption-less channel radio reveals the partner M2O. Names follow Naming Conventions §4.6 (`_channel`/`_partner`).

**Semantics (kept identical to hotels):** value **`No` = Partner Booking** (read as *"no direct booking"*), **`Yes` = Direct Booking**. The partner picker shows only for Partner Booking.

### 4.1 `booking_channel` (radio)

```
type:           string
interface:      select-radio
options.choices (Partner first, hotels $t keys reused for identical text):
  {text "$t:hotels_partner_booking_option", value "No"}    → Partner Booking
  {text "$t:hotels_direct_booking_option",  value "Yes"}   → Direct Booking
default_value:  none (nothing pre-selected)
translations:   null            (caption-less)
width:          full
```

### 4.2 `booking_partner` (M2O → booking_partners)

```
type:        uuid         special ["m2o"]        interface select-dropdown-m2o
relation:    → booking_partners (on_delete SET NULL)
options.template: "{{booking_partner}}"
hidden:      true
conditions:  hidden = false  WHEN  booking_channel _eq "No"   (Partner Booking)
labels:      DE "Buchung über" · GB "Booking via" · NL "Boeking via"
width:       full
```

Applied in DEV: excursions, tours, rental_companies (hotels is the model; there the equivalent keys are `booking_partner`/`booking`).

### 4.3 Direct-Booking reveal (Variante B)

> **Conditional reveal — "Variante B":** the section shows **only the channel radio until a choice is made**; each branch then reveals its own fields, and nothing extra shows while the radio is `null`. Implemented purely with field `conditions` (no default values, fields stay `hidden: true` by default).

The down-stream reservation/contact fields are revealed for **Direct Booking**; the partner picker (§4.2) is the **Partner Booking** counterpart.

```
each direct-booking field:
  hidden:      true
  conditions:  hidden = false  WHEN  booking_channel _eq "Yes"   (Direct Booking)
  width:       half
```

Direct-Booking fields by collection:
- excursions: `email_booking`, `res_phone`, `res_email2`, `contact_title`, `contact_greeting`, `contact_firstname`, `contact_name`
- tours: `email_booking`
- rental_companies: `email_booking`

**Always visible** (no condition — technical / internal, independent of channel): `internal_remarks_reservation` and the Tour32 service-provider IDs (`id_service_provider_tour32` / `id_main_service_provider_tour32`, resp. `service_provider_id_tour32` / `main_service_provider_id_tour32`).

Applied in DEV: excursions, tours, rental_companies.

---

## 5. Travel / Tour Operator (channel + linked partner)

The operator-address section uses the same **Variante-B reveal** as §4.3, with **inverse polarity**: the linked operator shows on **`Yes`**, the manual operator address on **`No`**. Applied in: excursions, tours.

**Containing group:** `section_operator` (group-detail, open) — labels from the brief (GB "Operator Address").

### 5.1 `operator_direct` (radio)

```
type:           string
interface:      select-radio
options.choices: [ {text "Yes", value "Yes"}, {text "No", value "No"} ]
width:          full
labels:         from brief (GB "Travel Operator")
always visible — this is the trigger
```

> tours' `operator_direct` shipped with **empty choices** — add the Yes/No choices so the reveal has a selectable trigger (align to excursions).

### 5.2 `operator_linked` (M2O → booking_partners)

```
type:        uuid        special ["m2o"]        interface select-dropdown-m2o
options.template: "{{booking_partner}}"
hidden:      true
conditions:  hidden = false  WHEN  operator_direct _eq "Yes"
width:       full
labels:      from brief (GB "Chosen Tour Operator")
```

### 5.3 Manual operator fields (reveal on `No`)

```
each field:
  hidden:      true
  conditions:  hidden = false  WHEN  operator_direct _eq "No"
  width:       half
```

Fields: `name_operator`, `street`, `street_number`, `postcode`, `place`, `location_tour32`, `state`, `country`, `phone_general`, `phone_after_hours`, `email_general`, `website`.

**Width convention (both reveal patterns):** the channel/operator radio and the revealed partner picker are `full`; manual address/contact fields are `half`.

---

## 6. Contact fields

Plain inputs, **no icon**. Labels from the brief; **English parenthetical additions stay lowercase** (`Phone (general)`, `Phone (after hours)`, `Email (general)`) — normalise capitalised brief cells accordingly, DE/NL stay as in the brief.

### 5.1 `phone_general` / `phone_after_hours`

```
type:               string
interface:          input
options:            { placeholder: "+49 30 12345678", softLength: 15 }
validation_message: "$t:phone_validation"
width:              half
labels:             from brief
```

### 5.2 `email_general`

```
type:               string
interface:          input
options:            { placeholder: "john.doe@example.com" }
validation_message: "$t:email_validation_message"
width:              half
labels:             from brief
```

### 5.3 `fax` / `fax_general` — **do not create**

The brief marks fax with interface `-` (kill / strikethrough). Per Build Spec §5 these rows are **not built**; no fax field exists on hotels either. Do not add it, and purge any that slipped in.

Applied in DEV: excursions, tours, rental_companies (phone_general, phone_after_hours, email_general); rental_depots (phone_general only). Fax verified absent everywhere.

---

## 7. Geography pickers & multi-select countries — *deferred to Step 2*

> **Status: standard not yet finalised — to be iterated and rolled out in a second step.** Documented here only as placeholders so the catalogue is complete.

- **Geo pickers** (`place`/`town`, `location_tour32`, `country`, `state`, `region`) — custom interface **`cascading-individual-select`** with per-field `options` (`target_collection`, `icon`, `searchLimit`, `cascadeFrom`, `filterBy`). hotels is confirmed (place-anchored full cascade: icons `location_city` / `pin_drop` / `flag` / `map` / `landscape`). The **postal-address** products (excursions, tours, rental_companies, rental_depots) use a lighter, country-anchored cascade (`Country → State`); exact per-field model **pending approval**.
- **Multi-select `countries`** (M2M → countries) in cruises / excursions / tours / rental_companies — standard `list-m2m`, name template, correct junction to the `countries` lookup; flag icon only if the interface supports it. **Pending.**

This section will be filled once the Step-2 cascade model is decided.

---

## 8. Layout wrappers (pointer)

Field-group wrappers are **named** per Naming Conventions §3 (`tab_*` group-raw, `block_*` group-raw without label, `section_*` group-detail). This document does not redefine them. The recurring master-data arrangement is:

```
tab_master_data
├─ block_publication        (group-raw, translations null)
│  ├─ section_publication    (group-detail, open)    object_id, status_primarix, audit
│  └─ section_botg_*         (group-detail, closed)   partner_visibility, partner_selected
└─ block_vehicle_basics     (group-raw, translations null)   (vehicles)
   └─ section_type_company   (group-detail, open)
```

`block_*` wrappers carry `translations: null` and `interface: group-raw`; sections carry `options.start` open/closed.

---

## Change log

- **v1.4 (26-07-01)** — added **§1.4 `status` (master-data / other sub-collections)**: a 3-state `active / archived / deleted` lifecycle for non-product, non-geography lookup collections (e.g. `booking_partners`), default `active`; soft-delete wired via `archive_field = status`, `archive_value = "deleted"` (the Directus delete action) and `unarchive_value = "active"`, with `archived` as a visible editor state. Colours active #2ECDA7 / archived #F2994A / deleted #E35169. Rule-ID **`status-subcollection`**, registered in Naming Conventions §7.3.

- **v1.3 (26-07-01)** — §0: the caption-less / empty-label convention now names the **radio’s own choice labels** as a meaning carrier **in addition to** the section title, and is **scoped** to radios whose choices are self-explanatory (the reveal-pattern radios `partner_visibility` §3.1, `booking_channel` §4.1, `operator_direct` §5.1); a radio that needs a caption still gets one. Convention promoted to Rule-ID **`caption-less-radio`** and registered in Naming Conventions §7.3. No field-level config changed.

- **v1.2 (26-06-30)** — added §4.3 **Direct-Booking reveal (Variante B)**: the reservation section is empty until `booking_channel` is set; direct-booking fields reveal on `Yes`, the partner picker (§4.2) on `No`; `internal_remarks_reservation` + the Tour32 service-provider IDs stay always-visible. Added §5 **Travel / Tour Operator**: `operator_direct` radio reveals `operator_linked` on `Yes` / the manual operator address on `No` (inverse polarity to Booking); tours' empty `operator_direct` choices fixed; width convention radio + revealed picker `full`, manual fields `half`. Applied in DEV: excursions, tours (operator); excursions, tours, rental_companies (booking). Contact / Geography / Layout renumbered to §6 / §7 / §8 — titles unchanged.

- **v1.1 (26-06-30)** — added §1.3 `status` (geography lifecycle): 4-choice select-dropdown sharing the §1.1 colour/icon palette, default `new`, drives soft-delete; §0 — the translatable name is the `translations` alias (brief `name` → label/note there). Applied in DEV across the seven geo collections.

- **v1.0 (26-06-29)** — initial catalogue: status_primarix (4-choice, supersedes Build Spec §4), object_id, internal_remarks, BOTG company-assignment group + partner_visibility/partner_selected, booking_channel/booking_partner, contact fields (+ fax kill rule), empty-label convention, layout-wrapper pointer. Geography pickers and multi-select countries reserved for Step 2.
