import { error } from '@sveltejs/kit';
import { getStoryline } from '$lib/storylines/registry';
import type { LayoutLoad } from './$types';

// D-63: one lookup for every decision route. Throwing from load (not from a component)
// is what lets SvelteKit render +error.svelte for an unknown or removed slug.
export const load: LayoutLoad = ({ params }) => {
	const storyline = getStoryline(params.slug);
	if (!storyline) error(404, 'Decision not found');
	return { storyline };
};
