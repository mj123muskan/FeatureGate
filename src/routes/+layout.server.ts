import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = (event) => {
	return { admin: event.locals.admin };
};
