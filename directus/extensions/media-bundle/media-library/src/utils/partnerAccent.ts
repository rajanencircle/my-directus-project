/** Unwrap partner.visually from a partner_selected relation (uuid | object). */
export function partnerVisuallyFromRelation(partnerSelected: unknown): string | null {
  if (partnerSelected == null || partnerSelected === '') return null
  if (typeof partnerSelected === 'object' && partnerSelected !== null) {
    const visually = (partnerSelected as { visually?: unknown }).visually
    if (visually == null || visually === '') return null
    const color = String(visually).trim()
    return color || null
  }
  return null
}

/** Partner display label from partner_selected relation. */
export function partnerLabelFromRelation(partnerSelected: unknown): string | null {
  if (partnerSelected == null || partnerSelected === '' || typeof partnerSelected !== 'object') {
    return null
  }
  const label = (partnerSelected as { label?: unknown }).label
  if (label == null || label === '') return null
  const text = String(label).trim()
  return text || null
}

/** Unwrap visually from a user object that may nest partner_selected.visually. */
export function partnerVisuallyFromUser(user: unknown): string | null {
  if (user == null || user === '' || typeof user !== 'object') return null
  return partnerVisuallyFromRelation((user as { partner_selected?: unknown }).partner_selected)
}

/** Partner label from nested uploaded_by / created_by user. */
export function partnerLabelFromUser(user: unknown): string | null {
  if (user == null || user === '' || typeof user !== 'object') return null
  return partnerLabelFromRelation((user as { partner_selected?: unknown }).partner_selected)
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
