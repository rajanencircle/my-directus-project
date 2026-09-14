# LOCAL — Fix file-visibility bug, remove the conflict dialogue

Environment: **directus-local only**.

## The bug you found

In "Add Existing", a partner without access to an image could still see/select it. Root cause: `isFileVisibleForPartner()` (client, `directus-extension-media-uploader/src/interface.vue`), `filesPartnerOrFilter()` (client, `usePartnerScope.ts`), and `filterMediaJunctionByPartner()` (server, `extensions/api/src/utils/images.js`) all still carried a **fallback to the uploader's own partner scope** for files that "carry no explicit scope of their own" — a rule inherited from before `directus_files` had its own `partner_visibility`/`partner_selected` fields, when the uploader's partner was the *only* signal available.

That fallback is now obsolete (every file always has an explicit `partner_visibility`, schema default `all`) and was actively causing the bug: a file explicitly set to `partner_visibility: 'selected'` with **no partners chosen yet** (an edit-screen edge case, now possible since the native All/Selected radio is exposed) was still being shown to anyone who happened to share a partner with the *uploader* — even though the file's own explicit setting said "restrict this," the fallback silently widened it back out.

**Fix:** removed the uploader-fallback in all three places. A file's own `partner_visibility`/`partner_selected` is now fully authoritative:
- `partner_visibility: 'all'` → visible to everyone.
- `partner_visibility: 'selected'` → visible only to partners actually listed in `partner_selected` — including the edge case of an empty list, which now correctly means "visible to nobody" (except unrestricted `'all'`-visibility viewers), rather than silently falling back to the uploader.

Also removed the now-unused `fileUploaderPartnerIds()` helper and the `partnerIdsFromCreatedBy` import in `interface.vue` (album-level scoping in `partnerAlbumOrFilter` is unaffected — albums have no scope fields of their own, so the *album creator's* own partner is intentionally still the only signal there, that was never the bug).

**Verified**: the actual file you reported (`IPTC-GoogleImgSrcPmd_testimg01`, `partner_visibility: 'selected'`, `partner_selected: []`, uploaded by `botg@gmail.com`) — replicated the exact app-level filter as both `botg@gmail.com` and `karawane@gmail.com`: both now correctly get zero results for it.

## Conflict dialogue removed

Per your direction: with the bug above fixed, the "Media partner conflict" dialogue (built earlier this session — see `2026-09-14-media-partner-conflict-dialogue.md`) is no longer needed. The automatic show/hide mechanism it was layered on top of already existed and still works: `interface.vue`'s `splitRowsByPartner`/`isFileVisibleForPartner` already prunes each product's Media grid down to what the *viewing editor's own* partner scope can see (`rowsDraft`), while keeping anything outside that scope safely attached but hidden (`rowsHiddenOtherPartner`, preserved on Save, never rendered). So when a new partner is added to a product, or media is attached that doesn't cover every one of the product's partners, nothing needs to ask — each editor simply sees the media relevant to them, automatically, on every load.

Removed entirely from `directus-extension-media-uploader/src/interface.vue`: `collectionPartnerRelation`, `partnerJunctionTable`/`partnerCollectionFkField`/`partnerFkField`, `productVisibilityField`, the `PartnerConflictFile` type, `partnerConflictOpen`/`partnerConflictFiles`/`partnerConflictBusy`/`productPartnerIds` state, `checkPartnerConflicts()`, `resolvePartnerConflictExtend/Remove/Dismiss()`, the two `await checkPartnerConflicts()` calls in `onMounted`/the `primaryKey` watcher, the dialog's template block, and its scoped CSS.

## One thing worth knowing (not fixed, flagging only)

All of this partner-visibility filtering — for both media and products — is enforced **at the application level** (inside the Vue components' own queries), not as a Directus-native role/policy permission on the collections themselves. That means a request that bypasses the custom Media Library UI entirely (a raw API call, a different Directus module, an export) is only as restricted as whatever the requester's Directus role/policy otherwise allows — the partner filter isn't a hard row-level-security boundary. This was already true before this fix and is unrelated to it; making it a true server-enforced boundary would mean configuring Directus Permissions/Policies with dynamic `$CURRENT_USER` filters, which is a separate, larger piece of work I haven't scoped or built. Flagging it now since it's directly adjacent to what was just fixed.

## Verification

1. Rebuilt `media-bundle` and `extensions/api`, both clean.
2. Restarted Directus to pick up both rebuilds.
3. Replicated the exact app-level viewer-scope filter as `botg@gmail.com` and `karawane@gmail.com` against the real problem file — both now correctly return zero results.
4. Confirmed no leftover references to any removed conflict-dialogue symbol in `interface.vue`.
