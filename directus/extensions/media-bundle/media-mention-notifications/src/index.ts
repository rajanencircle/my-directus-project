import { defineHook } from '@directus/extensions-sdk';

/**
 * Notification link fixes (scoped — do NOT rewrite non-file collections):
 *
 * 1. ALL notifications: make message hrefs relative `/admin/...` so the browser
 *    uses the current host (not PUBLIC_URL / localhost).
 * 2. FILE routes ONLY:
 *      /admin/content/directus_files/{id}  OR  /admin/files/{id}
 *    → /admin/media-library/{id} in the message (“Click here to view”)
 *    → collection=null, item=/media-library/{id} for View Content icon
 * 3. Media Expiry / collection=directus_files with a file UUID: same as (2).
 * 4. Hotel (and other) mentions keep their own collection routes — never
 *    force media-library.
 *
 * System collection events: notifications.create / notifications.read
 */

const FILE_ID_RE =
	'[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';

const FILE_UUID_ONLY_RE = new RegExp(`^${FILE_ID_RE}$`, 'i');

/** Only these paths become media-library (not /admin/content/hotels/…). */
const FILE_HREF_PATH_RE = new RegExp(
	`(?:https?:\\/\\/[^"'\\s\\\\]+)?\\/admin\\/(?:content\\/directus_files|files)\\/(${FILE_ID_RE})`,
	'i',
);

function isMediaExpiryNotification(payload: Record<string, any>): boolean {
	const subject = typeof payload.subject === 'string' ? payload.subject : '';
	return /media expires soon/i.test(subject);
}

function isDirectusFilesCollection(payload: Record<string, any>): boolean {
	return (
		payload.collection === 'directus_files' &&
		typeof payload.item === 'string' &&
		FILE_UUID_ONLY_RE.test(payload.item)
	);
}

function extractFileIdFromFileHref(message: string): string | null {
	if (!message) return null;
	const match = message.match(FILE_HREF_PATH_RE);
	return match?.[1] ?? null;
}

function adminMediaLibraryHref(fileId: string): string {
	return `/admin/media-library/${fileId}`;
}

function drawerMediaLibraryItem(fileId: string): string {
	return `/media-library/${fileId}`;
}

/**
 * Strip host from any href that points at /admin/... so clicks use the live domain.
 */
function makeAdminHrefsRelative(message: string): string {
	if (!message) return message;

	return message.replace(
		/href=(\\?["'])(?:https?:\/\/[^"'\\]+)?(\/admin\/[^"'\\]+)\1/gi,
		(_full, _quote: string, path: string) => `href="${path}"`,
	);
}

function rewriteFileLinksToMediaLibrary(message: string, fileId: string): string {
	if (!message || !fileId) return message;

	const href = adminMediaLibraryHref(fileId);
	const patterns = [
		new RegExp(
			`href=(\\\\?["'])[^"'\\\\]*\\/admin\\/content\\/directus_files\\/${fileId}[^"'\\\\]*\\1`,
			'gi',
		),
		new RegExp(`href=(\\\\?["'])[^"'\\\\]*\\/admin\\/files\\/${fileId}[^"'\\\\]*\\1`, 'gi'),
	];

	let out = message;
	for (const re of patterns) {
		out = out.replace(re, `href="${href}"`);
	}
	return out;
}

/**
 * If a non-file mention was wrongly rewritten to /media-library/{id}, restore
 * collection + item from the subject ("You were mentioned in hotels").
 */
function restoreWrongMediaLibraryMention(payload: Record<string, any>): Record<string, any> | null {
	const subject = typeof payload.subject === 'string' ? payload.subject : '';
	const match = subject.match(/mentioned in ([a-z0-9_]+)/i);
	if (!match?.[1]) return null;

	const collection = match[1];
	if (collection === 'directus_files' || collection === 'files') return null;

	const item = typeof payload.item === 'string' ? payload.item : '';
	const idMatch = item.match(new RegExp(`(?:^|/media-library/)(${FILE_ID_RE})$`, 'i'));
	const id = idMatch?.[1] ?? (FILE_UUID_ONLY_RE.test(item) ? item : null);
	if (!id) return null;

	// Only restore when we clearly forced media-library on a non-file mention
	if (payload.collection !== null && payload.collection !== undefined) {
		if (payload.collection === collection && !item.includes('media-library')) return null;
	}
	if (!item.includes('media-library') && payload.collection === collection) return null;

	return {
		...payload,
		collection,
		item: id,
	};
}

