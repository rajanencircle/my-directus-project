<script setup lang="ts">
import { ref, computed, onMounted, watch, provide } from 'vue';
import { useApi, useStores } from '@directus/extensions-sdk';
import { useT } from './composables/useT';
import { resolveTranslatable } from './utils/translations';
import { resolveFieldTranslatedName } from './utils/field-label';
import MediaGrid from './components/MediaGrid.vue';
import UploadModal from './components/UploadModal.vue';
import AddExistingModal from './components/AddExistingModal.vue';
import DownloadModal from '../../media-library/src/components/download/DownloadModal.vue';
import {
  type DownloadChoice,
  type DownloadModalFile,
} from '../../media-library/src/utils/downloadVariants';
import { buildDownloadModalLabels } from '../../media-library/src/utils/downloadModalLabels';
import {
  downloadManyAsZipForChoice,
  downloadSingleForChoice,
} from '../../media-library/src/utils/downloadExecute';
import type { SaveTarget } from '../../media-library/src/utils/zipDownloadShared';
import { useMediaSettings } from '../../media-library/src/composables/useMediaSettings';
import { usePartnerScope, partnerIdsFromCreatedBy } from '../../media-library/src/composables/usePartnerScope';

// ─── Types ─────────────────────────────────────────────────────────────────

interface JunctionRow {
  id: number | string;
  [key: string]: any;
}

// ─── Props ──────────────────────────────────────────────────────────────────

const props = withDefaults(
  defineProps<{
    value?: any[];
    collection: string;
    field: string;
    primaryKey?: string | number;
    disabled?: boolean;
    // Interface options
    allowed_types?: string;
    max_file_size?: number | null;
    thumbnail_size?: number;
    readonly?: boolean;
    delete_files?: boolean;
    upload_area_folder?: string | null;
    file_reverse_links?: any;
    download_format_presets?: any;
    junction_flags?: any;
    geo_enabled?: boolean;
    geo_levels?: any;
    geo_cascades?: any;
    geo_filter_mappings?: any;
    geo_language_code?: string;
    geo_label_field?: string;
    upload_status_field?: string | null;
    upload_status_value?: string | null;
    upload_file_fields?: any;
    // Translatable UI labels — translation key selected from directus_translations
    section_label?: string | null;
    empty_label?: string | null;
    upload_button_label?: string | null;
    add_existing_button_label?: string | null;
    new_record_notice?: string | null;
    // Shared upload modal labels
    upload_modal_title?: string | null;
    upload_to_folder?: string | null;
    upload_drop_primary?: string | null;
    upload_drop_secondary?: string | null;
    upload_selected_label?: string | null;
    upload_ready_count?: string | null;
    upload_clear_all?: string | null;
    upload_geo_required_error?: string | null;
    // Shared folder labels
    folder_root?: string | null;
    folder_loading?: string | null;
    folder_no_access?: string | null;
    // Shared geo labels
    geo_section_title?: string | null;
    geo_no_results?: string | null;
    geo_loading?: string | null;
    // Add existing modal
    add_existing_title?: string | null;
    add_search_placeholder?: string | null;
    add_no_files?: string | null;
    add_per_page?: string | null;
    badge_linked?: string | null;
    badge_draft?: string | null;
    badge_expired?: string | null;
    why_expired?: string | null;
    add_to_album?: string | null;
    album_label?: string | null;
    album_create_new?: string | null;
    album_name_placeholder?: string | null;
    album_create_btn?: string | null;
    // Share modal
    share_title?: string | null;
    share_hint?: string | null;
    share_password_label?: string | null;
    share_password_placeholder?: string | null;
    share_expiry_label?: string | null;
    share_email_label?: string | null;
    share_email_placeholder?: string | null;
    share_create_btn?: string | null;
    share_success?: string | null;
    share_url_label?: string | null;
    share_copy_url?: string | null;
    // Expiry dialog
    expiry_title?: string | null;
    expiry_body?: string | null;
    expiry_warning?: string | null;
    // File details drawer
    drawer_tab_basic?: string | null;
    drawer_tab_iptc?: string | null;
    drawer_tab_geo?: string | null;
    drawer_iptc_title?: string | null;
    drawer_iptc_language?: string | null;
    drawer_iptc_caption?: string | null;
    // File media extras
    extras_downloads?: string | null;
    extras_download_original?: string | null;
    extras_no_assignments?: string | null;
    // Linked collections
    linked_title?: string | null;
    linked_empty?: string | null;
  }>(),
  {
    value: () => [],
    disabled: false,
    allowed_types: '*/*',
    max_file_size: null,
    thumbnail_size: 250,
    readonly: false,
    delete_files: false,
    geo_enabled: true,
    geo_language_code: 'en-GB',
    geo_label_field: 'translations.name',
  }
);

const emit = defineEmits<{
  (e: 'input', value: any[]): void;
}>();

// ─── State ───────────────────────────────────────────────────────────────────

const api = useApi();
const { useRelationsStore, useFieldsStore, useUserStore } = useStores();
const relationsStore = useRelationsStore();
const fieldsStore = useFieldsStore();
const userStore = useUserStore();

/** Current Directus UI language — drives junction flag labels. */
const appLocale = computed(() => {
	const lang = (userStore.currentUser as any)?.language;
	return (typeof lang === 'string' && lang) || document.documentElement.lang || 'en-US';
});
const { t } = useT();
const { settings, fetchSettings } = useMediaSettings();
const { partnerScopeIds, isPartnerScoped, init: initPartnerScope } = usePartnerScope();

