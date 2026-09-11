import { getM2mJunctionInfo } from '../../../directus-extension-media-uploader/src/utils/persistUploadRelations'

type ApiClient = {
	get: (url: string, config?: Record<string, unknown>) => Promise<{ data: any }>
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

function specialList(field: any): string[] {
	const s = field?.meta?.special ?? field?.special
	if (!s) return []
	return Array.isArray(s) ? s : [String(s)]
}

/**
 * `/files/:id` often omits custom M2M aliases (keyword_ids). Load junction rows
 * and attach them in the shape list-m2m expects.
 */
export async function hydrateFileM2mFields(
	api: ApiClient,
	fileData: Record<string, any> | null,
	fields: any[],
	relations: RelationRow[],
): Promise<Record<string, any> | null> {
	if (!fileData?.id) return fileData

	const next = { ...fileData }
	const m2mFields = (fields ?? []).filter((f) => specialList(f).includes('m2m'))

	// Always try keywords even if fieldsStore hasn't hydrated yet
	const keys = new Set(m2mFields.map((f) => f.field as string))
	keys.add('keyword_ids')

	await Promise.all(
		[...keys].map(async (fieldKey) => {
			const existing = next[fieldKey]
			if (Array.isArray(existing) && existing.length > 0) return

			const junction = getM2mJunctionInfo(relations, 'directus_files', fieldKey)
			if (!junction) {
				// Hard fallback for the known keywords relation
				if (fieldKey !== 'keyword_ids') return
				try {
					const res = await api.get('/items/junction_directus_files_keywords', {
						params: {
							filter: { directus_files_id: { _eq: next.id } },
							fields: ['id', 'directus_files_id', 'keywords_id.id', 'keywords_id.keyword'],
							limit: -1,
						},
					})
					next[fieldKey] = res.data?.data ?? []
				} catch {
					// no read permission / missing collection
				}
				return
			}

			try {
				const res = await api.get(`/items/${junction.collection}`, {
					params: {
						filter: { [junction.manyField]: { _eq: next.id } },
						fields: [
							'*',
							`${junction.relatedField}.id`,
							`${junction.relatedField}.*`,
						],
						limit: -1,
					},
				})
				next[fieldKey] = res.data?.data ?? []
			} catch {
				// ignore — leave empty
			}
		}),
	)

	return next
}
