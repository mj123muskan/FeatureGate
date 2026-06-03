import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getStore } from '$lib/server/store';
import { coerceValue } from '$lib/server/flags';

export const PATCH: RequestHandler = async (event) => {
	if (!event.locals.admin) throw error(403, 'Admin only');
	const store = await getStore();
	const flags = await store.listFlags(event.params.id);
	const flag = flags.find((f) => f.key === event.params.key);
	if (!flag) throw error(404, 'Flag not found');

	const body = (await event.request.json().catch(() => ({}))) as Record<string, unknown>;

	if (body.enabled !== undefined) flag.enabled = body.enabled === true;
	if (typeof body.description === 'string') flag.description = body.description;
	if (body.value !== undefined) {
		const coerced = coerceValue(flag.type, body.value);
		if (!coerced.ok) throw error(400, 'value does not match type');
		flag.value = coerced.value;
	}
	flag.updatedAt = new Date().toISOString();

	return json({ flag: await store.upsertFlag(event.params.id, flag) });
};

export const DELETE: RequestHandler = async (event) => {
	if (!event.locals.admin) throw error(403, 'Admin only');
	const store = await getStore();
	await store.deleteFlag(event.params.id, event.params.key);
	return json({ ok: true });
};
