# Generated Filename Auto-Fill flow — field mapping fix

Flow: `840b0e2c-3d08-41e5-b0eb-f39a6a01de31` (directus-dev)
https://dev.content.botg.cloud/admin/settings/flows/840b0e2c-3d08-41e5-b0eb-f39a6a01de31

## Problem

The flow auto-generates `directus_files.generated_filename` in the pattern
`[3L Destination Cluster]_[3L Country]_[YYYYMMDD]_[Editor Initials]_[seq]`
on file upload/update.

It failed on every run with:

> You don't have permission to access field "ISO_alpha_3_code" in collection
> "destinations_cluster" or it does not exist. Queried in
> "country.destination_id.destinations_cluster_id".

## Root cause

The flow read the "3L Destination Cluster" code from
`country.destination_id.destinations_cluster_id.ISO_alpha_3_code`
(i.e. `destinations_cluster.ISO_alpha_3_code`).

A prior schema change removed the code field from `destinations_cluster` —
that collection now only has `id, sort, user_created, date_created,
user_updated, date_updated, is_non_geographic, section_name, translations`.
There is no code/ISO field left on it.

The equivalent code now lives one level up, directly on the destination
record: `destinations.media_code` (note in schema: "Maßgebliche BOTG-Kürzel
für Bild-Benennung" — the authoritative BOTG code for image naming).

`countries.ISO_alpha_3_code` (used for the "3L Country" segment) was
unaffected and required no change.

## Fix

### Operation `read_file_data` (item-read, id `226908df-f863-4e5f-9a88-d08d1f1309b4`)

`options.query.fields` — replaced the two `destination_id.destinations_cluster_id.*`
entries with `destination_id.*` directly:

| Before | After |
|---|---|
| `country.destination_id.destinations_cluster_id.ISO_alpha_3_code` | `country.destination_id.media_code` |
| `country.destination_id.destinations_cluster_id.translations.name` | `country.destination_id.translations.name` |

`country.ISO_alpha_3_code` / `country.translations.name` unchanged.

### Operation `build_base_name` (exec, id `66da0763-a2da-431e-bb73-52101cee3cfa`)

The script derived a `cluster` object from
`country.destination_id.destinations_cluster_id` and read
`cluster.ISO_alpha_3_code` / cluster translations for the "3L Destination
Cluster" segment. Changed to derive a `destination` object directly from
`country.destination_id` and read `destination.media_code` / destination
translations instead. Same fallback chain (code → first 3 letters of name →
`UNK`), just sourced one level higher in the relation chain.

## Environments applied

- **directus-dev** — applied and verified against a real file
  (`eae2f56d-dabd-4b5c-99a9-32e99bec986a`), produced
  `ASI_IND_20260603_CED_001` as expected (destination "Asien" media_code
  `ASI`, country "Indien" ISO alpha-3 `IND`).
- **directus-staging** — same schema confirmed (`destinations.media_code`
  present, `destinations_cluster` has no code field, `countries.ISO_alpha_3_code`
  unchanged) and same two operations updated.
- **directus-main** — schema confirmed identical to dev/staging (read-only
  check: `destinations.media_code` exists, `destinations_cluster` has no
  code field), and the flow there has the same stale mapping. Per standing
  instruction, schema/flow changes on directus-main are never made via MCP —
  the user applies them manually in the admin UI using the exact field list
  and script above (same as the dev/staging fix).

## Verification

- Re-read the flow's operations after update — both show the new
  `fields`/`code`.
- Next file upload/update with a country set should populate
  `generated_filename` without the `destinations_cluster` error; check the
  flow's `flow_manager_last_run_message` to confirm.