const downloadModalLabels = computed(() =>
  buildDownloadModalLabels(t, settings.value as Record<string, string>),
);

// ─── Translated labels ────────────────────────────────────────────────────────

const labelSection = computed(() =>
  props.section_label ? t(props.section_label) : 'Media'
)
const labelEmpty = computed(() =>
  props.empty_label ? t(props.empty_label) : 'No files uploaded yet.'
)
const labelUpload = computed(() =>
  props.upload_button_label ? t(props.upload_button_label) : 'Upload File'
)
const labelAddExisting = computed(() =>
  props.add_existing_button_label ? t(props.add_existing_button_label) : 'Add Existing'
)
const labelNewRecordNotice = computed(() =>
  props.new_record_notice
    ? t(props.new_record_notice)
    : 'Upload or link files now — they will be attached when you save this record.'
)

const r = (key: string | null | undefined, fallback: string) =>
  key ? resolveTranslatable(key, t, fallback) : fallback

// Provide resolved labels to all descendant components via inject
provide('uploaderLabels', computed(() => ({
  // Upload modal
  uploadModalTitle: r(props.upload_modal_title, 'Upload Files'),
  uploadToFolder: r(props.upload_to_folder, 'Upload to folder'),
  uploadDropPrimary: r(props.upload_drop_primary, 'Drag & drop files here'),
  uploadDropSecondary: r(props.upload_drop_secondary, 'or click to browse'),
  uploadSelectedLabel: r(props.upload_selected_label, 'Selected'),
  uploadReadyCount: r(props.upload_ready_count, 'ready to upload'),
  uploadClearAll: r(props.upload_clear_all, 'Clear all'),
  uploadGeoRequiredError: r(props.upload_geo_required_error, 'Please fill in required geography fields'),
  uploadRequiredFieldsError: r(
    props.upload_required_fields_error ?? props.upload_file_fields_required_error,
    'Please fill in required fields',
  ),
  // Folder
  folderRoot: r(props.folder_root, 'File Library'),
  folderLoading: r(props.folder_loading, 'Loading folders…'),
  folderNoAccess: r(props.folder_no_access, 'No folders available.'),
  // Geo
  geoSectionTitle: r(props.geo_section_title, 'Geography'),
  geoNoResults: r(props.geo_no_results, 'No results found'),
  geoLoading: r(props.geo_loading, 'Loading…'),
  // Add existing
  addExistingTitle: r(props.add_existing_title, 'Add Existing'),
  addSearchPlaceholder: r(props.add_search_placeholder, 'Search media…'),
  addNoFiles: r(props.add_no_files, 'No files found.'),
  addPerPage: r(props.add_per_page, 'Per page'),
  badgeLinked: r(props.badge_linked, 'Linked'),
  badgeDraft: r(props.badge_draft, 'Draft'),
  badgeExpired: r(props.badge_expired, 'Don\'t use'),
  whyExpired: r(props.why_expired, 'Why is this expired?'),
  addToAlbum: r(props.add_to_album, 'Add to album'),
  albumLabel: r(props.album_label, 'Album'),
  albumCreateNew: r(props.album_create_new, 'Create new'),
  albumNamePlaceholder: r(props.album_name_placeholder, 'New album name…'),
  albumCreateBtn: r(props.album_create_btn, 'Create'),
  // Share
  shareTitle: r(props.share_title, 'Share File'),
  shareHint: r(props.share_hint, 'The link will be generated after you save. Optionally protect it with a password or set an expiry date.'),
  sharePasswordLabel: r(props.share_password_label, 'Password'),
  sharePasswordPlaceholder: r(props.share_password_placeholder, 'Leave blank for no password'),
  shareExpiryLabel: r(props.share_expiry_label, 'Expiry Date'),
  shareEmailLabel: r(props.share_email_label, 'Share via Email'),
  shareEmailPlaceholder: r(props.share_email_placeholder, 'Type email and press Enter'),
  shareCreateBtn: r(props.share_create_btn, 'Create Link'),
  shareSuccess: r(props.share_success, 'Share link created successfully!'),
  shareUrlLabel: r(props.share_url_label, 'Share URL'),
  shareCopyUrl: r(props.share_copy_url, 'Copy URL'),
  // Expiry
  expiryTitle: r(props.expiry_title, 'Don\'t use expired media'),
  expiryBody: r(props.expiry_body, 'has an expiry date'),
  expiryWarning: r(props.expiry_warning, 'Please avoid using this image in content if the expiry date has passed.'),
  // Drawer
  drawerTabBasic: r(props.drawer_tab_basic, 'Basic'),
  drawerTabIptc: r(props.drawer_tab_iptc, 'Rights / IPTC'),
  drawerTabGeo: r(props.drawer_tab_geo, 'Geography'),
  drawerIptcTitle: r(props.drawer_iptc_title, 'IPTC Caption'),
  drawerIptcLanguage: r(props.drawer_iptc_language, 'Language'),
  drawerIptcCaption: r(props.drawer_iptc_caption, 'Caption'),
  // Extras
  extrasDownloads: r(props.extras_downloads, 'Downloads'),
  extrasDownloadOriginal: r(props.extras_download_original, 'Download original'),
  extrasNoAssignments: r(props.extras_no_assignments, 'No assignments found.'),
  // Linked
  linkedTitle: r(props.linked_title, 'Linked collections'),
  linkedEmpty: r(props.linked_empty, 'No linked collections configured.'),
})))

