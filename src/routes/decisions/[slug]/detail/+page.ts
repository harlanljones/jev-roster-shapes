import { DIAGRAMS } from '$lib/app/decision';
import { storylineRegistry } from '$lib/storylines/registry';

// One file per decision and diagram, so the prerenderer emits every subpage.
export const entries = () =>
	storylineRegistry.flatMap(({ slug }) => DIAGRAMS.map(({ key }) => ({ slug, diagram: key })));
