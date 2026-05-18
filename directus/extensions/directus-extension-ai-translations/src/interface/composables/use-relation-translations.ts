/**
 * Adapted from Directus source:
 * app/src/composables/use-relation-translations.ts
 *
 * All @/ imports replaced with useStores() from the extensions SDK.
 */
import { useStores, useApi } from '@directus/extensions-sdk';
import { computed, ref, Ref, watch } from 'vue';

export type RelationTranslationsData = {
	// The junction/translation collection items keyed by language code
	byLanguage: Record<string, Record<string, any>>;
	// Raw array of all translation items (mirrors the `value` prop shape)
	rawItems: Record<string, any>[];
};

export function useRelationTranslations(
	value: Ref<Record<string, any>[] | null | undefined>,
	translationsCollection: Ref<string | null | undefined>,
	languageField: Ref<string | null | undefined>
) {
	const api = useApi();
	const { useCollectionsStore, useFieldsStore } = useStores();
	const collectionsStore = useCollectionsStore();
	const fieldsStore = useFieldsStore();

	// ------------------------------------------------------------------
	// Fields for the translation junction collection
	// ------------------------------------------------------------------
	const fields = computed(() => {
		if (!translationsCollection.value) return [];
		return fieldsStore.getFieldsForCollection(translationsCollection.value) ?? [];
	});

	// ------------------------------------------------------------------
	// Translatabe fields (exclude system / relation fields)
	// ------------------------------------------------------------------
	const translatableFields = computed(() => {
		return fields.value.filter((f: any) => {
			// skip the language indicator field
			if (f.field === languageField.value) return false;
			// skip primary key
			if (f.schema?.is_primary_key) return false;
			// skip sort / status / created_on etc.
			const systemFields = ['sort', 'status', 'date_created', 'date_updated', 'user_created', 'user_updated'];
			if (systemFields.includes(f.field)) return false;
			return true;
		});
	});

	// ------------------------------------------------------------------
	// Build a { [langCode]: item } map from value array
	// ------------------------------------------------------------------
	const byLanguage = computed<Record<string, Record<string, any>>>(() => {
		const map: Record<string, Record<string, any>> = {};
		if (!value.value || !languageField.value) return map;
		for (const item of value.value) {
			const lang = item[languageField.value!];
			if (lang) map[lang] = { ...item };
		}
		return map;
	});

	return {
		fields,
		translatableFields,
		byLanguage,
	};
}