const loading = ref(false);
const loadError = ref<string | null>(null);
const initError = ref<string | null>(null);
const junctionReady = ref(false);

const showUploadModal = ref(false);
const showAddExistingModal = ref(false);
const deleteTarget = ref<JunctionRow | null>(null);
const showDeleteConfirm = ref(false);
const deleteLoading = ref(false);

const defaultFolder = ref<string | null>(null);

const selectedFileId = ref<string | null>(null);

// Draft rows for form state (staged until parent record Save).
// This is what drives the UI, and what we emit back to Directus.
const rowsDraft = ref<JunctionRow[]>([]);
/** Junction rows for other partners — hidden in UI but kept on Save. */
const rowsHiddenOtherPartner = ref<JunctionRow[]>([]);
const lastEmittedValueSig = ref<string>('');

// ─── Relation-derived Junction Info ──────────────────────────────────────────
// Directus stores the M2M relation as: junction.{fk} → parent_collection,
// with meta.one_field = the alias field name on the parent.

const m2mRelation = computed(() =>
  (relationsStore.relations as any[]).find(
    (r) => r.related_collection === props.collection && r.meta?.one_field === props.field
  )
);

const junctionTable = computed(() => m2mRelation.value?.collection ?? `${props.collection}_files`);
const collectionFkField = computed(() => m2mRelation.value?.field ?? `${props.collection}_id`);
const filesFkField = computed(() => m2mRelation.value?.meta?.junction_field ?? 'directus_files_id');

const filesFkRelation = computed(() => {
  const junction = junctionTable.value;
  const fkField = filesFkField.value;
  return (relationsStore.relations as any[]).find((r) => r.collection === junction && r.field === fkField);
});

const filesRelatedCollection = computed(() => filesFkRelation.value?.related_collection ?? null);

/** Junction has a `sort` column (e.g. hotels_directus_files.sort). */
const hasSortField = computed(() => {
	try {
		return !!fieldsStore.getField(junctionTable.value, 'sort');
	} catch {
		return false;
	}
});

interface JunctionFlagDef {
	field: string;
	/** Optional static fallback; UI prefers Field Name Translations from the junction field. */
	label?: string;
}

const DEFAULT_JUNCTION_FLAGS: JunctionFlagDef[] = [
	{ field: 'is_map' },
	{ field: 'tour32_export' },
];

function parseJunctionFlags(raw: unknown): JunctionFlagDef[] {
	let parsed: unknown = raw;
	if (typeof raw === 'string') {
		try {
			parsed = JSON.parse(raw);
		} catch {
			return DEFAULT_JUNCTION_FLAGS;
		}
	}
	if (!Array.isArray(parsed)) return DEFAULT_JUNCTION_FLAGS;
	return parsed
		.map((item) => {
			if (!item || typeof item !== 'object') return null;
			const field = String((item as any).field ?? '').trim();
			if (!field) return null;
			const rawLabel = (item as any).label;
			const label =
				rawLabel == null || rawLabel === ''
					? undefined
					: String(rawLabel).trim() || undefined;
			return { field, label };
		})
		.filter(Boolean) as JunctionFlagDef[];
}

/** Configured flags that exist on this junction — labels from field translations. */
const activeJunctionFlags = computed(() => {
	const locale = appLocale.value;
	const junction = junctionTable.value;
	const defs = parseJunctionFlags(props.junction_flags);
	return defs
		.map((def) => {
			let fieldMeta: any = null;
			try {
				fieldMeta = fieldsStore.getField(junction, def.field);
			} catch {
				return null;
			}
			if (!fieldMeta) return null;
			const label = resolveFieldTranslatedName(
				fieldMeta,
				locale,
				def.label || def.field,
			);
			return { field: def.field, label };
		})
		.filter(Boolean) as Array<{ field: string; label: string }>;
});

const activeJunctionFlagFields = computed(() =>
	activeJunctionFlags.value.map((f) => f.field),
);

/** Pass-through for Upload modal — keep reactive to interface options. */
const uploadFileFieldsOption = computed(
	() => props.upload_file_fields ?? (props as any).uploadFileFields ?? null,
);

// ─── Computed ────────────────────────────────────────────────────────────────

const isNewRecord = computed(
  () => !props.primaryKey || props.primaryKey === '+' || props.primaryKey === ''
);

const effectiveReadonly = computed(() => props.readonly || props.disabled);

const linkedFileIds = computed(() =>
  [...rowsDraft.value, ...rowsHiddenOtherPartner.value]
    .map((r) => String(r[filesFkField.value]?.id ?? ''))
    .filter(Boolean)
);

function compareJunctionSort(a: JunctionRow, b: JunctionRow): number {
	const as = a?.sort == null || a.sort === '' ? Number.POSITIVE_INFINITY : Number(a.sort);
	const bs = b?.sort == null || b.sort === '' ? Number.POSITIVE_INFINITY : Number(b.sort);
	const aNum = Number.isFinite(as) ? as : Number.POSITIVE_INFINITY;
	const bNum = Number.isFinite(bs) ? bs : Number.POSITIVE_INFINITY;
	if (aNum !== bNum) return aNum - bNum;
	return String(a?.id ?? '').localeCompare(String(b?.id ?? ''));
}

