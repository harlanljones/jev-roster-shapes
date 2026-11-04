import { storylineRegistry } from '$lib/storylines/registry';

// D-63: one detail page per decision; the diagram is chosen by `?view=`.
export const entries = () => storylineRegistry.map(({ slug }) => ({ slug }));
