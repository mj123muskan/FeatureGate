import type { PageServerLoad } from './$types';
import { getStore } from '$lib/server/store';
import { adminConfigured } from '$lib/server/auth';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.admin) {
		return { configured: adminConfigured(), projects: [] };
	}
	const store = await getStore();
	return { configured: true, projects: await store.listProjects() };
};
