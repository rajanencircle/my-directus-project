<template>
	<v-dialog :model-value="modelValue" persistent @update:model-value="emit('update:modelValue', $event)" @esc="close">
		<v-card class="delete-folder-dialog">
			<v-card-title>{{ t('delete_folder') }}</v-card-title>
			<v-card-text>
				<FolderActionSummary
					v-if="folderName"
					label="Deleting folder"
					:folder-name="folderName"
					:folder-path="folderPath"
					:folder-stats="folderStats"
					bordered
				/>

				<p class="dialog-prompt">What should happen to the folder contents?</p>
				<div class="radio-options">
					<v-radio
						v-model="deleteMode"
						value="move"
						:label="moveUpLabel"
					/>
					<v-radio
						v-model="deleteMode"
						value="delete"
						label="Delete all content permanently"
					/>
				</div>
			</v-card-text>
			<v-card-actions>
				<v-button secondary :disabled="saving" @click="close">{{ t('cancel') }}</v-button>
				<v-button kind="danger" :loading="saving" @click="confirm">{{ t('delete_label') }}</v-button>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useT } from '../../composables/useT'
import FolderActionSummary from './FolderActionSummary.vue'

export type FolderDeleteMode = 'move' | 'delete'

const props = defineProps<{
	modelValue: boolean
	folderName?: string
	folderPath?: string
	folderStats?: string
	parentFolderName?: string
}>()

const emit = defineEmits<{
	'update:modelValue': [value: boolean]
	confirm: [mode: FolderDeleteMode]
}>()

const { t } = useT()
const deleteMode = ref<FolderDeleteMode>('move')
const saving = ref(false)

const moveUpLabel = computed(() => {
	const parent = props.parentFolderName?.trim() || 'File Library'
	return `Move content to ${parent}`
})

watch(
	() => props.modelValue,
	(open) => {
		if (open) {
			deleteMode.value = 'move'
			saving.value = false
		}
	},
)

function close() {
	if (saving.value) return
	emit('update:modelValue', false)
}

function confirm() {
	if (saving.value) return
	saving.value = true
	emit('confirm', deleteMode.value)
}

defineExpose({
	setSaving(v: boolean) {
		saving.value = v
	},
})
</script>

<style scoped>
.delete-folder-dialog :deep(.v-card-text) {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.dialog-prompt {
	margin: 0;
	color: var(--theme--foreground);
	font-family: var(--theme--fonts--sans--font-family);
	font-size: 14px;
}

.radio-options {
	display: flex;
	flex-direction: column;
	gap: 0.45rem;
}
</style>
