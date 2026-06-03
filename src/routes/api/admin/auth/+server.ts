import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ADMIN_COOKIE, checkAdminToken } from '$lib/server/auth';
import { dev } from '$app/environment';

export const POST: RequestHandler = async (event) => {
	const body = (await event.request.json().catch(() => ({}))) as Record<string, unknown>;
	const token = typeof body.token === 'string' ? body.token : '';
	if (!checkAdminToken(token)) throw error(403, 'Invalid admin token');

	event.cookies.set(ADMIN_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		maxAge: 60 * 60 * 24 * 30
	});
	return json({ ok: true });
};
