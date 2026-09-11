<template>
	<v-dialog :model-value="modelValue" persistent @esc="onCancel" @update:model-value="onDialogUpdate">
		<v-card class="download-modal">
			<header class="download-modal-header">
				<div class="header-icon" aria-hidden="true">
					<v-icon name="download" />
				</div>
				<div class="header-text">
					<v-card-title class="download-modal-title">{{ labels.title }}</v-card-title>
					<p v-if="contextLine" class="download-modal-subtitle">{{ contextLine }}</p>
				</div>
				<button
					type="button"
					class="header-close-btn"
					:disabled="busy"
					:aria-label="labels.cancel"
					@click="onCancel"
				>
					<v-icon name="close" small />
				</button>
			</header>

			<div class="download-modal-scroll">
				<v-card-text class="download-modal-body">
				<v-notice v-if="originalOnlyHint" type="info" class="info-notice">
					{{ originalOnlyHintText }}
				</v-notice>

				<template v-if="!originalOnlyHint">
					<section class="section">
						<p class="section-label">{{ labels.useCase }}</p>
						<div class="use-case-grid" role="radiogroup" :aria-label="labels.useCase">
							<button
								type="button"
								class="use-case-card"
								:class="{ active: useCase === 'original' }"
								role="radio"
								:aria-checked="useCase === 'original'"
								@click="useCase = 'original'"
							>
								<span class="use-case-label">{{ labels.original }}</span>
							</button>
							<button
								v-if="showWeb"
								type="button"
								class="use-case-card"
								:class="{ active: useCase === 'web' }"
								role="radio"
								:aria-checked="useCase === 'web'"
								@click="useCase = 'web'"
							>
								<v-icon name="language" class="use-case-icon" />
								<span class="use-case-label">{{ labels.webUse }}</span>
							</button>
							<button
								v-if="showPrint"
								type="button"
								class="use-case-card"
								:class="{ active: useCase === 'print' }"
								role="radio"
								:aria-checked="useCase === 'print'"
								@click="useCase = 'print'"
							>
								<v-icon name="print" class="use-case-icon" />
								<span class="use-case-label">{{ labels.printUse }}</span>
							</button>
							<button
								v-if="showCustom"
								type="button"
								class="use-case-card"
								:class="{ active: useCase === 'custom' }"
								role="radio"
								:aria-checked="useCase === 'custom'"
								@click="useCase = 'custom'"
							>
								<v-icon name="tune" class="use-case-icon" />
								<span class="use-case-label">{{ labels.custom }}</span>
							</button>
						</div>
					</section>

					<Transition name="panel-slide">
						<section
							v-if="useCase === 'web' && showWeb"
							key="web"
							class="options-panel"
						>
							<div class="field-block field-block-full">
								<label class="field-label">{{ labels.format }}</label>
								<v-select
									v-model="webFormat"
									:items="webFormatItems"
									item-text="text"
									item-value="value"
								/>
							</div>
							<div v-if="webFormat !== 'svg'" class="option-block">
								<p class="section-label">{{ labels.resolution }}</p>
								<div class="segment-row segment-row-wide" role="radiogroup" :aria-label="labels.resolution">
									<button
										type="button"
										class="segment-btn segment-btn-wide"
										:class="{ active: webResolution === 'hd' }"
										role="radio"
										:aria-checked="webResolution === 'hd'"
										@click="webResolution = 'hd'"
									>
										{{ labels.hd }}
									</button>
									<button
										type="button"
										class="segment-btn segment-btn-wide"
										:class="{ active: webResolution === 'uhd' }"
										role="radio"
										:aria-checked="webResolution === 'uhd'"
										@click="webResolution = 'uhd'"
									>
										{{ labels.uhd }}
									</button>
								</div>
							</div>
						</section>
					</Transition>

					<Transition name="panel-slide">
						<section v-if="useCase === 'print' && showPrint" key="print" class="options-panel">
							<div class="print-sizes">
								<div class="field-block">
									<label class="field-label" for="dl-print-w">{{ labels.widthCm }}</label>
									<v-input
										id="dl-print-w"
										v-model="printWidthCm"
										type="number"
										min="0.1"
										step="0.1"
									/>
								</div>
								<div class="field-block">
									<label class="field-label" for="dl-print-h">{{ labels.heightCm }}</label>
									<v-input
										id="dl-print-h"
										v-model="printHeightCm"
										type="number"
										min="0.1"
										step="0.1"
									/>
								</div>
							</div>
							<p class="panel-hint">{{ labels.printHint }}</p>
						</section>
					</Transition>

					<Transition name="panel-slide">
						<section v-if="useCase === 'custom' && showCustom" key="custom" class="options-panel">
							<div class="custom-grid">
								<div class="field-block field-block-full">
									<label class="field-label">{{ labels.fit }}</label>
									<v-select
										v-model="customFit"
										:items="fitItems"
										item-text="text"
										item-value="value"
									/>
								</div>
								<div class="field-block">
									<label class="field-label" for="dl-custom-w">{{ labels.widthPx }}</label>
									<v-input
										id="dl-custom-w"
										v-model="customWidth"
										type="number"
										min="1"
										step="1"
										placeholder="—"
									/>
								</div>
								<div class="field-block">
									<label class="field-label" for="dl-custom-h">{{ labels.heightPx }}</label>
									<v-input
										id="dl-custom-h"
										v-model="customHeight"
										type="number"
										min="1"
										step="1"
										placeholder="—"
									/>
								</div>
								<div class="field-block field-block-full">
									<label class="field-label field-label-row">
										<span>{{ labels.quality }}</span>
										<span class="quality-badge">{{ customQuality }}%</span>
									</label>
									<input
										v-model.number="customQuality"
										class="quality-slider"
										type="range"
										min="1"
										max="100"
										step="1"
									/>
								</div>
								<div class="field-block field-block-full">
									<label class="field-label">{{ labels.format }}</label>
									<v-select
										v-model="customFormat"
										:items="formatItems"
										item-text="text"
										item-value="value"
									/>
								</div>
							</div>
							<label class="checkbox-row">
								<input v-model="customWithoutEnlargement" type="checkbox" />
								<span>{{ labels.withoutEnlargement }}</span>
							</label>
						</section>
					</Transition>
				</template>
				</v-card-text>
			</div>

			<footer class="download-modal-footer">
				<v-notice v-if="errorMsg" type="danger" class="error-notice">
					{{ errorMsg }}
				</v-notice>

				<v-card-actions class="download-modal-actions">
				<v-button secondary :disabled="busy" @click="onCancel">{{ labels.cancel }}</v-button>
				<v-button :loading="busy" :disabled="!canSubmit" @click="onConfirm">
					<v-icon name="download" left />
					{{ mode === 'zip' ? labels.downloadZip : labels.download }}
				</v-button>
				</v-card-actions>
			</footer>
		</v-card>
	</v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { useApi } from '@directus/extensions-sdk'
