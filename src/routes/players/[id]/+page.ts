import { storylineRegistry } from '$lib/storylines/registry';

export const entries = () => {
	const ids = new Set(
		storylineRegistry.flatMap(({ bundle }) => bundle.dataset.players.map((player) => player.id))
	);
	return [...ids].map((id) => ({ id: id.replace('mlbam-', '') }));
};
