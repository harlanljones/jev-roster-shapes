// The transparent rule-based baseline SPEC §7 requires as the comparison
// point beside the analyst labels and Jev (D-55). It applies the frozen
// profile rubric's recorded rules as deterministic predicates over the same
// evidence the provider request carries, with two deliberate differences:
//
//   • it reads only the numeric and eligibility fields. The analyst notes,
//     name, handedness, and age are dropped by `toRuleEvidence`, so the
//     comparison cannot leak the labels it is measured against;
//   • where the rubric's wording is judgment ("full workload", "above-median
//     rate", "no everyday slot"), the interpretation is recorded here and
//     shown in the UI, not hidden in a tie-break.
//
// Pentagon (needs age plus extra-base/speed electricity) and Octagon (needs
// defensive-run evidence) are never mechanically evaluable from these sources
// — the baseline abstains on them by design and reports that as coverage.
// Nothing here enters a bundle, a digest, or the calculation (D-47).
import type { ProfileEvidence } from './prompt';
import type { ProfileLabel } from './rubric';

export const RULE_BASELINE_VERSION = 'rule-baseline-v1';

/** The numeric evidence the rules may read — narrower than ProfileEvidence. */
export interface RuleEvidence {
	playerId: string;
	eligiblePositions: readonly string[];
	seasonPA: number | null;
	rate: string | null;
	split: {
		vsLeft: { pa: number; ops: string } | null;
		vsRight: { pa: number; ops: string } | null;
	} | null;
}

/** Drop everything the rules must not read (notes, name, bats, age). */
export function toRuleEvidence(evidence: ProfileEvidence): RuleEvidence {
	return {
		playerId: evidence.playerId,
		eligiblePositions: evidence.eligiblePositions,
		seasonPA: evidence.seasonPA,
		rate: evidence.rate,
		split: evidence.split
	};
}

/** The one number the relative rules need: the evaluation population's median rate. */
export interface BaselineContext {
	medianRate: number | null;
}

export interface BaselineResult {
	playerId: string;
	/** The first fired rule's label, or null when the baseline abstains. */
	label: ProfileLabel | null;
	abstained: boolean;
	reason: string | null;
	/** Every rule whose predicate fired, in precedence order. */
	firedRules: ProfileLabel[];
}

const STAR_GAP = 0.2;
const STAR_MIN_SIDE_PA = 50;
const FUNKY_MAX_PA = 100;
const DIAMOND_MIN_PA = FUNKY_MAX_PA; // under 100 PA the rate is fringe sample, not "high value"
const DIAMOND_MAX_PA = 300;
const RECTANGLE_MIN_PA = 550;
const SQUARE_MIN_PA = 300;
const CIRCLE_MIN_PA = 100;
const CIRCLE_MAX_PA = 550;

