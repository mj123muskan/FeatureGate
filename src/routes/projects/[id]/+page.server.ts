import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getStore } from '$lib/server/store';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.admin) throw redirect(303, '/');
	const store = await getStore();
	const project = await store.getProject(event.params.id);
	if (!project) throw error(404, 'Project not found');
	const flags = await store.listFlags(project.id);
	return { project, flags, origin: event.url.origin };
};