import {
	CUSTOM_FIT_OPTIONS,
	CUSTOM_FORMAT_OPTIONS,
	DEFAULT_DOWNLOAD_MODAL_LABELS,
	type CustomFit,
	type CustomFormat,
	type DownloadChoice,
	type DownloadModalFile,
	type DownloadModalLabels,
	type DownloadUseCase,
	type WebFormat,
	type WebResolution,
	customFormatsForMime,
	defaultQualityForCustomFormat,
	isOriginalOnlyMime,
	isRasterImageMime,
	isSvgMime,
	isVideoMime,
	parseMediaSizesCm,
	supportsCustomDownload,
	supportsPrintDownload,
	supportsWebTransformDownload,
	webFormatsForMime,
	WEB_FORMATS_FOR_RASTER,
} from '../../utils/downloadVariants'
import {
	downloadManyAsZipForChoice,
	downloadSingleForChoice,
	suggestedFilenameForChoice,
} from '../../utils/downloadExecute'
import { type DownloadFileMeta, type SaveTarget, createBrowserDownloadTarget } from '../../utils/zipDownloadShared'

const props = withDefaults(
	defineProps<{
		modelValue: boolean
		files: DownloadModalFile[]
		mode?: 'single' | 'zip'
		labels?: Partial<DownloadModalLabels>
		zipBaseName?: string
		onZipDownload?: (choice: DownloadChoice, saveTarget: SaveTarget) => Promise<void>
		onSingleDownload?: (choice: DownloadChoice, saveTarget: SaveTarget) => Promise<void>
	}>(),
	{
		mode: 'single',
		labels: () => ({}),
		zipBaseName: 'download',
	},
)

const emit = defineEmits<{
	'update:modelValue': [value: boolean]
	done: [choice: DownloadChoice]
	cancel: []
}>()

const api = useApi()

