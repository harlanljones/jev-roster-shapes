// The request Jev is asked, built from evidence the caller supplies (D-47).
// SPEC §7 requires the evidence to be explicit and the model to be told not to
// do arithmetic, and the component boundary keeps this layer free of bundle and
// display concerns: the app decides what a player's evidence is, this decides
// how to state it.
import {
	EVIDENCE_SUFFICIENT_CRITERIA,
	EVIDENCE_SUFFICIENT_INSTRUCTION,
	JEV_RUBRIC_VERSION,
	PROFILE_INSTRUCTION,
	profileCriteriaMap,
	type ProfileLabel
} from './rubric';

export const PROMPT_VERSION = 'jev-profile-prompt-v1';

/** What the app knows about one player, and nothing more. */
export interface ProfileEvidence {
	playerId: string;
	name: string;
	/** Batting handedness as recorded in the source. */
	bats: string;
	/** Approved fielding eligibility, or an empty list for a DH-only bat. */
	eligiblePositions: readonly string[];
	/** Age, when the source supplies it. */
	age: number | null;
	/** The dated rate the bundle carries, with its own label. Null stays null. */
	rate: string | null;
	/** Label for `rate`, e.g. "observed R/PA (2025 season)". */
	rateLabel: string;
	/** Season plate appearances, when the source supplies a count. */
	seasonPA: number | null;
	/** Observed platoon splits, when the source supplies them. */
	split: {
		vsLeft: { pa: number; ops: string } | null;
		vsRight: { pa: number; ops: string } | null;
	} | null;
	/** Analyst notes already on file. Never generated here. */
	notes: string | null;
}

export interface JevQuestion {
	type: 'choice' | 'noul';
	instructions: string;
	criteria?: Record<string, string> | Record<string, { true: string; false: string }>;
}

export interface JevSystemOneRequest {
	state: string;
	model: string;
	questions: Record<string, JevQuestion>;
}

/** Stable question keys, so a response can be read without guessing. */
export const PROFILE_QUESTION = 'profile';
export const EVIDENCE_QUESTION = 'evidence_sufficient';

const orUnavailable = (value: string | null | undefined): string =>
	value === null || value === undefined || value === '' ? 'not available' : value;

/**
 * The state as a short labelled list. Every field the rubric's boundary rules
 * mention is present, with "not available" in place of a missing value, so the
 * model never has to recall a player fact or infer a number that is not here.
 */
export function buildEvidenceState(evidence: ProfileEvidence): string {
	const lines = [
		`Player: ${evidence.name} (${evidence.playerId})`,
		`Bats: ${orUnavailable(evidence.bats)}`,
		`Age: ${evidence.age === null ? 'not available' : String(evidence.age)}`,
		`Eligible fielding positions: ${
			evidence.eligiblePositions.length ? evidence.eligiblePositions.join(', ') : 'none'
		}`,
		`${evidence.rateLabel}: ${orUnavailable(evidence.rate)}`,
		`Season plate appearances: ${evidence.seasonPA === null ? 'not available' : evidence.seasonPA}`,
		`Against left-handed pitching: ${
			evidence.split?.vsLeft
				? `${evidence.split.vsLeft.ops} OPS over ${evidence.split.vsLeft.pa} PA`
				: 'not available'
		}`,
		`Against right-handed pitching: ${
			evidence.split?.vsRight
				? `${evidence.split.vsRight.ops} OPS over ${evidence.split.vsRight.pa} PA`
				: 'not available'
		}`,
		`Analyst notes: ${orUnavailable(evidence.notes)}`,
		`Rubric: ${JEV_RUBRIC_VERSION}`
	];
	return lines.join('\n');
}

/** The typed questions asked about one player. */
export function buildQuestions(): Record<string, JevQuestion> {
	return {
		[PROFILE_QUESTION]: {
			type: 'choice',
			instructions: PROFILE_INSTRUCTION,
			criteria: profileCriteriaMap()
		},
		[EVIDENCE_QUESTION]: {
			type: 'noul',
			instructions: EVIDENCE_SUFFICIENT_INSTRUCTION,
			criteria: EVIDENCE_SUFFICIENT_CRITERIA
		}
	};
}

/** One player's request, ready to send. */
export function buildProfileRequest(evidence: ProfileEvidence, model: string): JevSystemOneRequest {
	return {
		state: buildEvidenceState(evidence),
		model,
		questions: buildQuestions()
	};
}

export const PROFILE_LABELS_ORDER: readonly ProfileLabel[] = Object.keys(
	profileCriteriaMap()
) as ProfileLabel[];
