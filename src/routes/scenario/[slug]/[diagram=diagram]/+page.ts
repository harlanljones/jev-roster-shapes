import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { DIAGRAMS } from '$lib/app/decision';
import { detailHref } from '$lib/app/routes';
import { storylineRegistry } from '$lib/storylines/registry';

// D-63: the four diagram subpages became tabs of one detail page.
export const entries = () =>
	storylineRegistry.flatMap(({ slug }) => DIAGRAMS.map(({ key }) => ({ slug, diagram: key })));
export const load: PageLoad = ({ params, url }) => {
	redirect(308, detailHref(params.slug, params.diagram, url.searchParams.get('scenario')));
};
