import type { Bundle, Scenario } from '$lib/contracts';

// D-50: every decision centers on one diagram, the board at /scenario/[slug].
// The supplementary diagrams live on subpages that read the same scenario
// pick from the `?scenario=` query, so switching pages keeps the comparison.
export const DIAGRAMS = [
	{
		key: 'case',
		title: 'The fitted case',
		nav: 'Case',
		blurb: 'Each slot as a foam cutout cut to the shape it asks for, with fit grades.'
	},
	{
		key: 'engine',
		title: 'Engine pool fit',
		nav: 'Engine fit',
		blurb: "The engine's best nine from each roster, scored with rates known on the date."
	},
	{
		key: 'interactions',
		title: 'How the pieces interact',
		nav: 'Interactions',
		blurb: 'Shared positions, tested swaps, complementary splits, and the DH lane.'
	},
	{
		key: 'slots',
		title: 'Slot by slot',
		nav: 'Slot by slot',
		blurb: 'Capacity by slot and pitcher hand, beside the hindsight best nine.'
	}
] as const;

export type DiagramKey = (typeof DIAGRAMS)[number]['key'];

export function scenariosOf(bundle: Bundle): Scenario[] {
	return [bundle.comparison.baseline, ...bundle.comparison.candidates];
}

/** The scenario named in the query, or the baseline when it is missing or unknown. */
export function pickScenario(bundle: Bundle, id: string | null): Scenario {
	return scenariosOf(bundle).find((s) => s.id === id) ?? bundle.comparison.baseline;
}
