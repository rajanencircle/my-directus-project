export type UploadFileFieldDef = {
	field: string
	label?: string
}

/** Parse interface option JSON: [{ "field": "keyword_ids" }, ...] */
export function parseUploadFileFields(raw: unknown): UploadFileFieldDef[] {
	let parsed: unknown = raw
	// Directus may double-encode JSON options as a string
	for (let i = 0; i < 2; i++) {
		if (typeof parsed !== 'string') break
		const trimmed = parsed.trim()
		if (!trimmed) return []
		try {
			parsed = JSON.parse(trimmed)
		} catch {
			return []
		}
	}
	if (!Array.isArray(parsed)) return []
	return parsed
		.map((item) => {
			if (!item || typeof item !== 'object') return null
			const field = String((item as { field?: unknown }).field ?? '').trim()
			if (!field) return null
			const rawLabel = (item as { label?: unknown }).label
			const label =
				rawLabel == null || rawLabel === ''
					? undefined
					: String(rawLabel).trim() || undefined
			return { field, label }
		})
		.filter(Boolean) as UploadFileFieldDef[]
}

const SKIP_SPECIAL = new Set(['no-data', 'group', 'translations'])

function specialList(field: { type?: string; meta?: { special?: string[] | string | null } | null; special?: string[] | string | null }): string[] {
	const s = field?.meta?.special ?? field?.special
	if (!s) return []
	return Array.isArray(s) ? s : [String(s)]
}

/** Fields that should not appear in the upload form (groups / presentation / translations). */
export function isNonWritableUploadField(field: any): boolean {
	if (!field?.field) return true
	const specials = specialList(field)
	if (specials.some((s) => SKIP_SPECIAL.has(s))) return true
	// Presentation groups only — allow m2m aliases like keyword_ids
	if (specials.includes('alias') && !specials.includes('m2m')) return true
	if (field.type === 'alias' && !specials.includes('m2m')) return true
	return false
}

export function isM2mField(field: any): boolean {
	return specialList(field).includes('m2m')
}

export function isJsonField(field: any): boolean {
	if (field?.type === 'json') return true
	return specialList(field).includes('cast-json')
}

/** True when value should go in post-upload PATCH instead of multipart FormData. */
export function needsPatchPersist(field: any): boolean {
	return isM2mField(field) || isJsonField(field)
}

function isEmptyValue(value: unknown): boolean {
	if (value == null) return true
	if (typeof value === 'string' && value.trim() === '') return true
	if (Array.isArray(value) && value.length === 0) return true
	if (typeof value === 'object' && !Array.isArray(value)) {
		const obj = value as Record<string, unknown>
		// Relational update payload from list-m2m
		if ('create' in obj || 'update' in obj || 'delete' in obj) {
			const create = Array.isArray(obj.create) ? obj.create : []
			const update = Array.isArray(obj.update) ? obj.update : []
			const del = Array.isArray(obj.delete) ? obj.delete : []
			return create.length === 0 && update.length === 0 && del.length === 0
		}
		if ('id' in obj) return obj.id == null || obj.id === ''
		if (Object.keys(obj).length === 0) return true
	}
	return false
}

/** Required fields (meta.required) that are still empty. */
export function getMissingRequiredUploadFields(
	fields: any[],
	values: Record<string, unknown> | null | undefined,
): any[] {
	return fields.filter((f) => {
		if (!f?.meta?.required) return false
		return isEmptyValue(values?.[f.field])
	})
}

/** Normalize a v-form value for FormData (scalars / M2O PK). */
export function toFormDataValue(value: unknown): string | null {
	if (value == null) return null
	if (typeof value === 'boolean') return value ? 'true' : 'false'
	if (typeof value === 'number') return String(value)
	if (typeof value === 'string') {
		const t = value.trim()
		return t === '' ? null : t
	}
	if (typeof value === 'object' && !Array.isArray(value)) {
		const id = (value as { id?: unknown }).id
		if (id == null || id === '') return null
		return String(id)
	}
	return null
}

export function isPlaceholderRelationId(id: unknown): boolean {
	if (id == null) return true
	if (typeof id === 'number') return Number.isFinite(id)
		? false
		: true
	if (typeof id !== 'string') return true
	const s = id.trim()
	if (!s) return true
	// list-m2m / v-form staging markers for unsaved junction rows
	if (s === '+') return true
	if (s.startsWith('$')) return true
	if (s.startsWith('tmp:')) return true
	return false
}

/** Coerce a related PK; reject placeholders like "+". */
export function coerceRelatedId(id: unknown): string | number | null {
	if (isPlaceholderRelationId(id)) return null
	if (typeof id === 'number') return id
	if (typeof id === 'string') {
		const t = id.trim()
		if (/^\d+$/.test(t)) return Number(t)
		// uuid / string PKs
		return t
	}
	return null
}

