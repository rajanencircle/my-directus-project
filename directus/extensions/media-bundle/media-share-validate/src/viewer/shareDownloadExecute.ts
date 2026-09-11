import type { DownloadFormatPreset } from '../../../media-library/src/utils/downloadPresets';
import {
	type DownloadChoice,
	choiceToAssetPreset,
	isOriginalOnlyMime,
	isRasterImageMime,
	isSvgMime,
} from '../../../media-library/src/utils/downloadVariants';
import {
	type DownloadFileMeta,
	type SaveTarget,
	resolveDownloadFilename,
	saveBlobAsFile,
	supportsMultiFormatDownload,
	validateAssetBlob,
	withFormatExtension,
} from '../../../media-library/src/utils/zipDownloadShared';
import { suggestedFilenameForChoice } from '../../../media-library/src/utils/downloadExecute';

const SHARE_BASE = '/media-share-validate';

function buildShareFileParams(
	file: DownloadFileMeta,
	preset: DownloadFormatPreset,
): URLSearchParams {
	const params = new URLSearchParams();
	params.set('download', 'true');

	if (supportsMultiFormatDownload(file.type)) {
		if (preset.format) params.set('format', preset.format);
		if (preset.width != null) params.set('width', String(preset.width));
		if (preset.height != null) params.set('height', String(preset.height));
		if (preset.fit) params.set('fit', preset.fit);
		if (preset.quality != null) params.set('quality', String(preset.quality));
		if (preset.withoutEnlargement) params.set('withoutEnlargement', 'true');
	}

	return params;
}

async function fetchShareBlob(url: string): Promise<Blob> {
	const res = await fetch(url);
	if (!res.ok) {
		let message = `Download failed (${res.status})`;
		try {
			const json = await res.json();
			message = json?.message || json?.error || message;
		} catch {
			/* ignore */
		}
		throw new Error(message);
	}
	return validateAssetBlob(await res.blob());
}

async function fetchShareFileForChoice(
	shareId: string,
	file: DownloadFileMeta,
	choice: DownloadChoice,
): Promise<{ blob: Blob; filename: string }> {
	const mime = file.type;

	if (isOriginalOnlyMime(mime)) {
		const blob = await fetchShareBlob(`${SHARE_BASE}/${shareId}/file?download=true`);
		if (isSvgMime(mime)) {
			return {
				blob,
				filename: withFormatExtension(resolveDownloadFilename(file), 'svg'),
			};
		}
		return { blob, filename: resolveDownloadFilename(file) };
	}

	if (choice.useCase === 'original' || !isRasterImageMime(mime)) {
		const blob = await fetchShareBlob(`${SHARE_BASE}/${shareId}/file?download=true`);
		return { blob, filename: resolveDownloadFilename(file) };
	}

	if (choice.useCase === 'print') {
		const widthCm = choice.printWidthCm;
		const heightCm = choice.printHeightCm;
		if (!widthCm || !heightCm || widthCm <= 0 || heightCm <= 0) {
			throw new Error('Invalid print size');
		}

		const res = await fetch(`${SHARE_BASE}/${shareId}/print`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ widthCm, heightCm }),
		});

		if (!res.ok) {
			let message = 'Print failed';
			try {
				const json = await res.json();
				message = json?.message || json?.error || message;
			} catch {
				/* ignore */
			}
			throw new Error(message);
		}

		const blob = await validateAssetBlob(await res.blob());
		return {
			blob,
			filename: withFormatExtension(resolveDownloadFilename(file), 'jpg'),
		};
	}

	const preset = choiceToAssetPreset(choice);
	const params = buildShareFileParams(file, preset);
	const blob = await fetchShareBlob(`${SHARE_BASE}/${shareId}/file?${params}`);
	let filename = resolveDownloadFilename(file);
	if (preset.format && supportsMultiFormatDownload(file.type)) {
		filename = withFormatExtension(filename, preset.format);
	}
	return { blob, filename };
}

export async function downloadSingleViaShare(
	shareId: string,
	file: DownloadFileMeta & {
		width?: number | null;
		height?: number | null;
		media_sizes_cm?: string | null;
	},
	choice: DownloadChoice,
	saveTarget: SaveTarget,
): Promise<void> {
	const { blob, filename } = await fetchShareFileForChoice(shareId, file, choice);
	const suggested = suggestedFilenameForChoice(file, choice, { mode: 'single' });
	await saveBlobAsFile(blob, suggested || filename, saveTarget);
}

export type ShareFileMeta = {
	fileId: string;
	fileType: string | null;
	filename?: string | null;
	width?: number | null;
	height?: number | null;
	media_sizes_cm?: string | null;
};

export function shareFileToModalFile(meta: ShareFileMeta) {
	return {
		id: meta.fileId,
		filename: meta.filename ?? null,
		type: meta.fileType ?? null,
		width: meta.width ?? null,
		height: meta.height ?? null,
		media_sizes_cm: meta.media_sizes_cm ?? null,
	};
}
