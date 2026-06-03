import type { FlagType, FlagValue } from '$lib/types';
import { FLAG_TYPES } from '$lib/types';

export function isFlagType(t: unknown): t is FlagType {
	return typeof t === 'string' && (FLAG_TYPES as readonly string[]).includes(t);
}

/** Validate (and lightly coerce) a raw value against a declared flag type. */
export function coerceValue(type: FlagType, raw: unknown): { ok: true; value: FlagValue } | { ok: false } {
	switch (type) {
		case 'boolean':
			if (typeof raw === 'boolean') return { ok: true, value: raw };
			if (raw === 'true' || raw === 'false') return { ok: true, value: raw === 'true' };
			return { ok: false };
		case 'string':
			return typeof raw === 'string' ? { ok: true, value: raw } : { ok: false };
		case 'number': {
			const n = typeof raw === 'number' ? raw : Number(raw);
			return Number.isFinite(n) ? { ok: true, value: n } : { ok: false };
		}
		case 'json':
			if (typeof raw === 'string') {
				try {
					return { ok: true, value: JSON.parse(raw) };
				} catch {
					return { ok: false };
				}
			}
			return { ok: true, value: raw };
	}
}

export function defaultValueFor(type: FlagType): FlagValue {
	switch (type) {
		case 'boolean':
			return false;
		case 'string':
			return '';
		case 'number':
			return 0;
		case 'json':
			return {};
	}
}
