import type { Flag, Project } from '$lib/types';

export type Store = {
	listProjects(): Promise<Project[]>;
	getProject(id: string): Promise<Project | null>;
	getProjectByKey(apiKey: string): Promise<Project | null>;
	createProject(name: string): Promise<Project>;
	deleteProject(id: string): Promise<void>;

	listFlags(projectId: string): Promise<Flag[]>;
	upsertFlag(projectId: string, flag: Flag): Promise<Flag>;
	deleteFlag(projectId: string, key: string): Promise<void>;
};