function sortRowsBySort(rows: JunctionRow[]): JunctionRow[] {
	if (!hasSortField.value) return rows;
	return [...rows].sort(compareJunctionSort);
}

/** Rewrite sort to 1..n matching current visual order (for DnD / add / delete). */
function reindexSort() {
	if (!hasSortField.value) return;
	rowsDraft.value = rowsDraft.value.map((r, i) => ({ ...r, sort: i + 1 }));
}

function nextSortStart(): number {
	if (!hasSortField.value || !rowsDraft.value.length) return 1;
	let max = 0;
	for (const r of rowsDraft.value) {
		const n = Number(r?.sort);
		if (Number.isFinite(n) && n > max) max = n;
	}
	return max + 1;
}

// ─── Junction Init ────────────────────────────────────────────────────────────

function initJunction(): boolean {
  if (!m2mRelation.value) {
    initError.value = 'Could not find M2M relation for this field. Ensure the field is configured as a Many-to-Many.';
    return false;
  }

  // This interface is specifically a file manager: the M2M related side must be directus_files.
  // If attached to a different M2M (e.g. self-relations like cruises↔cruises), emitting staged rows
  // would write file IDs into the wrong FK column and cause INVALID_FOREIGN_KEY errors on save.
  if (!filesRelatedCollection.value) {
    initError.value =
      `This interface requires a Many-to-Many relation to directus_files, but the related collection could not be determined ` +
      `(junction: "${junctionTable.value}", junction field: "${filesFkField.value}"). ` +
      `Please configure the relation so the related collection is "directus_files".`;
    return false;
  }

  if (filesRelatedCollection.value !== 'directus_files') {
    initError.value =
      `This interface can only be used for Many-to-Many relations where the related collection is directus_files. ` +
      `This field is linked to "${filesRelatedCollection.value}" (junction: "${junctionTable.value}", junction field: "${filesFkField.value}"). ` +
      `Fix: create an M2M field from "${props.collection}" to "directus_files" (junction like "${props.collection}_directus_files") and use this interface there.`;
    return false;
  }
  return true;
}

// ─── Data Loading ─────────────────────────────────────────────────────────────

function fileUploaderPartnerIds(file: unknown): string[] {
  if (file == null || typeof file !== 'object') return [];
  const ub = (file as Record<string, unknown>).uploaded_by;
  return partnerIdsFromCreatedBy(ub);
}

/** File's own partner_selected (M2M) — empty means visible to everyone. */
function fileOwnPartnerIds(file: unknown): string[] {
  if (file == null || typeof file !== 'object') return [];
  const ps = (file as Record<string, unknown>).partner_selected;
  if (!Array.isArray(ps)) return [];
  return ps
    .map((row) => {
      const id = row && typeof row === 'object' ? (row as { partner_id?: { id?: unknown } }).partner_id?.id : null;
      return id != null && id !== '' ? String(id) : null;
    })
    .filter((id): id is string => id != null);
}

function isFileVisibleForPartner(file: unknown): boolean {
  const scopeIds = partnerScopeIds.value ?? [];
  if (!isPartnerScoped.value || scopeIds.length === 0) return true;
  const ownIds = fileOwnPartnerIds(file);
  if (ownIds.length > 0) return ownIds.some((id) => scopeIds.includes(id));
  return fileUploaderPartnerIds(file).some((id) => scopeIds.includes(id));
}

function splitRowsByPartner(rows: JunctionRow[]): { visible: JunctionRow[]; hidden: JunctionRow[] } {
  const fk = filesFkField.value;
  const visible: JunctionRow[] = [];
  const hidden: JunctionRow[] = [];
  for (const row of rows) {
    if (isFileVisibleForPartner(row?.[fk])) visible.push(row);
    else hidden.push(row);
  }
  return { visible, hidden };
}

async function loadFiles() {
  if (isNewRecord.value) return;
  loading.value = true;
  loadError.value = null;
  try {
    await initPartnerScope();
    const fk = filesFkField.value;
    const fileFields = [
      `${fk}.id`,
      `${fk}.type`,
      `${fk}.title`,
      `${fk}.filename_download`,
      `${fk}.generated_filename`,
      `${fk}.description`,
      `${fk}.copyright`,
      `${fk}.filesize`,
      `${fk}.uploaded_on`,
      `${fk}.created_on`,
      `${fk}.expiry_date`,
      `${fk}.draft_status`,
      `${fk}.modified_on`,
      `${fk}.width`,
      `${fk}.height`,
      `${fk}.media_sizes_cm`,
      `${fk}.uploaded_by.id`,
      `${fk}.uploaded_by.first_name`,
      `${fk}.uploaded_by.last_name`,
      `${fk}.uploaded_by.email`,
      `${fk}.uploaded_by.partner_selected.partner_id.id`,
      `${fk}.uploaded_by.partner_selected.partner_id.visually`,
      `${fk}.uploaded_by.partner_selected.partner_id.label`,
      `${fk}.partner_selected.partner_id.id`,
      `${fk}.partner_selected.partner_id.visually`,
      `${fk}.partner_selected.partner_id.label`,
      `${fk}.keyword_ids.keywords_id.keyword`,
    ];
    const fields = ['id', collectionFkField.value, ...fileFields];
    if (hasSortField.value) fields.push('sort');
    for (const flag of activeJunctionFlagFields.value) {
      if (!fields.includes(flag)) fields.push(flag);
    }

    const params: Record<string, any> = {
      filter: { [collectionFkField.value]: { _eq: props.primaryKey } },
      fields,
      limit: -1,
    };
    if (hasSortField.value) params.sort = ['sort'];

    const res = await api.get(`/items/${junctionTable.value}`, { params });
    const fresh = (res.data.data ?? []).map((row: any) => normalizeJunctionFileRow(row));
    const { visible, hidden } = splitRowsByPartner(fresh);
    rowsHiddenOtherPartner.value = hidden;
    rowsDraft.value = sortRowsBySort(visible);
  } catch (e: any) {
    loadError.value = e?.response?.data?.errors?.[0]?.message ?? 'Failed to load files.';
  } finally {
    loading.value = false;
  }
}