const labels = computed<DownloadModalLabels>(() => ({
	...DEFAULT_DOWNLOAD_MODAL_LABELS,
	...props.labels,
}))

const useCase = ref<DownloadUseCase>('original')
const webFormat = ref<WebFormat>('avif')
const webResolution = ref<WebResolution>('hd')
const printWidthCm = ref<string>('')
const printHeightCm = ref<string>('')

const customFit = ref<CustomFit>('cover')
const customWidth = ref<string>('400')
const customHeight = ref<string>('300')
const customQuality = ref(80)
const customFormat = ref<CustomFormat>('auto')
const customWithoutEnlargement = ref(true)

const busy = ref(false)
const errorMsg = ref('')

const fitItems = computed(() =>
	CUSTOM_FIT_OPTIONS.map((o) => ({ text: o.label, value: o.value })),
)
const formatItems = computed(() =>
	customFormatsForMime(
		props.mode === 'zip' ? null : primaryFile.value?.type,
	).map((value) => {
		const opt = CUSTOM_FORMAT_OPTIONS.find((o) => o.value === value)
		return { text: opt?.label ?? value, value }
	}),
)

const primaryFile = computed(() => props.files[0] ?? null)

const contextLine = computed(() => {
	if (props.mode === 'zip') {
		const count = props.files.length
		const name = props.zipBaseName?.trim()
		if (name && count > 0) {
			return `${name} · ${count} ${count === 1 ? 'file' : 'files'}`
		}
		if (count > 1) return `${count} files`
		return name || ''
	}
	const name = primaryFile.value?.filename?.trim()
	if (name) return name
	return ''
})

const allOriginalOnly = computed(
	() => props.files.length > 0 && props.files.every((f) => isOriginalOnlyMime(f.type)),
)

const originalOnlyHint = computed(() => allOriginalOnly.value)

const originalOnlyHintText = computed(() => {
	if (!originalOnlyHint.value) return ''
	const files = props.files
	if (!files.length) return labels.value.originalOnlyMixed
	if (files.every((f) => isSvgMime(f.type))) return labels.value.svgOriginalOnly
	if (files.every((f) => isVideoMime(f.type))) return labels.value.videoOriginalOnly
	return labels.value.originalOnlyMixed
})

const hasRasterInBatch = computed(() =>
	props.files.some((f) => isRasterImageMime(f.type)),
)

const showWeb = computed(() => {
	if (allOriginalOnly.value) return false
	if (props.mode === 'zip') return hasRasterInBatch.value
	return supportsWebTransformDownload(primaryFile.value?.type)
})

const showPrint = computed(() => {
	if (allOriginalOnly.value) return false
	if (props.mode === 'zip') return hasRasterInBatch.value
	return supportsPrintDownload(primaryFile.value?.type)
})

const showCustom = computed(() => {
	if (allOriginalOnly.value) return false
	if (props.mode === 'zip') return hasRasterInBatch.value
	return supportsCustomDownload(primaryFile.value?.type)
})

const availableFormats = computed((): WebFormat[] => {
	if (props.mode === 'zip') {
		if (!hasRasterInBatch.value && props.files.some((f) => isSvgMime(f.type))) {
			return ['svg']
		}
		return [...WEB_FORMATS_FOR_RASTER]
	}
	return webFormatsForMime(primaryFile.value?.type)
})

const webFormatItems = computed(() =>
	availableFormats.value.map((fmt) => ({
		text:
			fmt === 'auto'
				? labels.value.formatAuto
				: fmt.toUpperCase(),
		value: fmt,
	})),
)

const canSubmit = computed(() => {
	if (busy.value) return false
	if (useCase.value === 'print') {
		const w = Number(printWidthCm.value)
		const h = Number(printHeightCm.value)
		return Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0
	}
	if (useCase.value === 'custom') {
		const w = Number(customWidth.value)
		const h = Number(customHeight.value)
		const hasW = Number.isFinite(w) && w > 0
		const hasH = Number.isFinite(h) && h > 0
		return hasW || hasH
	}
	return true
})

