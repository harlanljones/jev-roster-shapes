// Analyst-labeled 8-shape taxonomy, rubric v2 (D-39, revised by D-43).
// Labels are UI-layer judgments grounded in observed 2026 inputs. They never
// enter bundle inputs, input digests, or the calculation identity. See
// docs/SHAPE_TAXONOMY.md for definitions, examples, counterexamples, and
// boundary rules. O-03 (evaluator agreement) stays open.
//
// Rubric v2 (D-43) adopts Harlan's revision: a Star is a quirky or tough fit,
// not a star player. The recorded rule is a platoon gap of at least .200 OPS
// between vs-LHP and vs-RHP with 50+ PA on each side (2026 statSplits). The
// two v1 Stars (elite production) had no such quirk and become Squares.
// D-44 reapplies the rule to full-season combined rows (September 25):
// Kiner-Falefa stays a Star; Monasterio's gap narrows to .190 and he becomes
// a Circle. Storyline players added by the season timeline are labeled here
// under the same rule, including Bregman for the D-45 offseason storyline.

export const SHAPE_RUBRIC_VERSION = 'shape-rubric-v2';

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
		shape: 'Square',
		rationale:
			'Steady everyday single-position regular: .697 vs LHP, .718 vs RHP, no platoon quirk. Observed 0.127148 R/PA over 582 PA at third base.'
	},
	'mlbam-575929': {
		shape: 'Square',
		rationale:
			'Steady everyday single-position regular: .981 vs LHP, .878 vs RHP, no platoon quirk. Observed 0.127580 R/PA over 533 PA; the veteran cleanup answer at first base.'
	},
	'mlbam-665966': {
		shape: 'Square',
		rationale:
			'Steady single-position catcher: 283 PA at 0.077739 (Boston, then Baltimore after the August 3 trade), .450 vs LHP and .480 vs RHP, no platoon quirk.'
	},
	'mlbam-657136': {
		shape: 'Square',
		rationale: 'Steady single-position backup catcher: 0.094017 over 234 PA.'
	},
	'mlbam-677800': {
		shape: 'Rectangle',
		rationale: 'Volume workhorse: team-high 674 PA with Gold Glove right field.'
	},
	'mlbam-680776': {
		shape: 'Rectangle',
		rationale: 'Volume workhorse: 603 PA across left, center, and DH in the bounce-back season.'
	},
	'mlbam-643396': {
		shape: 'Star',
		rationale:
			'Tough fit: .417 OPS vs LHP (54 PA) against .701 vs RHP (126 PA), a .284 platoon gap. Plays right-handed pitching well, so he needs a partner to fill a slot.'
	},
	'mlbam-655316': {
		shape: 'Circle',
		rationale:
			'Well-rounded utility at 1B/2B/SS: .798 OPS vs LHP (126 PA) and .608 vs RHP (215 PA). The .190 gap on full-season rows sits just under the .200 Star line; on partial Boston rows (September 24) it was .247 and he was a Star.'
	},
	'mlbam-701350': {
		shape: 'Pentagon',
		rationale:
			'Young flash at 21: 0.101266 over 237 PA in the first full season — ascent, not foundation.'
	},
	'mlbam-678882': {
		shape: 'Pentagon',
		rationale:
			'Young flash at 25: Gold Glove center field with swing-at-everything variance, 0.116725.'
	},
	'mlbam-596115': {
		shape: 'Octagon',
		rationale:
			'Defensive anchor at shortstop and club leader; 2025 late-season throw slippage is the recorded limitation.'
	},
	'mlbam-691785': {
		shape: 'Diamond',
		rationale:
			'Fragile value: plus defender with a long injury history; 228 PA for Boston before the deadline trade to San Francisco, 236 PA at 0.080508 in all.'
	},
	'mlbam-807799': {
		shape: 'Funky',
		rationale: 'Position-less bat: DH-only with no fielding position at 10 games, 0.114478.'
	},
	'mlbam-681987': {
		shape: 'Funky',
		rationale: 'Fringe profile: 55 PA with no eligible position; speed off the bench.'
	},
	'mlbam-678011': {
		shape: 'Circle',
		rationale:
			'Multi-position utility (2B in 2026, 3B in 2025): 173 PA at 0.121387. His .550 vs LHP and .784 vs RHP would be a Star-sized gap, but 42 PA against lefties is under the 50-PA line.'
	},
	'mlbam-668670': {
		shape: 'Square',
		rationale:
			'Single-position backup catcher: 171 PA across four clubs at 0.099415. The .773 vs LHP and .491 vs RHP gap rests on 45 PA against lefties, under the Star line.'
	},
	'mlbam-681508': {
		shape: 'Circle',
		rationale:
			'Bat-first utility with catcher and first-base starts: .902 OPS vs RHP over 197 PA, .268 vs LHP over only 28 PA, too few to call a platoon Star.'
	},
	'mlbam-663330': {
		shape: 'Circle',
		rationale:
			'Corner-outfield platoon bat (LF/RF from 2025): .753 OPS vs LHP over 152 PA. Only 23 PA against righties keeps him under the Star line.'
	},
	'mlbam-608324': {
		shape: 'Square',
		rationale:
			'Steady single-position third baseman: .850 vs LHP and .782 vs RHP over 697 PA for the Cubs in 2026, no platoon quirk. In this app he is the Boston counterfactual: he signed with Chicago in January.'
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
