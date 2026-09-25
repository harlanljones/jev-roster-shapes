// Storyline context for the Shape Case diagrams (D-43, D-44): short names for
// the timeline pins, and every candidate lineup the storylines test, which the
// interaction map draws as swap arrows.
import { storylineRegistry } from '$lib/storylines/registry';
import { scenarioLineup, type TestedScenario } from './shape-case';

export const TESTED_SCENARIOS: readonly TestedScenario[] = storylineRegistry.flatMap((story) => {
	const baseLineup = scenarioLineup(story.bundle, story.bundle.comparison.baseline);
	return story.bundle.comparison.candidates.map((candidate) => ({
		story: story.slug,
		scenarioId: candidate.id,
		label: candidate.label,
		lineup: scenarioLineup(story.bundle, candidate),
		baseLineup
	}));
});