async function loadSettings() {
  try {
    const res = await api.get('/settings', {
      params: { fields: ['storage_default_folder'] },
    });
    defaultFolder.value = res.data.data?.storage_default_folder ?? null;
  } catch {
    // Non-fatal
  }
}

// ─── Draft staging helpers ───────────────────────────────────────────────────

async function hydrateDraftFromValue() {
  const raw = props.value ?? [];
  if (!Array.isArray(raw) || !raw.length) {
    rowsDraft.value = [];
    rowsHiddenOtherPartner.value = [];
    return;
  }

  await initPartnerScope();
  const fk = filesFkField.value;
  const hasNestedFiles = raw.some((item) => {
    const file = item?.[fk];
    return file && typeof file === 'object' && file.id;
  });

  if (hasNestedFiles) {
    const mapped = sortRowsBySort(
      raw.map((item) => {
        const file = item[fk];
        const fileId = typeof file === 'object' ? file.id : file;
        const rowId = item?.id && !String(item.id).startsWith('tmp:') ? item.id : `tmp:${fileId}`;
        return {
          ...item,
          id: rowId,
          [fk]: typeof file === 'object' ? file : { id: file },
        };
      }),
    );
    const { visible, hidden } = splitRowsByPartner(mapped);
    rowsHiddenOtherPartner.value = hidden;
    rowsDraft.value = visible;
    return;
  }

  const fileIds = raw
    .map((item) => {
      const file = item?.[fk];
      return typeof file === 'object' ? file?.id : file;
    })
    .map(String)
    .filter(Boolean);

  if (!fileIds.length) {
    rowsDraft.value = [];
    rowsHiddenOtherPartner.value = [];
    return;
  }

  try {
    const files = await fetchFilesByIds(fileIds);
    const byId = new Map(files.map((f: any) => [String(f.id), f]));
    const mapped = raw.map((item) => {
      const file = item?.[fk];
      const fileId = String(typeof file === 'object' ? file?.id : file);
      const resolved = byId.get(fileId) ?? (typeof file === 'object' ? file : { id: fileId });
      const rowId = item?.id && !String(item.id).startsWith('tmp:') ? item.id : `tmp:${fileId}`;
      return { ...item, id: rowId, [fk]: resolved };
    });
    const { visible, hidden } = splitRowsByPartner(mapped);
    rowsHiddenOtherPartner.value = hidden;
    rowsDraft.value = visible;
  } catch (e) {
    console.error('[media-uploader] Failed to hydrate draft from form value:', e);
  }
}

async function fetchFilesByIds(fileIds: string[]) {
  const ids = (fileIds ?? []).map(String).filter(Boolean);
  if (!ids.length) return [];

  const res = await api.get('/files', {
    params: {
      filter: { id: { _in: ids } },
      fields: [
        'id',
        'type',
        'title',
        'filename_download',
        'generated_filename',
        'description',
        'copyright',
        'filesize',
        'uploaded_on',
        'created_on',
        'expiry_date',
        'draft_status',
        'modified_on',
        'uploaded_by.id',
        'uploaded_by.first_name',
        'uploaded_by.last_name',
        'uploaded_by.email',
        'uploaded_by.partner_selected.partner_id.id',
        'uploaded_by.partner_selected.partner_id.visually',
        'uploaded_by.partner_selected.partner_id.label',
        'partner_selected.partner_id.id',
        'partner_selected.partner_id.visually',
        'partner_selected.partner_id.label',
        'keyword_ids.keywords_id.keyword',
      ],
      limit: -1,
    },
  });

  return (res.data?.data ?? []).map((f: any) => ({
    id: String(f.id),
    type: f.type ?? null,
    title: f.title ?? null,
    filename_download: f.filename_download ?? '',
    generated_filename: f.generated_filename ?? null,
    description: f.description ?? null,
    copyright: f.copyright ?? null,
    filesize: f.filesize ?? null,
    uploaded_on: f.uploaded_on ?? null,
    created_on: f.created_on ?? null,
    expiry_date: f.expiry_date ?? null,
    draft_status: f.draft_status ?? null,
    modified_on: f.modified_on ?? null,
    uploaded_by: f.uploaded_by ?? null,
    keywords: extractKeywordLabels(f.keyword_ids),
  }));
}

function extractKeywordLabels(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row: any) => {
      const k = row?.keywords_id;
      if (k == null) return '';
      if (typeof k === 'string' || typeof k === 'number') return String(k);
      return String(k.keyword ?? k.name ?? '').trim();
    })
    .filter(Boolean);
}

