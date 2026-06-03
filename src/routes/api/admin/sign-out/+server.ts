import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ADMIN_COOKIE } from '$lib/server/auth';

export const POST: RequestHandler = (event) => {
	event.cookies.delete(ADMIN_COOKIE, { path: '/' });
	return json({ ok: true });
};
