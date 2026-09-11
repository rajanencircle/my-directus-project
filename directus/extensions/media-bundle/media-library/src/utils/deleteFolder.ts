/**
 * Folder delete helpers — mirrors Directus app `delete-folder.ts`
 * (move contents one level up vs recursive delete).
 */

type ApiClient = {
	get: (url: string, config?: Record<string, unknown>) => Promise<{ data: any }>;
	patch: (url: string, data?: unknown) => Promise<{ data: any }>;
	delete: (url: string, config?: Record<string, unknown>) => Promise<{ data: any }>;
};

export type FolderRef = {
	id: string;
	parent: string | null;
};

/** Collect folder id + all descendant folder ids from a flat list. */
export function collectDescendantFolderIds(
	allFolders: FolderRef[],
	rootIds: string[],
): string[] {
	const byParent = new Map<string | null, string[]>();
	for (const f of allFolders) {
		const p = f.parent ?? null;
		const list = byParent.get(p) ?? [];
		list.push(f.id);
		byParent.set(p, list);
	}

	const out: string[] = [];
	const stack = [...rootIds];
	const seen = new Set<string>();

	while (stack.length) {
		const id = stack.pop()!;
		if (seen.has(id)) continue;
		seen.add(id);
		out.push(id);
		for (const child of byParent.get(id) ?? []) stack.push(child);
	}

	return out;
}

/** Move direct child folders/files to this folder's parent, then delete the folder. */
export async function moveAndDeleteFolder(api: ApiClient, folder: FolderRef): Promise<void> {
	const newParent = folder.parent;

	const [foldersRes, filesRes] = await Promise.all([
		api.get('/folders', {
			params: { filter: { parent: { _eq: folder.id } }, fields: ['id'], limit: -1 },
		}),
		api.get('/files', {
			params: { filter: { folder: { _eq: folder.id } }, fields: ['id'], limit: -1 },
		}),
	]);

	const childFolderIds: string[] = (foldersRes.data?.data ?? []).map((f: { id: string }) => f.id);
	const childFileIds: string[] = (filesRes.data?.data ?? []).map((f: { id: string }) => f.id);

	await Promise.all([
		childFolderIds.length
			? api.patch('/folders', { keys: childFolderIds, data: { parent: newParent } })
			: Promise.resolve(),
		childFileIds.length
			? api.patch('/files', { keys: childFileIds, data: { folder: newParent } })
			: Promise.resolve(),
	]);

	await api.delete(`/folders/${folder.id}`);
}

/** Recursively delete folder, all nested folders, and all files inside. */
export async function recursiveDeleteFolder(
	api: ApiClient,
	folder: FolderRef,
	allFolders: FolderRef[],
): Promise<void> {
	const allFolderIds = collectDescendantFolderIds(allFolders, [folder.id]);
	const allFolderIdSet = new Set(allFolderIds);

	const withParentInSet = allFolders
		.filter((f) => allFolderIdSet.has(f.id) && f.parent != null && allFolderIdSet.has(f.parent))
		.map((f) => f.id);

	// Break parent links so nested folders can be deleted safely
	if (withParentInSet.length > 0) {
		await api.patch('/folders', { keys: withParentInSet, data: { parent: null } });
	}

	const filesRes = await api.get('/files', {
		params: { filter: { folder: { _in: allFolderIds } }, fields: ['id'], limit: -1 },
	});
	const fileIds: string[] = (filesRes.data?.data ?? []).map((f: { id: string }) => f.id);

	if (fileIds.length > 0) {
		await api.delete('/files', { data: fileIds });
	}

	await api.delete('/folders', { data: allFolderIds });
}
