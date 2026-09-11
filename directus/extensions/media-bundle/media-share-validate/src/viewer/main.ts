import { createApp, defineComponent, h, ref } from 'vue';
import { API_INJECT } from '@directus/constants';
import { registerDirectusShims } from './directusShims';
import ShareDownloadHost from './ShareDownloadHost.vue';
import type { ShareFileMeta } from './shareDownloadExecute';

export type ShareViewerDownloadApi = {
	openDownloadModal: () => void;
};

export type ShareDownloadHooks = {
	onDownloadBusy?: (busy: boolean) => void;
};

export function mountShareDownload(
	rootEl: HTMLElement,
	shareId: string,
	fileMeta: ShareFileMeta,
	hooks?: ShareDownloadHooks,
): ShareViewerDownloadApi {
	let openDownloadModalFn: () => void = () => {};

	const Root = defineComponent({
		name: 'ShareDownloadRoot',
		setup() {
			const modalOpen = ref(false);
			openDownloadModalFn = () => {
				modalOpen.value = true;
			};

			return () =>
				h(ShareDownloadHost, {
					modelValue: modalOpen.value,
					'onUpdate:modelValue': (value: boolean) => {
						modalOpen.value = value;
					},
					shareId,
					fileMeta,
					onDownloadBusy: hooks?.onDownloadBusy,
				});
		},
	});

	const app = createApp(Root);
	registerDirectusShims(app);
	app.provide(API_INJECT, {
		get: async () => {
			throw new Error('Share viewer uses onSingleDownload');
		},
		post: async () => {
			throw new Error('Share viewer uses onSingleDownload');
		},
	});
	app.mount(rootEl);

	return {
		openDownloadModal() {
			openDownloadModalFn();
		},
	};
}

declare global {
	interface Window {
		ShareViewerDownload?: {
			mountShareDownload: typeof mountShareDownload;
		};
	}
}

if (typeof window !== 'undefined') {
	window.ShareViewerDownload = { mountShareDownload };
}
