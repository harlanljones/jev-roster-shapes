import { storylineRegistry } from '$lib/storylines/registry';

export const entries = () => storylineRegistry.map(({ slug }) => ({ slug }));
