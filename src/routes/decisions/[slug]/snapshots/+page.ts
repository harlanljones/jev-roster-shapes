import { storylineRegistry } from '$lib/storylines/registry';

// One snapshots page per decision, so the prerenderer emits a real file for the
// subpage instead of relying on a fallback.
export const entries = () => storylineRegistry.map(({ slug }) => ({ slug }));
