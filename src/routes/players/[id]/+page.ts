import { error } from '@sveltejs/kit';
import { buildPool } from '$lib/app/shape-case';
import { storylineRegistry } from '$lib/storylines/registry';
import type { PageLoad } from './$types';

export const entries = () => {
	const ids = new Set(
		storylineRegistry.flatMap(({ bundle }) => bundle.dataset.players.map((player) => player.id))
	);
	return [...ids].map((id) => ({ id: id.replace('mlbam-', '') }));
};

// Looked up in load, not in the component, so an unknown id renders +error.svelte.
export const load: PageLoad = ({ params }) => {
	const playerId = `mlbam-${params.id}`;
	const source = storylineRegistry.find(({ bundle }) =>
		bundle.dataset.players.some((player) => player.id === playerId)
	);
	const player = source ? buildPool(source.bundle).get(playerId) : undefined;
	if (!player) error(404, 'Player not found');
	return { player };
};
