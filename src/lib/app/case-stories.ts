// Storyline context for the Shape Case diagrams (D-43): short names for the
// storyline tabs, and every candidate lineup the storylines test, which the
// interaction map draws as swap arrows.
import { storylineRegistry } from '$lib/storylines/registry';
import { scenarioLineup, type TestedScenario } from './shape-case';

export const SHORT_TITLES: Readonly<Record<string, string>> = {
	'power-vacuum': 'Power vacuum',
	'outfield-logjam': 'Outfield logjam',
	'infield-reset': 'Infield reset',
	'catcher-split': 'Catcher split',
	'lefty-hole': 'Lefty hole'
};

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