function resetFromFiles() {
	errorMsg.value = ''
	busy.value = false
	if (allOriginalOnly.value) {
		useCase.value = 'original'
	} else if (showWeb.value) {
		useCase.value = 'web'
	} else {
		useCase.value = 'original'
	}
	webFormat.value = availableFormats.value.includes('avif')
		? 'avif'
		: availableFormats.value[0] ?? 'avif'
	webResolution.value = 'hd'

	const parsed = parseMediaSizesCm(primaryFile.value?.media_sizes_cm)
	if (parsed) {
		printWidthCm.value = String(parsed.widthCm)
		printHeightCm.value = String(parsed.heightCm)
	} else {
		printWidthCm.value = ''
		printHeightCm.value = ''
	}

	const pw = primaryFile.value?.width
	const ph = primaryFile.value?.height
	customFit.value = 'cover'
	customWidth.value = pw && pw > 0 ? String(Math.min(pw, 400)) : '400'
	customHeight.value = ph && ph > 0 ? String(Math.min(ph, 300)) : '300'
	customFormat.value = 'auto'
	customQuality.value = defaultQualityForCustomFormat('auto')
	customWithoutEnlargement.value = true
}

watch(
	() => props.modelValue,
	(open) => {
		if (open) resetFromFiles()
	},
)

watch(availableFormats, (fmts) => {
	if (!fmts.includes(webFormat.value)) {
		webFormat.value = fmts.includes('avif') ? 'avif' : fmts[0] ?? 'avif'
	}
})

watch(customFormat, (fmt) => {
	if (fmt !== 'auto' && fmt !== 'png') {
		customQuality.value = defaultQualityForCustomFormat(fmt)
	}
})

function onDialogUpdate(v: boolean) {
	emit('update:modelValue', v)
	if (!v) emit('cancel')
}

function onCancel() {
	emit('update:modelValue', false)
	emit('cancel')
}

function buildChoice(): DownloadChoice | null {
	if (useCase.value === 'original') {
		return { useCase: 'original' }
	}
	if (useCase.value === 'web') {
		return {
			useCase: 'web',
			webFormat: webFormat.value,
			webResolution: webFormat.value === 'svg' ? undefined : webResolution.value,
		}
	}
	if (useCase.value === 'custom') {
		const w = Number(customWidth.value)
		const h = Number(customHeight.value)
		const hasW = Number.isFinite(w) && w > 0
		const hasH = Number.isFinite(h) && h > 0
		if (!hasW && !hasH) {
			errorMsg.value = labels.value.errorCustomSize
			return null
		}
		return {
			useCase: 'custom',
			customFit: customFit.value,
			customWidth: hasW ? w : undefined,
			customHeight: hasH ? h : undefined,
			customQuality: customQuality.value,
			customFormat: customFormat.value,
			customWithoutEnlargement: customWithoutEnlargement.value,
		}
	}
	const pw = Number(printWidthCm.value)
	const ph = Number(printHeightCm.value)
	if (!Number.isFinite(pw) || !Number.isFinite(ph) || pw <= 0 || ph <= 0) {
		errorMsg.value = labels.value.errorPrintSize
		return null
	}
	return {
		useCase: 'print',
		printWidthCm: pw,
		printHeightCm: ph,
	}
}

function fileMetaFromModal(file: DownloadModalFile): DownloadFileMeta {
	return {
		id: file.id,
		type: file.type,
		filename_download: file.filename ?? null,
		title: file.filename ?? null,
	}
}

async function onConfirm() {
	errorMsg.value = ''
	const choice = buildChoice()
	if (!choice) return

	const suggestedName =
		props.mode === 'zip'
			? suggestedFilenameForChoice(null, choice, {
					mode: 'zip',
					zipBaseName: props.zipBaseName,
				})
			: primaryFile.value
				? suggestedFilenameForChoice(fileMetaFromModal(primaryFile.value), choice, { mode: 'single' })
				: null

	if (!suggestedName) return

	const saveTarget = createBrowserDownloadTarget()

	busy.value = true
	try {
		emit('update:modelValue', false)
		await nextTick()

		if (props.mode === 'single' && props.onSingleDownload) {
			await props.onSingleDownload(choice, saveTarget)
		} else if (props.mode === 'single') {
			if (!primaryFile.value) return
			await downloadSingleForChoice(
				api as any,
				fileMetaFromModal(primaryFile.value),
				choice,
				saveTarget,
			)
		} else if (props.onZipDownload) {
			await props.onZipDownload(choice, saveTarget)
		} else if (props.files.length) {
			const result = await downloadManyAsZipForChoice(
				api as any,
				props.files.map(fileMetaFromModal),
				props.zipBaseName,
				choice,
				saveTarget,
			)
			if (!result.ok) {
				const msg =
					(result as { error?: { message?: string } }).error?.message ||
					labels.value.errorGeneric
				throw new Error(msg)
			}
		} else {
			throw new Error(labels.value.errorGeneric)
		}
		emit('done', choice)
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : labels.value.errorGeneric
		setError(message)
	} finally {
		busy.value = false
	}
}

