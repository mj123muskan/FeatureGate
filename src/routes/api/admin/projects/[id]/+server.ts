import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getStore } from '$lib/server/store';

export const DELETE: RequestHandler = async (event) => {
	if (!event.locals.admin) throw error(403, 'Admin only');
	const store = await getStore();
	await store.deleteProject(event.params.id);
	return json({ ok: true });
};
