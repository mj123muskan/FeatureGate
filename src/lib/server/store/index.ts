import { env } from '$env/dynamic/private';
import { createFileStore } from './file';
import { createPostgresStore } from './postgres';
import type { Store } from './types';

export type { Store } from './types';

let cached: Promise<Store> | null = null;

/** Picks the backend from env: STORE=postgres needs DATABASE_URL, else a JSON file. */
export function getStore(): Promise<Store> {
	if (!cached) {
		if (env.STORE === 'postgres') {
			if (!env.DATABASE_URL) throw new Error('STORE=postgres requires DATABASE_URL');
			cached = createPostgresStore(env.DATABASE_URL);
		} else {
			cached = Promise.resolve(createFileStore(env.DATA_FILE || 'data/flags.json'));
		}
	}
	return cached;
}