function setBusy(v: boolean) {
	busy.value = v
}

function setError(msg: string) {
	errorMsg.value = msg || labels.value.errorGeneric
	busy.value = false
}

defineExpose({ setBusy, setError, close: onCancel })
</script>

<style scoped>
.download-modal {
	display: flex;
	flex-direction: column;
	width: min(520px, 94vw);
	max-width: 520px;
	max-height: min(90vh, 720px);
	overflow: hidden;
	border-radius: var(--theme--border-radius, 8px);
}

.download-modal-header {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 20px 24px 16px;
	border-bottom: 1px solid var(--theme--border-color-subdued, var(--theme--border-color));
	background: var(--theme--background);
}

.header-text {
	display: flex;
	flex: 1;
	flex-direction: column;
	justify-content: center;
	min-width: 0;
	gap: 2px;
}

.header-close-btn {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	margin: -4px -4px -4px 0;
	padding: 4px;
	border: none;
	border-radius: var(--theme--border-radius, 6px);
	background: none;
	color: var(--theme--foreground-subdued);
	cursor: pointer;
}

.header-close-btn:hover:not(:disabled) {
	background: var(--theme--background-subdued, var(--theme--background-accent));
	color: var(--theme--foreground);
}

.header-close-btn:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.header-close-btn:focus-visible {
	outline: 2px solid var(--theme--primary);
	outline-offset: 2px;
}

.header-icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 44px;
	height: 44px;
	flex-shrink: 0;
	border-radius: 10px;
	background: var(--theme--primary-background, color-mix(in srgb, var(--theme--primary) 12%, transparent));
	color: var(--theme--primary);
}

.download-modal-title {
	padding: 0 !important;
	margin: 0;
	font-size: 18px;
	font-weight: 600;
	line-height: 1.25;
	color: var(--theme--foreground);
}

.download-modal-subtitle {
	margin: 0;
	font-size: 13px;
	line-height: 1.35;
	color: var(--theme--foreground-subdued);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	max-width: min(380px, 72vw);
}

.download-modal-scroll {
	flex: 1 1 auto;
	min-height: 0;
	overflow-x: hidden;
	overflow-y: auto;
	overscroll-behavior: contain;
	-webkit-overflow-scrolling: touch;
}

.download-modal-body {
	display: flex;
	flex-direction: column;
	gap: 18px;
	padding: 16px 24px !important;
}

.download-modal-footer {
	flex-shrink: 0;
	border-top: 1px solid var(--theme--border-color-subdued, var(--theme--border-color));
	background: var(--theme--background);
}

.info-notice {
	margin: 0;
}

.section {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.section-label {
	margin: 0;
	font-size: 13px;
	font-weight: 600;
	color: var(--theme--foreground);
	line-height: 1.3;
}

.use-case-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 10px;
}

.use-case-card {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 8px;
	min-height: 76px;
	padding: 12px 10px;
	border: 1px solid var(--theme--border-color);
	border-radius: 10px;
	background: var(--theme--background);
	color: var(--theme--foreground);
	font: inherit;
	font-size: 13px;
	font-weight: 500;
	cursor: pointer;
	transition:
		border-color 0.15s ease,
		background-color 0.15s ease,
		box-shadow 0.15s ease,
		transform 0.1s ease;
}

.use-case-card:hover {
	border-color: color-mix(in srgb, var(--theme--primary) 45%, var(--theme--border-color));
	background: var(--theme--background-accent, var(--theme--background-subdued));
}