function normalizeJunctionFileRow(row: any) {
  const fk = filesFkField.value;
  const f = row?.[fk];
  if (!f || typeof f !== 'object') return row;
  return {
    ...row,
    [fk]: {
      ...f,
      keywords: extractKeywordLabels(f.keyword_ids),
    },
  };
}

async function stageAddFileIds(fileIds: string[]) {
  const incoming = (fileIds ?? []).map(String).filter(Boolean);
  if (!incoming.length) return;

  const existing = new Set(
    [...rowsDraft.value, ...rowsHiddenOtherPartner.value]
      .map((r) => String(r?.[filesFkField.value]?.id ?? ''))
      .filter(Boolean)
  );
  const toAdd = incoming.filter((id) => !existing.has(id));
  if (!toAdd.length) return;

  try {
    const files = await fetchFilesByIds(toAdd);
    let sortCursor = nextSortStart();
    const appended = files.map((f: any) => {
      const row: JunctionRow = {
        id: `tmp:${f.id}`,
        [filesFkField.value]: f,
      };
      if (hasSortField.value) {
        row.sort = sortCursor;
        sortCursor += 1;
      }
      return row;
    });
    rowsDraft.value = [...rowsDraft.value, ...appended];
    emitCurrentValue();
  } catch (e) {
    console.error('[media-uploader] Failed to stage added files:', e);
  }
}

// ─── Upload ──────────────────────────────────────────────────────────────────

function openUploadModal() {
  showUploadModal.value = true;
}

function onUploaded() {
  showUploadModal.value = false;
  // Upload modal will emit staged file IDs; no DB refresh needed here.
}

function openAddExistingModal() {
  showAddExistingModal.value = true;
}

function onLinkedExisting() {
  showAddExistingModal.value = false;
  // Add-existing modal will emit staged file IDs; no DB refresh needed here.
}

// ─── Delete ──────────────────────────────────────────────────────────────────

function requestDelete(row: JunctionRow) {
  deleteTarget.value = row;
  showDeleteConfirm.value = true;
}

async function confirmDelete() {
  if (!deleteTarget.value) return;
  const row = deleteTarget.value;
  const fileId = row[filesFkField.value]?.id;

  deleteLoading.value = true;
  try {
    // Stage removal locally; persistence happens when parent record is saved.
    rowsDraft.value = rowsDraft.value.filter((r) => r.id !== row.id);
    reindexSort();
    emitCurrentValue();

    // Optional: allow hard-delete of the underlying file only when explicitly enabled.
    // Note: This deletes the file immediately (cannot be undone by Discard).
    if (props.delete_files && fileId) await api.delete(`/files/${fileId}`).catch(() => {});
  } catch (e: any) {
    console.error('[media-uploader] Delete error:', e);
  } finally {
    deleteLoading.value = false;
    showDeleteConfirm.value = false;
    deleteTarget.value = null;
  }
}

function cancelDelete() {
  showDeleteConfirm.value = false;
  deleteTarget.value = null;
}

// ─── Drawer ───────────────────────────────────────────────────────────────────

function openDetails(row: JunctionRow) {
  const file = row[filesFkField.value];
  const id = file?.id;
  if (id) selectedFileId.value = String(id);
}

function closeDetails() {
  selectedFileId.value = null;
}

function onFileDrawerActive(active: boolean) {
  if (!active) closeDetails();
}

/** drawer-item only emits edits — it does not PATCH. Persist file metadata here. */
async function onFileDrawerSave(edits: Record<string, any>) {
  const id = selectedFileId.value;
  if (!id) return;

  const payload: Record<string, any> = { ...(edits ?? {}) };
  delete payload.id;

  if (!Object.keys(payload).length) {
    closeDetails();
    return;
  }

  try {
    await api.patch(`/files/${id}`, payload);

    const [updated] = await fetchFilesByIds([id]);
    if (updated) {
      const fk = filesFkField.value;
      rowsDraft.value = rowsDraft.value.map((row) => {
        if (String(row?.[fk]?.id) !== String(id)) return row;
        const prev = typeof row[fk] === 'object' && row[fk] ? row[fk] : {};
        return { ...row, [fk]: { ...prev, ...updated } };
      });
    }
  } catch (e) {
    console.error('[media-uploader] Failed to save file details:', e);
  } finally {
    closeDetails();
  }
}

// ─── Download All ─────────────────────────────────────────────────────────────

const downloadModalOpen = ref(false);
const isBulkDownloading = ref(false);

const downloadModalFiles = computed<DownloadModalFile[]>(() =>
  rowsDraft.value
    .map((row) => {
      const file = row[filesFkField.value];
      if (!file?.id) return null;
      return {
        id: String(file.id),
        filename: file.filename_download,
        type: file.type,
        width: file.width,
        height: file.height,
        media_sizes_cm: file.media_sizes_cm ?? null,
      } satisfies DownloadModalFile;
    })
    .filter((f): f is DownloadModalFile => Boolean(f)),
);

