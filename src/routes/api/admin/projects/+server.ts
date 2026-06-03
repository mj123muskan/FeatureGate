import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getStore } from '$lib/server/store';

export const GET: RequestHandler = async (event) => {
	if (!event.locals.admin) throw error(403, 'Admin only');
	const store = await getStore();
	return json({ projects: await store.listProjects() });
};

export const POST: RequestHandler = async (event) => {
	if (!event.locals.admin) throw error(403, 'Admin only');
	const body = (await event.request.json().catch(() => ({}))) as Record<string, unknown>;
	const name = typeof body.name === 'string' ? body.name.trim() : '';
	if (!name) throw error(400, 'name is required');
	const store = await getStore();
	return json({ project: await store.createProject(name) }, { status: 201 });
};
