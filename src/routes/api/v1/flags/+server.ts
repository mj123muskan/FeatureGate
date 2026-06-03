import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getStore } from '$lib/server/store';
import type { ResolvedFlag } from '$lib/types';

const CORS = {
	'access-control-allow-origin': '*',
	'access-control-allow-headers': 'x-api-key, content-type',
	'access-control-allow-methods': 'GET, OPTIONS'
};

export const OPTIONS: RequestHandler = () => new Response(null, { status: 204, headers: CORS });

/**
 * Language-agnostic read endpoint. Any app sends its project read key and gets
 * back the full flag map. Example:
 *   curl -H "x-api-key: fg_..." https://gate.example.com/api/v1/flags
 */
export const GET: RequestHandler = async (event) => {
	const apiKey = event.request.headers.get('x-api-key') ?? event.url.searchParams.get('apiKey') ?? '';
	if (!apiKey) {
		return json({ error: 'missing x-api-key' }, { status: 401, headers: CORS });
	}

	const store = await getStore();
	const project = await store.getProjectByKey(apiKey);
	if (!project) {
		return json({ error: 'invalid api key' }, { status: 401, headers: CORS });
	}

	const flags = await store.listFlags(project.id);
	const map: Record<string, ResolvedFlag> = {};
	for (const f of flags) {
		map[f.key] = { type: f.type, value: f.value, enabled: f.enabled };
	}

	return json(
		{ project: project.name, flags: map },
		{ headers: { ...CORS, 'cache-control': 'public, max-age=15' } }
	);
};
