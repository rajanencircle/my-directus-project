import {
	isM2mField,
	extractM2mRelatedIds,
	coerceRelatedId,
} from './uploadFileFields'

type ApiClient = {
	post: (url: string, data?: unknown) => Promise<{ data: any }>
	patch: (url: string, data?: unknown) => Promise<{ data: any }>
}

type RelationRow = {
	collection?: string
	field?: string
	related_collection?: string | null
	meta?: {
		one_collection?: string | null
		one_field?: string | null
		junction_field?: string | null
	} | null
}

export type M2mJunctionInfo = {
	collection: string
	/** FK on junction pointing at the parent (directus_files) */
	manyField: string
	/** FK on junction pointing at the related collection (keywords) */
	relatedField: string
}

/** Resolve junction table + FK columns for an M2M alias on a collection. */
export function getM2mJunctionInfo(
	relations: RelationRow[],
	collection: string,
	field: string,
): M2mJunctionInfo | null {
	const rel = relations.find(
		(r) => r.related_collection === collection && r.meta?.one_field === field,
	)
	if (!rel?.collection || !rel.field || !rel.meta?.junction_field) return null
	return {
		collection: rel.collection,
		manyField: rel.field,
		relatedField: rel.meta.junction_field,
	}
}

/**
 * Persist upload modal field values after the file binary is created.
 * - M2M (e.g. keyword_ids): create junction rows directly (avoids /files nested
 *   relation updates that often 403 for non-admin roles).
 * - Other patch fields: PATCH /files/:id
 */
export async function persistUploadFieldRelations(
	api: ApiClient,
	fileId: string,
	fields: any[],
	patchFields: Record<string, unknown>,
	relations: RelationRow[],
): Promise<void> {
	const scalarPatch: Record<string, unknown> = {}

	for (const [key, value] of Object.entries(patchFields)) {
		const field = fields.find((f) => f.field === key)
		if (field && isM2mField(field)) {
			const ids = [
				...new Set(
					extractM2mRelatedIds(value)
						.map(coerceRelatedId)
						.filter((id): id is string | number => id != null),
				),
			]

			const junction = getM2mJunctionInfo(relations, 'directus_files', key)
			if (!junction) {
				throw new Error(`Could not resolve M2M junction for field "${key}".`)
			}
			if (ids.length === 0) {
				// Staged "Create New" rows use id "+" — nothing valid to link yet.
				continue
			}

			const rows = ids.map((relatedId) => ({
				[junction.manyField]: fileId,
				[junction.relatedField]: relatedId,
			}))

			await api.post(`/items/${junction.collection}`, rows)
			continue
		}

		scalarPatch[key] = value
	}

	if (Object.keys(scalarPatch).length > 0) {
		await api.patch(`/files/${fileId}`, scalarPatch)
	}
}
