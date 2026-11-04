import { storylineRegistry } from '$lib/storylines/registry';

// One workspace file per decision, so the prerenderer emits a real page.
export const entries = () => storylineRegistry.map(({ slug }) => ({ slug }));
