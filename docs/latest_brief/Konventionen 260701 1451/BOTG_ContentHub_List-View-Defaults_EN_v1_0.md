# BOTG ContentHub — List-View Defaults

Version 1.0 · 26-06-30 · EN · Basis: DEV list-view usability session (hotels + countries trial), status/translation display harmonisation

**Purpose.** This document defines the **default collection list view** (Directus *tabular* layout) for every collection in the ContentHub: **which columns appear, in which order, how they render** (label language, date format, status colour) and **how the default is applied** (global preset + field displays). The goal is that an editor opening any collection sees a usable, consistent list **without configuring columns themselves**.

**Relationship to the existing standards.** This standard sits next to the four existing ones and reuses their definitions rather than duplicating them:

| Document | Provides what this standard relies on |
|---|---|
| **`BOTG_ContentHub_Namenskonventionen`** | Field keys and the translatable-name pattern (`name`, `translations` alias). |
| **`BOTG_ContentHub_Field-Configs_EN`** | `status_primarix` config incl. fixed colours (§1.1), `object_id` (§1.2), relational display templates. |
| **`BOTG_ContentHub_Schema_Build_Spec_EN`** | Relational display template rule (§3.1), translation patterns (§2). |
| **`BOTG_ContentHub_Navigation_EN`** | Menu placement / which collections are products vs. master-data. |

> **Scope of this document:** the *list (tabular) view* only — not the detail/edit form, not the menu. Where a column renders a relational or translated value, the **field display** is owned here only insofar as it serves the list; it must stay consistent with the detail view.

---

## 0. Conventions used here

- A **column = a field key** in the collection. Columns render via that field's **display** (not its interface).
- **Labels and names are shown in the active user's language** (a NL user sees NL). Resolution is via the translation `code` (see §4.1).
- **Hidden/system fields may be columns.** `date_updated`, `user_updated`, `status` are `hidden: true` in the form but are valid, selectable list columns.
- The **translatable name is the `translations` alias field**, never a separate `name` column (Field-Configs §0).
- Defaults are stored as a **global preset** (`directus_presets`, `user`/`role`/`bookmark` = `null`) so they apply to all users until a user overrides their own view (§5.2).

---

## 1. Column sets

### 1.1 Main products

Collections: **hotels, tours, excursions, cruises, vehicles**.

| # | Column | Field | Notes |
|---|---|---|---|
| 1 | **OID** | `object_id` | Legacy object ID (integer). **Not** the technical PK. |
| 2 | **Name** | product name field | Per-product key — see §3. |
| 3 | **Destination** | primary geo assignment | In user language — see §2.3 + §3. |
| 4 | **Last Update** | `date_updated` | Absolute `dd.MM.yy HH:mm` (§4.2). No fallback. |
| 5 | **by** | `user_updated` | Editor name. Empty if never edited — no fallback. |
| 6 | **Status** | `status_primarix` | **Last column, coloured** (§4.4). |

### 1.2 Master-data / sub-collections

Collections holding maintained meta-data: **geographies** (countries, states, regions, places, destinations, locations_tour32, destinations_cluster), **calculator bases**, **media DB**, and other lookups.

| # | Column | Field | Notes |
|---|---|---|---|
| 1 | **Name / Label** | `translations` | Translatable name, in user language (§4.1). |
| 2 | **Last Update** | `date_updated` | Absolute `dd.MM.yy HH:mm`. No fallback. |
| 3 | **by** | `user_updated` | Editor name. Empty if never edited. |
| 4 | **Status** | `status` | **Last column, coloured** (§4.4). |

> **Optional code column (exception).** A master-data collection with its own meaningful business key (e.g. `media_code`, ISO code) **may** add that code as the **first** column, before Name/Label. This is an explicit per-collection exception, not the default.

---

## 2. Column definitions

### 2.1 OID — `object_id`
Integer legacy object ID (Field-Configs §1.2). Used instead of the technical primary key because the PK is either a UUID (hotels) or an opaque integer and is not meaningful to editors. May be empty for records that have no legacy origin.

### 2.2 Name
The product's human-readable display name. **The key is not uniform across products** — see §3. For master-data collections the equivalent is the **`translations`** alias (§1.2), never a plain `name`.

### 2.3 Destination
The product's **primary geographic assignment, shown in the user's language**.

**Principle:** show the broadest geographic level that is meaningful for that product as a single, scannable value. Products anchored to one place use the **country**; products spanning an area use the **destination/cluster** level, with **country as the documented fallback** when the destination is empty.

Per-product field mapping in §3.

### 2.4 Last Update — `date_updated`
Absolute timestamp, format `dd.MM.yy HH:mm` (§4.2). **No fallback** to `date_created`; freshly imported, never-edited records show the import timestamp (already populated) or remain empty.

### 2.5 by — `user_updated`
The last editor, rendered with the `user` display (`{{first_name}} {{last_name}}`). **No fallback** to `user_created`; never-edited records show empty (or the migration user for imported data).

### 2.6 Status
The collection's status field, rendered as a **coloured label** as the **last column** (§4.4). Two status models exist (§4.4) — products use `status_primarix`, master-data uses `status`.

---

## 3. Per-product mapping (Name + Destination)

Verified against the DEV schema. **Flags** mark where the intended value has no clean single field yet and must be confirmed when that product's name/geography is built.

