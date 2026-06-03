import postgres from 'postgres';
import { nanoid } from 'nanoid';
import type { Flag, FlagType, Project } from '$lib/types';
import type { Store } from './types';

type ProjRow = { id: string; name: string; api_key: string; created_at: Date };
type FlagRow = {
	key: string;
	type: string;
	value: unknown;
	enabled: boolean;
	description: string;
	updated_at: Date;
};

const toProject = (r: ProjRow): Project => ({
	id: r.id,
	name: r.name,
	apiKey: r.api_key,
	createdAt: r.created_at.toISOString()
});
/**
 * Normalize a value read from the jsonb column into the declared type.
 * The driver may hand back an already-parsed JS value or a raw JSON-text string
 * depending on environment; we also unwrap any accidental multi-encoding written
 * by older buggy code, then coerce to the flag's declared type.
 */
function readValue(type: FlagType, raw: unknown): Flag['value'] {
	let v = raw;
	if (typeof v === 'string') {
		try {
			v = JSON.parse(v);
		} catch {
			/* a plain string, leave as-is */
		}
		// peel off repeated JSON.stringify layers from legacy writes
		while (typeof v === 'string') {
			try {
				const inner = JSON.parse(v);
				if (inner === v) break;
				v = inner;
			} catch {
				break;
			}
		}
	}
	switch (type) {
		case 'boolean':
			return typeof v === 'boolean' ? v : v === 'true';
		case 'number':
			return typeof v === 'number' ? v : Number(v);
		case 'string':
			return typeof v === 'string' ? v : String(v);
		default:
			return v;
	}
}

const toFlag = (r: FlagRow): Flag => ({
	key: r.key,
	type: r.type as FlagType,
	value: readValue(r.type as FlagType, r.value),
	enabled: r.enabled,
	description: r.description,
	updatedAt: r.updated_at.toISOString()
});

export async function createPostgresStore(url: string): Promise<Store> {
	// max:1 + prepare:false suit serverless behind a transaction pooler (e.g. Supabase :6543).
	const sql = postgres(url, { max: 1, prepare: false });

	await sql`
		CREATE TABLE IF NOT EXISTS fg_projects (
			id text PRIMARY KEY,
			name text NOT NULL,
			api_key text NOT NULL UNIQUE,
			created_at timestamptz NOT NULL DEFAULT now()
		)`;
	await sql`
		CREATE TABLE IF NOT EXISTS fg_flags (
			project_id text NOT NULL REFERENCES fg_projects(id) ON DELETE CASCADE,
			key text NOT NULL,
			type text NOT NULL,
			value jsonb NOT NULL,
			enabled boolean NOT NULL DEFAULT true,
			description text NOT NULL DEFAULT '',
			updated_at timestamptz NOT NULL DEFAULT now(),
			PRIMARY KEY (project_id, key)
		)`;

	return {
		async listProjects() {
			const rows = await sql<ProjRow[]>`SELECT * FROM fg_projects ORDER BY created_at DESC`;
			return rows.map(toProject);
		},
		async getProject(id) {
			const rows = await sql<ProjRow[]>`SELECT * FROM fg_projects WHERE id = ${id} LIMIT 1`;
			return rows[0] ? toProject(rows[0]) : null;
		},
		async getProjectByKey(apiKey) {
			const rows = await sql<ProjRow[]>`SELECT * FROM fg_projects WHERE api_key = ${apiKey} LIMIT 1`;
			return rows[0] ? toProject(rows[0]) : null;
		},
		async createProject(name) {
			const rows = await sql<ProjRow[]>`
				INSERT INTO fg_projects (id, name, api_key)
				VALUES (${nanoid(10)}, ${name}, ${'fg_' + nanoid(32)})
				RETURNING *`;
			return toProject(rows[0]);
		},
		async deleteProject(id) {
			await sql`DELETE FROM fg_projects WHERE id = ${id}`;
		},
		async listFlags(projectId) {
			const rows = await sql<FlagRow[]>`
				SELECT key, type, value, enabled, description, updated_at
				FROM fg_flags WHERE project_id = ${projectId} ORDER BY key`;
			return rows.map(toFlag);
		},
		async upsertFlag(projectId, flag) {
			const rows = await sql<FlagRow[]>`
				INSERT INTO fg_flags (project_id, key, type, value, enabled, description, updated_at)
				VALUES (${projectId}, ${flag.key}, ${flag.type}, ${sql.json(flag.value as never)},
					${flag.enabled}, ${flag.description}, now())
				ON CONFLICT (project_id, key) DO UPDATE SET
					type = EXCLUDED.type, value = EXCLUDED.value, enabled = EXCLUDED.enabled,
					description = EXCLUDED.description, updated_at = now()
				RETURNING key, type, value, enabled, description, updated_at`;
			return toFlag(rows[0]);
		},
		async deleteFlag(projectId, key) {
			await sql`DELETE FROM fg_flags WHERE project_id = ${projectId} AND key = ${key}`;
		}
	};
}
