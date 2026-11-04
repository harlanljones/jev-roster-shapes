import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { playerHref } from '$lib/app/routes';
import { storylineRegistry } from '$lib/storylines/registry';

// D-63: player pages moved to /players/[id].
export const entries = () => {
	const ids = new Set(
		storylineRegistry.flatMap(({ bundle }) => bundle.dataset.players.map((player) => player.id))
	);
	return [...ids].map((id) => ({ id: id.replace('mlbam-', '') }));
};
export const load: PageLoad = ({ params }) => {
	redirect(308, playerHref(params.id));
};