| Product | Name field | Destination field(s) | Flag |
|---|---|---|---|
| **hotels** | `name` | `country` (M2O) | — fixed & verified |
| **excursions** | `name` | `country` (M2O) | — |
| **tours** | `name` | `destinations` (M2M) → fallback `country` (M2O) | ⚠ M2M = multiple values; confirm whether to show first/all and which country field (`country` single vs. `countries` M2M) |
| **cruises** | **TBD** | `destinations` (M2M) → fallback `countries` (M2M) | ⚠ no `name` field — name source open (`descriptions_translations` title vs. `object_info_primarix`); destination is M2M only |
| **vehicles** | `name_vehicle` | country **via** `rental_company` | ⚠ no direct geo field — country must be surfaced through the rental company / depot relation; path to confirm |

> **"Destination OR Country" implemented as one column.** Where two levels are listed, the first is primary and the second is the fallback when the first is empty. A single Directus column cannot express "A else B" natively; the practical options (primary field only, or a custom display/template) are an implementation decision per product — see §5 and §6.

---

## 4. Rendering rules

### 4.1 Language (labels & translated names)
Translated values (the `translations` alias on master-data, and relational templates pointing at translatable lookups) resolve to the **active user's language via the `code`** field of the central language registry.

```
# master-data translatable name (e.g. countries.translations)
display:          translations
display_options:  { template: "{{name}}", languageField: "code" }

# relational column pointing at a translatable lookup (e.g. hotels.country)
display:          related-values
display_options:  { template: "{{translations.name}}" }
```

Result (verified): country "Australia" renders **Australien** for `de-DE`, **Australië** for `nl-NL`.

### 4.2 Date — `date_updated`
```
display:          datetime
display_options:  { relative: false, format: "dd.MM.yy HH:mm" }
```
Absolute, no relative ("3 days ago"). This display is shared with the detail-view meta row — intentionally consistent.

### 4.3 Sort
**Default sort = `["-date_updated"]`** (most recently changed on top) for **all** collections. Stored in the preset (§5.2), not on the field.

### 4.4 Status colours
The status column uses the status field's **coloured `labels` display** (dot/pill in the choice colour).

- **Products — `status_primarix`** (choices: draft / published / unpublished / archived). Colours are fixed in **Field-Configs §1.1**: Draft `#6B7785`, Published `#2ECDA7`, Unpublished `#F2994A`, Archived `#E35169`. Display already configured on hotels, excursions, tours, vehicles, cruises.
- **Master-data — `status`** (e.g. countries: new / in review / active / archived). ⚠ **Colour palette not yet defined** — a coloured `labels` display equivalent to `status_primarix` must be set (§6).

---

## 5. Implementation

A list-view default has two parts: the **field displays** (how each column renders) and the **preset** (which columns, order, sort, widths).

### 5.1 Field displays (per §4)
Set via the schema/fields API (these are normal field meta, writable via the Directus MCP):
- Master-data translatable name → `translations` display with `languageField: "code"`.
- Relational geo column → `related-values` with `{{…translations.name}}`.
- `date_updated` → absolute `dd.MM.yy HH:mm`.
- Status field → coloured `labels`.

### 5.2 Global preset (`directus_presets`)
One preset per collection with `bookmark`, `user`, `role` = `null` (global default; requires admin).

```jsonc
{
  "bookmark": null, "user": null, "role": null, "search": null,
  "collection": "hotels",
  "layout": "tabular",
  "layout_query":  { "tabular": { "fields": ["object_id","name","country","date_updated","user_updated","status_primarix"], "sort": ["-date_updated"], "limit": 25 } },
  "layout_options":{ "tabular": { "widths": { "object_id":110, "name":320, "country":200, "date_updated":150, "user_updated":180, "status_primarix":140 } } }
}
```
```jsonc
{
  "bookmark": null, "user": null, "role": null, "search": null,
  "collection": "countries",
  "layout": "tabular",
  "layout_query":  { "tabular": { "fields": ["translations","date_updated","user_updated","status"], "sort": ["-date_updated"], "limit": 25 } },
  "layout_options":{ "tabular": { "widths": { "translations":360, "date_updated":150, "user_updated":180, "status":140 } } }
}
```

> **Application note.** `directus_presets` is a system collection and is **not writable via the Directus MCP**. Apply the global preset either through the **admin UI** (configure the list once, save as a default preset) or via an authenticated **`/presets`** call from an admin session (browser console / extension). Upsert on `collection` + null `user`/`role`/`bookmark` to avoid duplicate defaults.

---

## 6. Open points / TBD

1. **cruises — Name source.** No `name` field. Decide: translated title from `descriptions_translations` vs. `object_info_primarix` vs. a new dedicated name field.
2. **vehicles — Destination.** No direct geo field; country must be surfaced through `rental_company` (and/or depot). Confirm the relation path and display template.
3. **tours / cruises — cluster level.** The available field is the **M2M `destinations`** (multiple values), not a single `destinations_cluster`. Decide list behaviour (show first vs. comma-joined) and which country field is the fallback (`country` single vs. `countries` M2M).
4. **"A else B" fallback** in the Destination column — pick the per-product mechanism (primary field only, or custom display/template).
5. **Master-data `status` colours** — define a coloured `labels` palette for new / in review / active / archived.
6. **Roll-out order** — hotels + countries are the trial; extend to the remaining products and master-data once 1–5 are resolved.
