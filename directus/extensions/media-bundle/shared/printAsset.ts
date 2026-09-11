import { Readable } from 'node:stream';
import { createRequire } from 'node:module';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export const PRINT_DPI = 300;
export const PRINT_JPEG_QUALITY = 92;

export function cmToPx(cm: number): number {
	return Math.max(1, Math.round((cm / 2.54) * PRINT_DPI));
}

/** Probe Directus / pnpm locations for sharp. */
export function loadSharp(): any {
	const reqFrom = (filename: string) => createRequire(filename);

	const attempts: Array<() => any> = [
		() => reqFrom(import.meta.url)('sharp'),
		() => reqFrom('/directus/package.json')('sharp'),
		() => reqFrom(join(process.cwd(), 'package.json'))('sharp'),
	];

	const pnpmRoots = [
		'/directus/node_modules/.pnpm',
		join(process.cwd(), 'node_modules/.pnpm'),
	];

	for (const root of pnpmRoots) {
		if (!existsSync(root)) continue;
		try {
			const dirs = readdirSync(root).filter(
				(d) => d.startsWith('sharp@') && !d.includes('libvips') && !d.includes('linux'),
			);
			for (const d of dirs) {
				const pkg = join(root, d, 'node_modules', 'sharp');
				if (!existsSync(pkg)) continue;
				attempts.push(() => reqFrom(join(pkg, 'package.json'))(pkg));
			}
		} catch {
			/* ignore */
		}
	}

	const errors: string[] = [];
	for (const tryLoad of attempts) {
		try {
			return tryLoad();
		} catch (err: any) {
			errors.push(err?.message || String(err));
		}
	}
	throw new Error(`Cannot find module 'sharp' (${errors[0] || 'no candidates'})`);
}

export type PrintAssetInput = {
	stream: Readable;
	file: { filename_download?: string | null; type?: string | null };
};

export type PrintAssetResult = {
	buffer: Buffer;
	filename: string;
};

/** CMYK JPG @ 300 dpi for raster images. */
export async function renderPrintJpeg(
	input: PrintAssetInput,
	widthCm: number,
	heightCm: number,
	fileIdFallback: string,
): Promise<PrintAssetResult> {
	const widthPx = cmToPx(widthCm);
	const heightPx = cmToPx(heightCm);

	const chunks: Buffer[] = [];
	for await (const chunk of input.stream) {
		chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
	}
	const raw = Buffer.concat(chunks);

	const mime = String(input.file?.type ?? '');
	if (!mime.startsWith('image/') || mime.includes('svg')) {
		throw Object.assign(new Error('not_raster_image'), { status: 400 });
	}

	const sharp = loadSharp();
	const out = await sharp(raw)
		.rotate()
		.resize({
			width: widthPx,
			height: heightPx,
			fit: 'fill',
			withoutEnlargement: false,
		})
		.withMetadata({ density: PRINT_DPI })
		.toColorspace('cmyk')
		.jpeg({ quality: PRINT_JPEG_QUALITY, chromaSubsampling: '4:4:4' })
		.toBuffer();

	const baseName = String(input.file?.filename_download || fileIdFallback).replace(/\.[^.]+$/, '');
	const filename = `${baseName}-print-${widthCm}x${heightCm}cm.jpg`;

	return { buffer: out, filename };
}