async function handleBulkDownload(choice: DownloadChoice, saveTarget: SaveTarget) {
  if (isBulkDownloading.value) return;
  isBulkDownloading.value = true;
  try {
    const files = downloadModalFiles.value.map((file) => ({
      id: file.id,
      type: file.type,
      filename_download: file.filename ?? null,
      title: file.filename ?? null,
      width: file.width ?? null,
      height: file.height ?? null,
      media_sizes_cm: file.media_sizes_cm ?? null,
    }));
    if (!files.length) return;
    if (files.length === 1) {
      await downloadSingleForChoice(api, files[0], choice, saveTarget);
      return;
    }
    const result = await downloadManyAsZipForChoice(api, files, 'media', choice, saveTarget);
    if (!result.ok) throw new Error('Bulk download failed');
  } finally {
    isBulkDownloading.value = false;
  }
}

// ─── Emit ────────────────────────────────────────────────────────────────────

function onReorder(nextRows: JunctionRow[]) {
  rowsDraft.value = nextRows;
  reindexSort();
  emitCurrentValue();
}

function onJunctionFlagChange(payload: { row: JunctionRow; field: string; value: boolean }) {
  const { row, field, value } = payload;
  rowsDraft.value = rowsDraft.value.map((r) =>
    r.id === row.id ? { ...r, [field]: value } : r,
  );
  emitCurrentValue();
}

function emitCurrentValue() {
  // Emit a value that Directus can persist on parent Save:
  // - keep existing junction items by id
  // - create new junction items using the junction file FK field
  // - include sort when the junction has a sort column
  // - include per-assignment junction flags (is_map, tour32_export, …)
  // - preserve other-partner rows that are hidden in the UI
  const combined = [...rowsHiddenOtherPartner.value, ...rowsDraft.value];
  const out = combined.map((r, index) => {
    const file = r?.[filesFkField.value];
    const fileId = file?.id ?? file;
    const base: Record<string, any> = {};

    if (r?.id && !String(r.id).startsWith('tmp:')) base.id = r.id;
    if (fileId) base[filesFkField.value] = fileId;
    if (hasSortField.value) {
      base.sort = r?.sort != null && r.sort !== '' ? Number(r.sort) : index + 1;
    } else if ('sort' in r) {
      base.sort = r.sort;
    }
    for (const flag of activeJunctionFlagFields.value) {
      base[flag] = !!r?.[flag];
    }
    return base;
  });

  const sig = JSON.stringify(out);
  lastEmittedValueSig.value = sig;
  emit('input', out);
}

// ─── Lifecycle ───────────────────────────────────────────────────────────────

onMounted(async () => {
  await Promise.all([loadSettings(), fetchSettings(), initPartnerScope()]);
  const ready = initJunction();
  junctionReady.value = ready;
  if (!ready) return;
  if (isNewRecord.value) {
    await hydrateDraftFromValue();
  } else {
    await loadFiles();
  }
});

watch(
  () => props.primaryKey,
  async (newKey, oldKey) => {
    if (newKey && newKey !== '+' && newKey !== oldKey) {
      const ready = initJunction();
      junctionReady.value = ready;
      if (ready) await loadFiles();
    }
  }
);

// If Directus resets the field value (e.g. Discard), reset the draft from DB.
// We intentionally use DB state as the truth on discard to ensure we revert.
watch(
  () => props.value,
  async () => {
    const nextSig = JSON.stringify(props.value ?? []);
    if (nextSig === lastEmittedValueSig.value) return;
    if (isNewRecord.value) {
      await hydrateDraftFromValue();
    } else {
      await loadFiles();
    }
  },
  { deep: true }
);
</script>

