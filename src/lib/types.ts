export const FLAG_TYPES = ['boolean', 'string', 'number', 'json'] as const;
export type FlagType = (typeof FLAG_TYPES)[number];

export type FlagValue = boolean | string | number | unknown;

export type Flag = {
	key: string;
	type: FlagType;
	value: FlagValue;
	enabled: boolean;
	description: string;
	updatedAt: string;
};

export type Project = {
	id: string;
	name: string;
	apiKey: string;
	createdAt: string;
};

/** Shape returned to client apps by GET /api/v1/flags */
export type ResolvedFlag = {
	type: FlagType;
	value: FlagValue;
	enabled: boolean;
};