function number_(value: string | number | null | undefined): number | null {
	if (value === null || value === undefined || value === '') return null;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

interface SplitFacts {
	gap: number | null;
	bothSides: boolean;
	starEligible: boolean;
}

function splitFacts(split: RuleEvidence['split']): SplitFacts {
	if (!split?.vsLeft || !split.vsRight) return { gap: null, bothSides: false, starEligible: false };
	const left = number_(split.vsLeft.ops);
	const right = number_(split.vsRight.ops);
	if (left === null || right === null) {
		return { gap: null, bothSides: false, starEligible: false };
	}
	const starEligible = split.vsLeft.pa >= STAR_MIN_SIDE_PA && split.vsRight.pa >= STAR_MIN_SIDE_PA;
	return { gap: Math.abs(left - right), bothSides: true, starEligible };
}

/**
 * Labels whose rubric criteria cannot be evaluated mechanically from the
 * supplied evidence, with the reason. Reported as coverage, never guessed.
 */
export const UNEVALUABLE_LABELS: ReadonlyArray<{ label: ProfileLabel; reason: string }> = [
	{
		label: 'Pentagon',
		reason:
			'The sources supply no birthdate and no extra-base or speed detail, so a young-flash profile cannot be judged mechanically.'
	},
	{
		label: 'Octagon',
		reason:
			'The sources supply no defensive-run evidence, so a defensive anchor cannot be judged mechanically.'
	}
];

/**
 * The documented precedence (D-55): when several recorded rules fire, the
 * first label in this order wins and `firedRules` keeps the whole trace
 * visible. Pentagon and Octagon sit between Diamond and Funky in spirit but
 * never fire — they are not mechanically evaluable from these sources
 * (see `UNEVALUABLE_LABELS`).
 */
export const BASELINE_PRECEDENCE: readonly ProfileLabel[] = [
	'Unclassified',
	'Star',
	'Rectangle',
	'Diamond',
	'Funky',
	'Square',
	'Circle'
];

/**
 * One deterministic label from the recorded rubric rules. Predicates are
 * rubric-literal (several may fire at once); the documented precedence picks
 * the label and `firedRules` keeps the whole trace visible.
 */
export function classifyBaseline(evidence: RuleEvidence, context: BaselineContext): BaselineResult {
	const pa = evidence.seasonPA;
	const positions = evidence.eligiblePositions;
	const facts = splitFacts(evidence.split);
	const rate = number_(evidence.rate);
	const fired: ProfileLabel[] = [];

	// Unclassified: the rubric's own "the evidence is missing" label.
	if (positions.length === 0 && pa === 0) fired.push('Unclassified');
	// Star: the recorded platoon-quirk rule.
	if (facts.starEligible && facts.gap !== null && facts.gap >= STAR_GAP) fired.push('Star');
	// Rectangle: high-volume workhorse.
	if (pa !== null && pa >= RECTANGLE_MIN_PA && positions.length >= 1) fired.push('Rectangle');
	// Diamond: above-median rate over an injury-limited season. Its floor is
	// Funky's fringe cutoff: under 100 PA the rate is too small a sample to
	// call "high value", so the fringe rule governs instead.
	if (
		pa !== null &&
		pa >= DIAMOND_MIN_PA &&
		pa < DIAMOND_MAX_PA &&
		rate !== null &&
		context.medianRate !== null &&
		rate > context.medianRate
	) {
		fired.push('Diamond');
	}
	// Pentagon and Octagon: never evaluable from these sources (see UNEVALUABLE_LABELS).
	// Funky: DH-only bat or fringe volume.
	if (
		(positions.length === 0 && pa !== null && pa > 0) ||
		(pa !== null && pa > 0 && pa < FUNKY_MAX_PA)
	) {
		fired.push('Funky');
	}
	// Square: steady single-position regular, no large split gap (recorded
	// interpretation: full workload is 300+ PA; "no large gap" is under the
	// Star rule's .200 threshold).
	if (
		positions.length === 1 &&
		pa !== null &&
		pa >= SQUARE_MIN_PA &&
		facts.bothSides &&
		facts.gap !== null &&
		facts.gap < STAR_GAP
	) {
		fired.push('Square');
	}
	// Circle: well-rounded utility (recorded interpretation: "no everyday
	// slot" reads as multi-position eligibility under Rectangle volume, with
	// no platoon quirk).
	if (
		positions.length >= 2 &&
		pa !== null &&
		pa >= CIRCLE_MIN_PA &&
		pa < CIRCLE_MAX_PA &&
		facts.bothSides &&
		facts.gap !== null &&
		facts.gap < STAR_GAP
	) {
		fired.push('Circle');
	}

	const label = BASELINE_PRECEDENCE.find((candidate) => fired.includes(candidate)) ?? null;
	if (label) {
		return {
			playerId: evidence.playerId,
			label,
			abstained: false,
			reason: null,
			firedRules: fired
		};
	}
	return {
		playerId: evidence.playerId,
		label: null,
		abstained: true,
		reason: abstentionReason(evidence, facts),
		firedRules: fired
	};
}

/**
 * The Diamond rule's "above-median rate" needs a reference population. Per
 * D-55 the cut is the median rate of the evaluated players that have one —
 * computed once over the population and reused everywhere, so a player's
 * Diamond verdict follows the dated evidence, never the decision it is
 * displayed on. Rates are the parsed numeric strings the evidence carries;
 * nulls and unparsable values are skipped. Returns null when none remain.
 */
export function medianRateOf(rates: readonly (string | number | null)[]): number | null {
	const parsed = rates
		.map(number_)
		.filter((rate): rate is number => rate !== null)
		.sort((a, b) => a - b);
	if (parsed.length === 0) return null;
	const middle = Math.floor(parsed.length / 2);
	if (parsed.length % 2 === 1) return parsed[middle]!;
	return (parsed[middle - 1]! + parsed[middle]!) / 2;
}

/** One confusion-matrix row: analyst label → baseline outcome counts. */
export interface MatrixRow {
	analyst: ProfileLabel;
	/** Baseline label, or `abstained`. */
	counts: Readonly<Record<string, number>>;
}

export interface ClassAgreement {
	label: ProfileLabel;
	n: number;
	matched: number;
	abstained: number;
}

export interface BaselineAgreement {
	compared: number;
	matched: number;
	abstained: number;
	/** Share of compared players the baseline abstained on. */
	abstentionCoverage: number;
	matrix: ReadonlyArray<MatrixRow>;
	perClass: ReadonlyArray<ClassAgreement>;
}

/**
 * Agreement of baseline labels with the analyst labels, over the players both
 * sides cover. Results without an analyst label are ignored — they are the
 * baseline's own coverage, not agreement evidence.
 */
export function baselineAgreement(
	results: readonly BaselineResult[],
	labels: Readonly<Record<string, ProfileLabel>>
): BaselineAgreement {
	const byLabel = new Map<ProfileLabel, ClassAgreement>();
	const matrix = new Map<ProfileLabel, Record<string, number>>();
	let compared = 0;
	let matched = 0;
	let abstained = 0;
	for (const result of results) {
		const analyst = labels[result.playerId];
		if (!analyst) continue;
		compared += 1;
		const outcome = result.label ?? 'abstained';
		if (result.abstained) abstained += 1;
		if (outcome === analyst) matched += 1;
		const row = matrix.get(analyst) ?? {};
		row[outcome] = (row[outcome] ?? 0) + 1;
		matrix.set(analyst, row);
		const cell = byLabel.get(analyst) ?? { label: analyst, n: 0, matched: 0, abstained: 0 };
		cell.n += 1;
		if (outcome === analyst) cell.matched += 1;
		if (result.abstained) cell.abstained += 1;
		byLabel.set(analyst, cell);
	}
	return {
		compared,
		matched,
		abstained,
		abstentionCoverage: compared === 0 ? 0 : abstained / compared,
		matrix: [...matrix.entries()]
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([analyst, counts]) => ({ analyst, counts })),
		perClass: [...byLabel.values()]
	};
}

function abstentionReason(evidence: RuleEvidence, facts: SplitFacts): string {
	const missing: string[] = [];
	if (evidence.seasonPA === null) {
		missing.push('season plate appearances (no split evidence)');
	}
	if (number_(evidence.rate) === null) {
		missing.push('an observed rate');
	}
	if (!facts.bothSides) {
		missing.push('both platoon-split rates');
	}
	const basis =
		missing.length > 0
			? `The evidence lacks ${missing.join(', ')}, so no rubric rule could be evaluated mechanically.`
			: 'No recorded rule fits this evidence combination.';
	return `${basis} Pentagon and Octagon are never mechanically evaluable from these sources.`;
}
