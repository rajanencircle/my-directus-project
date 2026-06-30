# BOTG ContentHub — Geo Schema Deploy Guide (Staging)

**Version 1.0 · 26-06-23 · EN**
Basis: DEV brief **v38** (sheet `Geografies`), snapshot `schema_26-06-19.json`, deploy file **`BOTG_Geo_Schema_Deploy_v38_26-06-23.yaml`**, target **Directus 11.17.4**.

This guide describes the geo-collection schema changes, how to deploy them via `directus schema apply`, and a manual field-by-field fallback if the YAML cannot be applied.

---

## 1. Scope

Seven geo collections receive a new form layout, new fields, label/note/read-only updates, and three field deletions: `destinations_cluster`, `destinations`, `countries`, `states`, `regions`, `places`, `locations_tour32` (plus the per-collection `*_translations` companions for the name field).

No data migration is part of this deploy — only schema (collections/fields/meta). Geo **data** changes (cluster restructuring, media codes per entity) are handled separately via the flat list import.

---

## 2. What changes

### 2.1 New layout — sections (no tabs)
Each collection gets `section_*` groups (`group-detail`) with a collapse state (`open`/`closed`). Per the naming convention (tabs only from ≥ 2 tabs), the geo collections have a single logical tab, so sections sit directly at top level — there is no `ui_tabs`/`tab_*`. Section header colour `#008CC0`.

### 2.2 New fields
| Field | Collections | Type / Interface | Notes |
|---|---|---|---|
| `status` | destinations, countries, states, regions, places, locations_tour32 | string / `select-dropdown` (`active` / `review` / `archived`) | **review = orange** (`#F2994A`), for legacy triage (entry on the wrong level — e.g. a state in a country field — or ambiguous spelling). Colour+icon choices; list view renders a coloured label (`display: labels`). Default `active`. `destinations_cluster` has no status (pure grouping). |
| `media_code` | destinations, countries, states | string / `input` | authoritative BOTG image code |
| `media_code_legacy_botg` | destinations, countries, states | string / `input`, **read-only** | migrated legacy code |
| `media_code_legacy_karawane` | destinations, countries, states | string / `input`, **read-only** | migrated legacy code |
| `is_non_geographic` | destinations only | boolean / `boolean` (default `false`) | flags non-geographic destinations |

### 2.3 Modified existing fields
- **Labels** (DE/EN/NL) and **notes** added to previously unlabelled fields (FKs, ISO, Primarix IDs, name).
- **Group assignment**: every field is placed into its `section_*`.
- **Read-only**: `countries.ISO`, `countries.ISO_alpha_3_code`, `states.ISO` are set read-only (reference codes, not edited here).
- The parent `translations` alias is placed into the first section as the editable name block (see §3).

### 2.4 Intentional deletions — please read
The following existing fields are **deliberately deleted** by this deploy. They are defined as removed in v38 (struck through) because the new image-naming logic makes them redundant, and ISO codes are meaningless at cluster level:

- `destinations.short_code`
- `destinations_cluster.short_code`
- `destinations_cluster.ISO_alpha_3_code`

In the deploy YAML these fields are intentionally **absent** from the parent collections' full field sets, so `schema apply` will **drop the columns**. This is by design, not an oversight. The `--dry-run` must show exactly these three deletions and no others.

---

## 3. Translatable name — modelling & open questions for DEVs

**How it is modelled here.** The editable geo name is translatable and lives in `<collection>_translations.name`. In the form it is surfaced through the parent collection's `translations` alias field, which this deploy places into the first section. The per-collection label ("Name (Country)", "Name (Destination)", …) and the help note are set on the `<collection>_translations.name` field; the `translations` alias carries the section placement.

**Questions for the DEVs (please answer in writing):**
1. **Why was the geo name historically not solved as a proper translation table** (`<collection>_translations`)? Please document the current implementation state for each geo collection — is the name actually served from the translations companion today, or from somewhere else?
2. **Geo-Picker impact.** Does wiring the geo name cleanly through the translations companion (so the relational geo-picker in the products shows the correctly translated name) require larger rebuild work on the picker? If yes, please describe concretely **what needs to change** (picker display template, relation, indexing, API field selection) so we can scope it.

These answers determine whether the name handling can stay as-is or needs a follow-up change request.

---

## 4. Deploy via `directus schema apply`

The deploy file **`BOTG_Geo_Schema_Deploy_v38_26-06-23.yaml`** holds the full desired field state of the seven geo collections (system fields included) plus the `name` field meta for the seven `*_translations` companions.