function ensureClickHereLink(message: string, adminHref: string): string {
	if (!message) {
		return `<a href="${adminHref}">Click here to view</a>`;
	}
	if (/click here to view/i.test(message)) {
		// Ensure existing click-here (linked or bare) points at the right href
		if (/<a\b[^>]*>\s*Click here to view\.?\s*<\/a>/i.test(message)) {
			return message.replace(
				/<a\b[^>]*>\s*Click here to view\.?\s*<\/a>/gi,
				`<a href="${adminHref}">Click here to view</a>`,
			);
		}
		return message.replace(
			/\bClick here to view\.?/gi,
			`<a href="${adminHref}">Click here to view</a>`,
		);
	}
	return `${message.replace(/\s+$/, '')}\n\n<a href="${adminHref}">Click here to view</a>`;
}

function applyFileMediaLibraryRewrite(
	payload: Record<string, any>,
	fileId: string,
	message: string,
): Record<string, any> {
	let nextMessage = rewriteFileLinksToMediaLibrary(message, fileId);
	nextMessage = ensureClickHereLink(nextMessage, adminMediaLibraryHref(fileId));
	return {
		...payload,
		collection: null,
		item: drawerMediaLibraryItem(fileId),
		message: nextMessage,
	};
}

function processNotificationPayload(payload: Record<string, any>): Record<string, any> {
	if (!payload || typeof payload !== 'object') return payload;

	// Fix hotel (etc.) mentions that were incorrectly pointed at media-library
	const restored = restoreWrongMediaLibraryMention(payload);
	const base = restored ?? payload;

	const originalMessage = typeof base.message === 'string' ? base.message : '';
	let message = originalMessage ? makeAdminHrefsRelative(originalMessage) : originalMessage;

	// FILE ONLY: href to files / directus_files
	const fileIdFromHref = extractFileIdFromFileHref(message);
	if (fileIdFromHref) {
		return applyFileMediaLibraryRewrite(base, fileIdFromHref, message);
	}

	// FILE ONLY: collection directus_files + UUID item
	if (isDirectusFilesCollection(base) && typeof base.item === 'string') {
		return applyFileMediaLibraryRewrite(base, base.item, message);
	}

	// FILE ONLY: media expiry notifications (item may already be /media-library/id)
	if (isMediaExpiryNotification(base)) {
		let fileId: string | null = null;
		if (typeof base.item === 'string') {
			if (FILE_UUID_ONLY_RE.test(base.item)) fileId = base.item;
			else {
				const m = base.item.match(new RegExp(`(?:^|/)media-library/(${FILE_ID_RE})$`, 'i'));
				fileId = m?.[1] ?? null;
			}
		}
		if (!fileId) {
			const mediaHref = message.match(
				new RegExp(`\\/admin\\/media-library\\/(${FILE_ID_RE})`, 'i'),
			);
			fileId = mediaHref?.[1] ?? null;
		}
		if (fileId) {
			return applyFileMediaLibraryRewrite(base, fileId, message);
		}
	}

	if (message && message !== originalMessage) {
		return { ...base, message };
	}

	if (restored) return { ...base, message: message || base.message };
	return payload;
}

function processNotificationItems(items: any): any {
	if (Array.isArray(items)) {
		return items.map((item) =>
			item && typeof item === 'object' ? processNotificationPayload(item) : item,
		);
	}
	if (items && typeof items === 'object') {
		return processNotificationPayload(items);
	}
	return items;
}

export default defineHook(({ filter }) => {
	filter('notifications.create', (payload) => {
		return processNotificationPayload(payload as Record<string, any>);
	});

	filter('notifications.read', (items) => {
		return processNotificationItems(items);
	});
});
