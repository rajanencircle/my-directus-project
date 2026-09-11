<script setup lang="ts">
import { computed } from 'vue';
import DownloadModal from '../../../media-library/src/components/download/DownloadModal.vue';
import { DEFAULT_DOWNLOAD_MODAL_LABELS } from '../../../media-library/src/utils/downloadVariants';
import type { DownloadChoice } from '../../../media-library/src/utils/downloadVariants';
import type { SaveTarget } from '../../../media-library/src/utils/zipDownloadShared';
import {
	downloadSingleViaShare,
	shareFileToModalFile,
	type ShareFileMeta,
} from './shareDownloadExecute';

const props = defineProps<{
	shareId: string;
	fileMeta: ShareFileMeta;
	onDownloadBusy?: (busy: boolean) => void;
}>();

const open = defineModel<boolean>({ default: false });

const modalFiles = computed(() => [shareFileToModalFile(props.fileMeta)]);

async function onSingleDownload(choice: DownloadChoice, saveTarget: SaveTarget) {
	const file = shareFileToModalFile(props.fileMeta);
	props.onDownloadBusy?.(true);
	try {
		await downloadSingleViaShare(props.shareId, file, choice, saveTarget);
	} finally {
		props.onDownloadBusy?.(false);
	}
}
</script>

<template>
	<DownloadModal
		v-model="open"
		mode="single"
		:files="modalFiles"
		:labels="DEFAULT_DOWNLOAD_MODAL_LABELS"
		:on-single-download="onSingleDownload"
	/>
</template>