.use-case-card.active {
	border-color: var(--theme--primary);
	background: var(--theme--primary);
	color: var(--theme--primary-foreground, #fff);
	box-shadow: none;
}

.use-case-card:focus-visible {
	outline: 2px solid var(--theme--primary);
	outline-offset: 2px;
}

.use-case-icon {
	color: var(--theme--foreground-subdued);
}

.use-case-card.active .use-case-icon {
	color: var(--theme--primary-foreground, #fff);
}

.use-case-label {
	text-align: center;
	line-height: 1.25;
}

.options-panel {
	display: flex;
	flex-direction: column;
	gap: 14px;
	padding: 16px;
	border: 1px solid var(--theme--border-color-subdued, var(--theme--border-color));
	border-radius: 10px;
	background: var(--theme--background-subdued, var(--theme--background-accent));
}

.option-block {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.segment-row {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	padding: 4px;
	border-radius: 8px;
	background: var(--theme--background);
	border: 1px solid var(--theme--border-color-subdued, var(--theme--border-color));
}

.segment-row-wide {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 6px;
}

.segment-btn {
	flex: 1 1 auto;
	min-width: 52px;
	padding: 8px 12px;
	border: none;
	border-radius: 6px;
	background: transparent;
	color: var(--theme--foreground-subdued);
	font: inherit;
	font-size: 13px;
	font-weight: 500;
	cursor: pointer;
	transition:
		background-color 0.15s ease,
		color 0.15s ease,
		box-shadow 0.15s ease;
}

.segment-btn-wide {
	min-width: 0;
	text-align: center;
}

.segment-btn:hover {
	color: var(--theme--foreground);
	background: var(--theme--background-accent, rgba(0, 0, 0, 0.04));
}

.segment-btn.active {
	background: var(--theme--primary);
	color: var(--theme--primary-foreground, #fff);
	box-shadow: none;
	font-weight: 600;
}

.segment-btn:focus-visible {
	outline: 2px solid var(--theme--primary);
	outline-offset: 1px;
}

.print-sizes {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 12px;
}

.field-block {
	display: flex;
	flex-direction: column;
	gap: 6px;
	min-width: 0;
}

.field-block-full {
	grid-column: 1 / -1;
}

.field-label {
	font-size: 13px;
	font-weight: 500;
	color: var(--theme--foreground);
}

.field-label-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
}

.panel-hint {
	margin: 0;
	font-size: 12px;
	color: var(--theme--foreground-subdued);
}

.custom-grid {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 12px 14px;
}

.quality-badge {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 36px;
	padding: 2px 8px;
	border-radius: 999px;
	background: var(--theme--background);
	font-size: 12px;
	font-weight: 600;
	font-variant-numeric: tabular-nums;
	color: var(--theme--primary);
}

.quality-slider {
	width: 100%;
	height: 6px;
	margin: 4px 0 0;
	accent-color: var(--theme--primary);
	cursor: pointer;
}

.checkbox-row {
	display: flex;
	align-items: center;
	gap: 10px;
	margin-top: 4px;
	font-size: 13px;
	color: var(--theme--foreground);
	cursor: pointer;
	user-select: none;
}

.checkbox-row input {
	width: 16px;
	height: 16px;
	accent-color: var(--theme--primary);
}

.error-notice {
	margin: 12px 24px 0;
}

.download-modal-actions {
	display: flex;
	justify-content: flex-end;
	gap: 10px;
	padding: 12px 24px 20px !important;
	border-top: none;
	background: transparent;
}

.panel-slide-enter-active,
.panel-slide-leave-active {
	transition:
		opacity 0.2s ease,
		transform 0.2s ease;
}

.panel-slide-enter-from,
.panel-slide-leave-to {
	opacity: 0;
	transform: translateY(-6px);
}

@media (max-width: 520px) {
	.download-modal {
		width: calc(100vw - 24px);
		max-width: none;
		max-height: calc(100vh - 24px);
		max-height: calc(100dvh - 24px);
	}

	.download-modal-header {
		padding: 16px 16px 12px;
		gap: 8px;
	}

	.header-icon {
		width: 40px;
		height: 40px;
	}

	.download-modal-title {
		font-size: 16px;
	}

	.download-modal-subtitle {
		max-width: calc(100vw - 96px);
	}

	.download-modal-body {
		padding: 14px 16px !important;
		gap: 14px;
	}

	.error-notice {
		margin: 10px 16px 0;
	}

	.use-case-grid {
		grid-template-columns: 1fr 1fr;
	}

	.use-case-card {
		min-height: 68px;
		padding: 10px 8px;
		font-size: 12px;
	}

	.options-panel {
		padding: 14px;
	}

	.print-sizes,
	.custom-grid {
		grid-template-columns: 1fr;
	}

	.segment-row-wide {
		grid-template-columns: 1fr;
	}

	.download-modal-actions {
		flex-direction: column-reverse;
		align-items: stretch;
		padding: 12px 16px 16px !important;
	}

	.download-modal-actions :deep(.v-button) {
		width: 100%;
		justify-content: center;
	}
}

@media (max-width: 360px) {
	.use-case-grid {
		grid-template-columns: 1fr;
	}
}
</style>