/**
 * Pull the related-collection PK from a list-m2m row.
 * Prefer junction FKs (e.g. keywords_id) over row `id` — create rows often look like
 * `{ id: '+', keywords_id: 16 }` and using `id` would persist "+" incorrectly.
 */
export function relatedIdFromM2mEntry(entry: unknown): string | number | null {
	if (entry == null) return null
	if (typeof entry === 'string' || typeof entry === 'number') {
		return coerceRelatedId(entry)
	}
	if (typeof entry !== 'object') return null

	const o = entry as Record<string, unknown>
	const candidates: unknown[] = []

	// 1) Junction FKs first: keywords_id / nested { id }
	for (const [k, v] of Object.entries(o)) {
		if (k === 'id' || k.startsWith('$')) continue
		if (v != null && (typeof v === 'string' || typeof v === 'number')) {
			candidates.push(v)
			continue
		}
		if (v && typeof v === 'object') {
			const nestedId = (v as { id?: unknown }).id
			if (nestedId != null && typeof nestedId !== 'object') candidates.push(nestedId)
		}
	}

	// 2) Row id last (only real related PKs, never "+")
	if (o.id != null && typeof o.id !== 'object') candidates.push(o.id)

	for (const c of candidates) {
		const id = coerceRelatedId(c)
		if (id != null) return id
	}
	return null
}

/**
 * Flatten any list-m2m / relational-update shape into related PKs only.
 * Never returns "+" or other staging placeholders.
 */
export function extractM2mRelatedIds(value: unknown): (string | number)[] {
	if (value == null) return []

	const out: (string | number)[] = []
	const push = (v: unknown) => {
		const id = relatedIdFromM2mEntry(v)
		if (id != null) out.push(id)
	}

	if (typeof value === 'string' || typeof value === 'number') {
		push(value)
		return out
	}

	if (Array.isArray(value)) {
		for (const entry of value) push(entry)
		return out
	}

	if (typeof value === 'object') {
		const o = value as Record<string, unknown>
		// Directus relational update: { create, update, delete }
		if ('create' in o || 'update' in o || 'delete' in o) {
			for (const row of [o.create, o.update].flat()) {
				if (row != null) push(row)
			}
			return out
		}
		push(o)
	}

	return out
}

/**
 * Normalize M2M / list values from v-form into a PATCH-friendly payload.
 * Accepts PK arrays, or junction-like rows with related id keys.
 */
export function toPatchRelationValue(value: unknown, field: any): unknown {
	if (value == null) return value
	if (!isM2mField(field)) {
		if (isJsonField(field) && typeof value === 'string') {
			try {
				return JSON.parse(value)
			} catch {
				return value
			}
		}
		return value
	}
	// Always flatten to related PKs — never forward raw { create: [{ keywords_id: '+' }] }
	return extractM2mRelatedIds(value)
}

/** Detect junction FK key from staged list-m2m rows (e.g. keywords_id). */
function detectJunctionRelatedField(raw: unknown): string | null {
	if (!Array.isArray(raw)) return null
	for (const entry of raw) {
		if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue
		for (const k of Object.keys(entry as object)) {
			if (k === 'id' || k.startsWith('$')) continue
			return k
		}
	}
	return null
}

export function splitUploadFieldPayload(
	fields: any[],
	values: Record<string, unknown>,
): { formDataFields: Record<string, string>; patchFields: Record<string, unknown> } {
	const formDataFields: Record<string, string> = {}
	const patchFields: Record<string, unknown> = {}

	for (const field of fields) {
		const key = field.field as string
		if (!(key in values)) continue
		const raw = values[key]
		if (isEmptyValue(raw)) continue

		if (needsPatchPersist(field)) {
			const normalized = toPatchRelationValue(raw, field)
			if (isEmptyValue(normalized)) continue

			// Prefer create[] shape for M2M so Directus links related items reliably
			// after multipart upload (avoids placeholder row ids like "+").
			if (isM2mField(field) && Array.isArray(normalized)) {
				const junctionField = detectJunctionRelatedField(raw) ?? `${key.replace(/_ids?$/, '')}_id`
				patchFields[key] = {
					create: normalized.map((id) => ({ [junctionField]: id })),
					update: [],
					delete: [],
				}
			} else {
				patchFields[key] = normalized
			}
			continue
		}

		const fd = toFormDataValue(raw)
		if (fd != null) formDataFields[key] = fd
	}

	return { formDataFields, patchFields }
}