1. **Snapshot the target:** `npx directus schema snapshot ./staging-current.yaml`
2. **Merge — parent collections:** for each of the 7 geo parent collections, **replace** its `fields:` entries in `staging-current.yaml` with the full set from the deploy file. System fields are included in the deploy file, so the replace is safe and removes the three struck fields.
3. **Merge — translations:** for each of the 7 `*_translations` collections, **update only the `name` field's meta** (label / note / interface) from the deploy file — do **not** replace those collections.
4. **Dry-run:** `npx directus schema apply --dry-run ./staging-current.yaml` → confirm the diff is exactly: added sections + new fields, modified labels/notes/group/read-only, and the 3 deletions. **If anything else appears, stop.**
5. **Apply:** `npx directus schema apply ./staging-current.yaml`
6. **Production** only after staging validation (§6) passes.

> If the merge/replace is error-prone in your pipeline, use the manual fallback in §5 — it reproduces the same end state field by field.

### 4.1 Packaging rules (lessons from the first Tours/Excursions deploy)
These caused import failures on the first product YAMLs; they are already pre-applied to this file:
- **2-space indentation** for all list items — Directus' import tooling is indent-sensitive (0-space list items caused silent parse failures). This file is normalised to 2-space.
- **Self-contained** — this YAML references only its own `section_*` groups; no cross-product `group:` (e.g. never `group: tours`). Verified: no collection-level folders, no foreign group references.
- **`schema: null` on alias/group fields** — all `section_*` groups and the `translations` alias carry `schema: null` (no real table). Already the case here.
- **Group defined before reference** — each `section_*` appears before the fields that reference it.
- **Test on a local mirror first** — clone staging locally and run `--dry-run` there before touching staging; this catches structural issues at zero risk.
- **Deletions** — this YAML intentionally drops 3 fields (§2.4). The first deploys used additive-only scripts to avoid accidental deletions, so confirm the dry-run shows **exactly** those 3 drops and nothing else before applying. The DEV-validated safe path is "merge current schema + this YAML into one file, then apply" — exactly the procedure in §4.
- **Folder collection — resolved.** The geo collections already live under `Global_Data > Geographies` on staging (both folders are `schema: null`; the `*_translations` companions sit under their parent collection). Since this deploy is **fields-only**, it neither defines nor re-parents collections — no folder definition is needed and there is no re-parenting risk.

---

## 5. Manual fallback checklist (if the YAML cannot be applied)

Do it in this order. Field configs (labels, notes, types) are in the deploy YAML; use it as the source of truth for exact values. UI = Settings → Data Model; API = `/fields` endpoints.

**A. Create the section groups** (per collection, interface `group-detail`, collapse per the YAML, header colour `#008CC0`):
- countries: `section_status_assignment` (open), `section_iso` (closed), `section_media` (open), `section_legacy` (closed)
- destinations: `section_status_assignment` (open), `section_media` (open)
- states: `section_status_assignment` (open), `section_media` (open)
- destinations_cluster: `section_name` (open)
- regions: `section_name_assignment` (open), `section_legacy` (closed)
- places: `section_name_assignment` (open), `section_legacy` (closed)
- locations_tour32: `section_name` (open)

**B. Create the new fields** (per §2.2): `media_code`, `media_code_legacy_botg`, `media_code_legacy_karawane` on destinations/countries/states; `is_non_geographic` on destinations; `status` on all six (destinations, countries, states, regions, places, locations_tour32 — not destinations_cluster). Set `status` as `select-dropdown` with `active` / `review` / `archived` (+ `display: labels`); set both `*_legacy_*` read-only.

**C. Assign every field to its section** (set the field's group), in the order defined in the brief/YAML.

**D. Add labels (DE/EN/NL) and notes** to the existing fields, and set **read-only** on `countries.ISO`, `countries.ISO_alpha_3_code`, `states.ISO`.

**E. Configure the translatable name**: place each parent `translations` alias into the first section; set label + note on `<collection>_translations.name`.

**F. Delete the three fields** (this is intended — see §2.4):
- `DELETE /fields/destinations/short_code`
- `DELETE /fields/destinations_cluster/short_code`
- `DELETE /fields/destinations_cluster/ISO_alpha_3_code`

---

## 6. Post-deploy validation
- Open an item in `destinations`, `countries`, `states`: sections render with the correct collapse state; fields carry labels + notes; `status` shows the dropdown and a coloured label in the list; `*_legacy_*` and the ISO fields are read-only; `is_non_geographic` toggle present on destinations.
- Confirm `short_code` is gone from destinations and destinations_cluster, and `ISO_alpha_3_code` is gone from destinations_cluster.
- Open `destinations_cluster`: only the name remains (plus system fields).
- Spot-check the geo-picker in a product (e.g. hotels) still resolves country/destination names (ties into the §3 questions).
