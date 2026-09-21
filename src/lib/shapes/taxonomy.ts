// Analyst-labeled 8-shape taxonomy, rubric v1 (D-39).
// Labels are UI-layer judgments grounded in observed 2026 inputs. They never
// enter bundle inputs, input digests, or the calculation identity. See
// docs/SHAPE_TAXONOMY.md for definitions, examples, counterexamples, and
// boundary rules. O-03 (evaluator agreement) stays open.

export const SHAPE_RUBRIC_VERSION = 'shape-rubric-v1';

export type ShapeLabel =
	| 'Square'
	| 'Rectangle'
	| 'Circle'
	| 'Pentagon'
	| 'Octagon'
	| 'Diamond'
	| 'Star'
	| 'Funky'
	| 'Unclassified';

export interface ShapeAssignment {
	shape: ShapeLabel;
	rationale: string;
}

export const SHAPE_LABELS: readonly ShapeLabel[] = [
	'Square',
	'Rectangle',
	'Circle',
	'Pentagon',
	'Octagon',
	'Diamond',
	'Star',
	'Funky',
	'Unclassified'
];

// Keyed by stable `mlbam-{id}` player IDs shared across storyline bundles.
export const PLAYER_SHAPES: Readonly<Record<string, ShapeAssignment>> = {
	'mlbam-668939': {
		shape: 'Square',
		rationale: 'Current-roster catching anchor with a full observed 2026 workload.'
	},
	'mlbam-686765': {
		shape: 'Circle',
		rationale: 'Current-roster multi-position infielder with 1B/2B eligibility.'
	},
	'mlbam-702332': {
		shape: 'Star',
		rationale:
			'Elite observed production: 0.130742 R/PA, highest among regulars, over 566 PA at third base.'
	},
	'mlbam-575929': {
		shape: 'Star',
		rationale:
			'Elite observed production: 0.127580 R/PA over 533 PA; the veteran cleanup answer at first base.'
	},
	'mlbam-665966': {
		shape: 'Square',
		rationale: 'Steady everyday catcher: 552 PA at a modest 0.076087 after offseason knee surgery.'
	},
	'mlbam-657136': {
		shape: 'Square',
		rationale: 'Steady single-position backup catcher: 0.094421 over 233 PA.'
	},
	'mlbam-677800': {
		shape: 'Rectangle',
		rationale: 'Volume workhorse: team-high 657 PA with Gold Glove right field.'
	},
	'mlbam-680776': {
		shape: 'Rectangle',
		rationale: 'Volume workhorse: 592 PA across left, center, and DH in the bounce-back season.'
	},
	'mlbam-643396': {
		shape: 'Circle',
		rationale: 'Well-rounded righty utility: 2B/SS eligible, 0.124260 in a part-time role.'
	},
	'mlbam-655316': {
		shape: 'Circle',
		rationale: 'Well-rounded righty utility: 2B/SS eligible, 0.106383 over 329 PA.'
	},
	'mlbam-701350': {
		shape: 'Pentagon',
		rationale:
			'Young flash at 21: 0.094170 over 223 PA in the first full season — ascent, not foundation.'
	},
	'mlbam-678882': {
		shape: 'Pentagon',
		rationale:
			'Young flash at 25: Gold Glove center field with swing-at-everything variance, 0.117750.'
	},
	'mlbam-596115': {
		shape: 'Octagon',
		rationale:
			'Defensive anchor at shortstop and club leader; 2025 late-season throw slippage is the recorded limitation.'
	},
	'mlbam-691785': {
		shape: 'Diamond',
		rationale:
			'Fragile value: plus defender at 0.083333 but only 228 PA with a long injury history.'
	},
	'mlbam-807799': {
		shape: 'Funky',
		rationale: 'Position-less bat: DH-only with no fielding position at 10 games, 0.114478.'
	},
	'mlbam-681987': {
		shape: 'Funky',
		rationale: 'Fringe profile: 55 PA with no eligible position; speed off the bench.'
	},
	'mlbam-671213': {
		shape: 'Unclassified',
		rationale:
			'Missing inputs: zero plate appearances in 2026 on the 60-day IL. Missing stays missing.'
	}
};

export function shapeOf(playerId: string): ShapeAssignment {
	return (
		PLAYER_SHAPES[playerId] ?? {
			shape: 'Unclassified',
			rationale: 'No rubric entry for this player; left unclassified rather than guessed.'
		}
	);
}
