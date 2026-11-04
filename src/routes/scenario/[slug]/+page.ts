import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { decisionHref } from '$lib/app/routes';
import { storylineRegistry } from '$lib/storylines/registry';

// D-63: decisions moved under their index; old links keep working.
export const entries = () => storylineRegistry.map(({ slug }) => ({ slug }));
export const load: PageLoad = ({ params, url }) => {
	redirect(308, decisionHref(params.slug, url.searchParams.get('scenario')));
};