<template>
  <div class="media-uploader">
    <!-- Init error -->
    <div v-if="initError" class="notice notice-error">
      <v-icon name="error" small />
      {{ initError }}
    </div>

    <template v-else>
      <div v-if="isNewRecord" class="notice notice-info">
        <v-icon name="info" small />
        {{ labelNewRecordNotice }}
      </div>
      <!-- Header -->
      <div class="header">
        <span class="header-title">{{ labelSection }} ({{ rowsDraft.length }})</span>
        <div class="header-actions">
          <v-button
            v-if="!effectiveReadonly && rowsDraft.length > 0"
            secondary
            icon
            :disabled="loading || isBulkDownloading"
            :loading="isBulkDownloading"
            :title="t('download')"
            @click="downloadModalOpen = true"
          >
            <v-icon name="download" />
          </v-button>
          <v-button
            v-if="!effectiveReadonly"
            :disabled="loading || !junctionReady"
            @click="openUploadModal"
          >
            <v-icon name="upload" small />
            {{ labelUpload }}
          </v-button>
          <v-button
            v-if="!effectiveReadonly"
            secondary
            :disabled="loading || !junctionReady"
            @click="openAddExistingModal"
          >
            <v-icon name="link" small />
            {{ labelAddExisting }}
          </v-button>
        </div>
      </div>

      <!-- Loading skeleton -->
      <div v-if="loading" class="loading-wrap">
        <v-progress-circular indeterminate />
      </div>

      <!-- Load error -->
      <div v-else-if="loadError" class="notice notice-error">
        <v-icon name="error" small />
        {{ loadError }}
      </div>

      <!-- Grid -->
      <MediaGrid
        v-else
        :rows="rowsDraft"
        :thumbnail-size="thumbnail_size"
        :readonly="effectiveReadonly"
        :sortable="hasSortField && !effectiveReadonly"
        :junction-flags="activeJunctionFlags"
        :files-fk-field="filesFkField"
        :empty-label="labelEmpty"
        @delete="requestDelete"
        @open="openDetails"
        @reorder="onReorder"
        @flag-change="onJunctionFlagChange"
      />
    </template>

    <!-- Upload modal -->
    <UploadModal
      v-if="showUploadModal"
      :junction-table="junctionTable"
      :collection-fk-field="collectionFkField"
      :files-fk-field="filesFkField"
      :primary-key="primaryKey ?? ''"
      :allowed-types="allowed_types"
      :max-file-size="max_file_size"
      :default-folder="defaultFolder"
      :upload-area-folder="upload_area_folder ?? null"
      :geo-enabled="geo_enabled"
      :geo-levels="geo_levels"
      :geo-cascades="geo_cascades"
      :geo-filter-mappings="geo_filter_mappings"
      :geo-language-code="geo_language_code"
      :geo-label-field="geo_label_field"
      :upload-status-field="upload_status_field ?? 'directus_status'"
      :upload-status-value="upload_status_value ?? 'draft'"
      :upload-file-fields="uploadFileFieldsOption"
      @close="showUploadModal = false"
      @uploaded="(fileIds: string[]) => { showUploadModal = false; stageAddFileIds(fileIds); }"
    />

    <AddExistingModal
      v-if="showAddExistingModal"
      :junction-table="junctionTable"
      :collection-fk-field="collectionFkField"
      :files-fk-field="filesFkField"
      :primary-key="primaryKey ?? ''"
      :allowed-types="allowed_types ?? '*/*'"
      :thumbnail-size="thumbnail_size ?? 180"
      :default-folder="defaultFolder"
      :already-linked-file-ids="linkedFileIds"
      :file-reverse-links="file_reverse_links"
      :download-format-presets="download_format_presets"
      @close="showAddExistingModal = false"
      @linked="(fileIds: string[]) => { showAddExistingModal = false; stageAddFileIds(fileIds); }"
    />

    <drawer-item
      v-if="selectedFileId"
      :active="true"
      collection="directus_files"
      :primary-key="selectedFileId"
      :edits="{}"
      @input="onFileDrawerSave"
      @update:active="onFileDrawerActive"
    />

    <!-- Delete confirmation dialog -->
    <v-dialog
      v-model="showDeleteConfirm"
      @update:model-value="(v: boolean) => !v && cancelDelete()"
    >
      <v-card class="confirm-card">
        <v-card-title class="confirm-title">
          <v-icon name="warning" class="confirm-icon" />
          {{ t('delete_item', { count: 1 }) }}
        </v-card-title>
        <v-card-text class="confirm-body">
          <p>{{ t('action_cannot_be_undone') }}</p>
          <p v-if="delete_files" class="confirm-warn">
            This will <strong>permanently delete</strong> the file from the media library.
          </p>
        </v-card-text>
        <v-card-actions class="confirm-actions">
          <v-button secondary :disabled="deleteLoading" @click="cancelDelete">{{ t('cancel') }}</v-button>
          <v-button
            :loading="deleteLoading"
            class="danger-btn"
            @click="confirmDelete"
          >
            {{ delete_files ? t('delete') : t('remove') }}
          </v-button>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <DownloadModal
      v-model="downloadModalOpen"
      :mode="downloadModalFiles.length > 1 ? 'zip' : 'single'"
      :files="downloadModalFiles"
      zip-base-name="media"
      :labels="downloadModalLabels"
      :on-zip-download="handleBulkDownload"
      :on-single-download="handleBulkDownload"
    />
  </div>
</template>

<style scoped>
.media-uploader {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 12px 12px;
  border: 1px solid var(--theme--border-color);
  border-radius: var(--theme--border-radius);
  background: var(--theme--background-normal);
  font-family: var(--theme--fonts--sans--font-family);
  min-height: 80px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}

.header-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--theme--foreground-subdued);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  flex-shrink: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.loading-wrap {
  display: flex;
  justify-content: center;
  padding: 24px;
}

.notice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: var(--theme--border-radius);
  font-size: 13px;
  font-family: var(--theme--fonts--sans--font-family);
}

.notice-error {
  background: color-mix(in srgb, var(--theme--danger, #dc3545) 10%, transparent);
  color: var(--theme--danger, #dc3545);
  border: 1px solid color-mix(in srgb, var(--theme--danger, #dc3545) 30%, transparent);
}

.notice-info {
  background: var(--theme--background-subdued);
  color: var(--theme--foreground-subdued);
  border: 1px solid var(--theme--border-color);
}

.confirm-card {
  width: 400px;
  max-width: 95vw;
  font-family: var(--theme--fonts--sans--font-family);
}

.confirm-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  padding: 20px 20px 0;
  color: var(--theme--foreground);
}

.confirm-icon {
  color: var(--theme--warning, #fd7e14);
}

.confirm-body {
  padding: 12px 20px;
  font-size: 14px;
  color: var(--theme--foreground);
}

.confirm-body p {
  margin: 0 0 8px;
}

.confirm-body p:last-child {
  margin-bottom: 0;
}

.confirm-warn {
  font-size: 13px;
  color: var(--theme--danger, #dc3545);
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 20px 20px;
}

.danger-btn {
  --v-button-background-color: var(--theme--danger, #dc3545);
  --v-button-background-color-hover: color-mix(in srgb, var(--theme--danger, #dc3545) 85%, black);
}
.v-menu-popper[data-v-9c1fb067] {
z-index: 300 !important;
}
</style>
