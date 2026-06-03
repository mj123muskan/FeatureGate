import { timingSafeEqual } from 'node:crypto';
import { env } from '$env/dynamic/private';
import type { RequestEvent } from '@sveltejs/kit';

export const ADMIN_COOKIE = 'fg_admin';

function safeEqual(a: string, b: string): boolean {
	const ab = Buffer.from(a);
	const bb = Buffer.from(b);
	if (ab.length !== bb.length) return false;
	return timingSafeEqual(ab, bb);
}

export function adminConfigured(): boolean {
	return (env.ADMIN_TOKEN ?? '').length > 0;
}

export function checkAdminToken(token: string): boolean {
	const t = env.ADMIN_TOKEN ?? '';
	return t.length > 0 && safeEqual(token, t);
}

export function isAdmin(event: RequestEvent): boolean {
	const cookie = event.cookies.get(ADMIN_COOKIE);
	return !!cookie && checkAdminToken(cookie);
}
