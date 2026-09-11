type PartnerLike = { id?: unknown; label?: unknown; visually?: unknown }

/** Normalize a `partner_selected` M2M value (array of junction rows) to the nested partner objects. */
function partnersFromSelected(partnerSelected: unknown): PartnerLike[] {
  if (!Array.isArray(partnerSelected)) return []
  return partnerSelected
    .map((row) => {
      if (row == null || typeof row !== 'object') return null
      const partner = (row as { partner_id?: unknown }).partner_id
      return partner != null && typeof partner === 'object' ? (partner as PartnerLike) : null
    })
    .filter((p): p is PartnerLike => p != null)
}

/** All accent colors for a `partner_selected` M2M relation (one file/user may have several partners). */
export function partnerVisuallyListFromRelation(partnerSelected: unknown): string[] {
  return partnersFromSelected(partnerSelected)
    .map((p) => (p.visually != null && String(p.visually).trim() ? String(p.visually).trim() : null))
    .filter((c): c is string => c != null)
}

/** @deprecated kept for call sites not yet migrated — returns the first accent color only. */
export function partnerVisuallyFromRelation(partnerSelected: unknown): string | null {
  return partnerVisuallyListFromRelation(partnerSelected)[0] ?? null
}

/** All partner labels for a `partner_selected` M2M relation. */
export function partnerLabelListFromRelation(partnerSelected: unknown): string[] {
  return partnersFromSelected(partnerSelected)
    .map((p) => (p.label != null && String(p.label).trim() ? String(p.label).trim() : null))
    .filter((l): l is string => l != null)
}

/** @deprecated kept for call sites not yet migrated — returns the first partner label only. */
export function partnerLabelFromRelation(partnerSelected: unknown): string | null {
  return partnerLabelListFromRelation(partnerSelected)[0] ?? null
}

/** All accent colors for a user/file object's own or nested `uploaded_by`/`created_by`.partner_selected. */
export function partnerVisuallyListFromUser(user: unknown): string[] {
  if (user == null || typeof user !== 'object') return []
  return partnerVisuallyListFromRelation((user as { partner_selected?: unknown }).partner_selected)
}

/** @deprecated kept for call sites not yet migrated — returns the first accent color only. */
export function partnerVisuallyFromUser(user: unknown): string | null {
  return partnerVisuallyListFromUser(user)[0] ?? null
}

/** All partner labels for a user/file's `partner_selected`. */
export function partnerLabelListFromUser(user: unknown): string[] {
  if (user == null || typeof user !== 'object') return []
  return partnerLabelListFromRelation((user as { partner_selected?: unknown }).partner_selected)
}

/** @deprecated kept for call sites not yet migrated — returns the first partner label only. */
export function partnerLabelFromUser(user: unknown): string | null {
  return partnerLabelListFromUser(user)[0] ?? null
}

/** Display name from a Directus user object. */
export function userDisplayName(user: unknown): string | null {
  if (user == null || user === '') return null
  if (typeof user !== 'object') return String(user)
  const u = user as {
    first_name?: unknown
    last_name?: unknown
    email?: unknown
  }
  const name = [u.first_name, u.last_name]
    .map((p) => (p == null ? '' : String(p).trim()))
    .filter(Boolean)
    .join(' ')
  if (name) return name
  if (u.email != null && String(u.email).trim()) return String(u.email).trim()
  return null
}

/** CSS custom-property style for partner accent, or undefined when no color. */
export function partnerAccentStyle(
  color: string | null | undefined,
): Record<string, string> | undefined {
  const c = color?.trim()
  if (!c) return undefined
  return { '--partner-accent': c }
}

const MULTI_PARTNER_ACCENT = 'var(--theme--foreground-subdued, #b0b6c1)'

/**
 * Accent style for a list of partner colors: a single partner's own color when there's
 * exactly one, a neutral "mixed" treatment when there's more than one, undefined when
 * there's none (file/user visible to all partners — no accent).
 */
export function partnerAccentStyleForList(
  colors: string[] | null | undefined,
): Record<string, string> | undefined {
  if (!colors || colors.length === 0) return undefined
  if (colors.length === 1) return partnerAccentStyle(colors[0])
  return { '--partner-accent': MULTI_PARTNER_ACCENT, '--partner-accent-mixed': 'true' }
}
