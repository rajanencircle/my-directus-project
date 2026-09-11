# LOCAL schema changes — Multi-partner media library (Ticket 1)

Environment: **directus-local only** (`http://localhost:8055`). Nothing applied to dev/staging/main.

Backup taken before any change: `directus/local-dump/backups/pre-partner-migration-20260911-163148.sql` (full `pg_dump`, gitignored).

## 1. `directus_users.partner_selected` → renamed to `partner_selected_legacy`

Done via direct SQL (no Directus API rename support for field keys), then a Directus container restart to reload the schema cache.

```sql
BEGIN;
ALTER TABLE directus_users RENAME COLUMN partner_selected TO partner_selected_legacy;
UPDATE directus_fields SET field='partner_selected_legacy', hidden=true,
  note='Legacy single-partner M2O, superseded by partner_selected M2M. Kept for migration verification only.'
  WHERE collection='directus_users' AND field='partner_selected';
UPDATE directus_relations SET many_field='partner_selected_legacy'
  WHERE many_collection='directus_users' AND many_field='partner_selected';
COMMIT;
```

**Revert:** run the inverse (`RENAME COLUMN partner_selected_legacy TO partner_selected`, restore `directus_fields`/`directus_relations` rows to `field='partner_selected'`, restart the container), then delete the new M2M field/junction described below.

**Original data** (2 users had a value — captured here in case the legacy column is later dropped):
- `karawane@gmail.com` (`c09478d6-8c24-408c-8fee-0ce61073cd60`) → partner `Karawane Reisen` (`8c3a51ec-c1f1-4d30-9697-6c80d52e668d`)
- `botg@gmail.com` (`3c886b80-0e79-48f4-b0e1-a3a7a3324b92`) → partner `Bestof (BoTG)` (`8c2b4478-2960-4f6d-8d74-66bac14db8fc`)

`partner_selected_legacy` was **not** deleted — kept until the new M2M field is verified working end-to-end in the UI.

## 2. New junction collection `users_partner`

Created via `directus-local` MCP (`collections`/`relations`/`fields` tools). Naming avoids the `directus_`-prefix restriction the user flagged (junction is `users_partner`, not `directus_users_partner`).

- Collection `users_partner` (hidden, grouped under `Hotels_Metadata`): `id` (int PK), `directus_users_id` (uuid → `directus_users`), `partner_id` (uuid → `partner`), `sort` (int).
- Relations: `users_partner.directus_users_id` → `directus_users` (`on_delete: CASCADE`, `one_field: partner_selected`), `users_partner.partner_id` → `partner` (`on_delete: CASCADE`).
- New alias field `directus_users.partner_selected` (type `alias`, `special: ["m2m"]`, interface `list-m2m`, template `{{partner_id.label}}`) — this is the M2M replacement for the old M2O field of the same name.

**Backfilled** from the original data above (2 rows created in `users_partner`, ids 1–2). Verified via `directus-local items read` on `users_partner` with nested fields — both rows resolve to the correct user email / partner label.

**Revert:** delete field `directus_users.partner_selected`, delete relations, delete collection `users_partner`, then restore `partner_selected_legacy` per step 1's revert.

## 3. New junction collection `files_partner`

Same pattern as above, for `directus_files`:

- Collection `files_partner` (hidden, grouped under `Hotels_Metadata`): `id` (int PK), `directus_files_id` (uuid → `directus_files`), `partner_id` (uuid → `partner`), `sort` (int).
- Relations: `files_partner.directus_files_id` → `directus_files` (`on_delete: CASCADE`, `one_field: partner_selected`), `files_partner.partner_id` → `partner` (`on_delete: CASCADE`).
- New alias field `directus_files.partner_selected` (type `alias`, `special: ["m2m"]`, interface `list-m2m`, template `{{partner_id.label}}`, grouped under the existing `media_rights` field group) — **new field, `directus_files` had no partner scoping at all before this.**

**No `partner_visibility` toggle field was added** (dropped per user direction, simplifying the product-collection pattern) — the rule is: empty `partner_selected` = visible to all partners; non-empty = visible only to those partners. No existing files were touched, so all existing files remain visible to everyone (empty `partner_selected`) — no regression.

**Revert:** delete field `directus_files.partner_selected`, delete relations, delete collection `files_partner`.

## Still pending (UI/logic layer — schema is a prerequisite, not the finish line)

- Media Library / uploader UI changes (partner multi-select on upload, partner-restricted-to-own-list, visual accent for multi-partner, info popover).
- Read-side filter updates in `usePartnerScope.ts`, `files.store.ts`, `folders.store.ts`, `extensions/api` (still single-partner logic as of this writing — will silently under/over-scope until updated).
- Conflict dialogue on product `partner_selected` changes.

See `docs/plans/LOCAL/2026-09-11-media-partner-multipartner.md` for the full plan.
