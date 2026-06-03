import type { Handle } from '@sveltejs/kit';
import { isAdmin } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.admin = isAdmin(event);
	return resolve(event);
};
