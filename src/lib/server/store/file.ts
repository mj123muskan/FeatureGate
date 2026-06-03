import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { nanoid } from 'nanoid';
import type { Flag, Project } from '$lib/types';
import type { Store } from './types';

type Db = { projects: Project[]; flags: Record<string, Flag[]> };

/**
 * Simple JSON-file store with an in-memory cache. Good for single-instance
 * deploys (container/VM with a volume) and local dev. Swap to the Postgres
 * store for serverless / multi-instance scale.
 */
export function createFileStore(path: string): Store {
	let db: Db = { projects: [], flags: {} };

	if (existsSync(path)) {
		try {
			db = JSON.parse(readFileSync(path, 'utf8')) as Db;
		} catch {
			/* start fresh on a corrupt file */
		}
	} else {
		mkdirSync(dirname(path), { recursive: true });
	}

	const persist = () => writeFileSync(path, JSON.stringify(db, null, 2));

	return {
		async listProjects() {
			return [...db.projects];
		},
		async getProject(id) {
			return db.projects.find((p) => p.id === id) ?? null;
		},
		async getProjectByKey(apiKey) {
			return db.projects.find((p) => p.apiKey === apiKey) ?? null;
		},
		async createProject(name) {
			const project: Project = {
				id: nanoid(10),
				name,
				apiKey: `fg_${nanoid(32)}`,
				createdAt: new Date().toISOString()
			};
			db.projects.push(project);
			db.flags[project.id] = [];
			persist();
			return project;
		},
		async deleteProject(id) {
			db.projects = db.projects.filter((p) => p.id !== id);
			delete db.flags[id];
			persist();
		},
		async listFlags(projectId) {
			return [...(db.flags[projectId] ?? [])];
		},
		async upsertFlag(projectId, flag) {
			const list = db.flags[projectId] ?? (db.flags[projectId] = []);
			const idx = list.findIndex((f) => f.key === flag.key);
			if (idx >= 0) list[idx] = flag;
			else list.push(flag);
			persist();
			return flag;
		},
		async deleteFlag(projectId, key) {
			const list = db.flags[projectId];
			if (list) db.flags[projectId] = list.filter((f) => f.key !== key);
			persist();
		}
	};
}
