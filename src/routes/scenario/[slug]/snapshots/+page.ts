import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { snapshotsHref } from '$lib/app/routes';
import { storylineRegistry } from '$lib/storylines/registry';

// D-63: snapshots moved with its decision.
export const entries = () => storylineRegistry.map(({ slug }) => ({ slug }));
export const load: PageLoad = ({ params }) => {
	redirect(308, snapshotsHref(params.slug));
};
