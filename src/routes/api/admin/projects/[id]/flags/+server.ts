import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getStore } from '$lib/server/store';
import { coerceValue, defaultValueFor, isFlagType } from '$lib/server/flags';
import type { Flag } from '$lib/types';

export const POST: RequestHandler = async (event) => {
	if (!event.locals.admin) throw error(403, 'Admin only');
	const store = await getStore();
	const project = await store.getProject(event.params.id);
	if (!project) throw error(404, 'Project not found');

	const body = (await event.request.json().catch(() => ({}))) as Record<string, unknown>;
	const key = typeof body.key === 'string' ? body.key.trim() : '';
	if (!/^[a-zA-Z0-9_.-]+$/.test(key)) throw error(400, 'key must be alphanumeric (._- allowed)');
	if (!isFlagType(body.type)) throw error(400, 'invalid type');

	const existing = await store.listFlags(project.id);
	if (existing.some((f) => f.key === key)) throw error(409, 'flag already exists');

	const rawValue = body.value === undefined ? defaultValueFor(body.type) : body.value;
	const coerced = coerceValue(body.type, rawValue);
	if (!coerced.ok) throw error(400, 'value does not match type');

	const flag: Flag = {
		key,
		type: body.type,
		value: coerced.value,
		enabled: body.enabled === undefined ? true : body.enabled === true,
		description: typeof body.description === 'string' ? body.description : '',
		updatedAt: new Date().toISOString()
	};
	return json({ flag: await store.upsertFlag(project.id, flag) }, { status: 201 });
};
