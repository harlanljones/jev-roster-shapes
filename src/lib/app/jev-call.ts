// The view of one Jev call (D-57): the state it carries, then each question
// with its type, instructions, and criteria, with whatever came back laid on
// the criteria beside the rule baseline and the analyst label. It reads the
// request and the validated record only; it never makes an answer up, so an
// unasked call shows its questions with no probabilities at all.
import {
	PROMPT_VERSION,
	RULE_SUMMARIES,
	isProfileLabel,
	type BaselineResult,
	type JevRecord,
	type JevSystemOneRequest
} from '$lib/classification';
import type { ShapeLabel } from '$lib/shapes/taxonomy';

/**
 * The evidence_sufficient answer below which a piece is marked thin. This is a
 * recorded judgment, not a calibrated threshold (D-59, O-07): across the 109
 * recorded answers every player with full evidence scored 0.29–0.55 and the one
 * player with no plate appearances and no splits scored 0.10, so .50 split the
 * noise and hatched most of the roster while .25 marks only the clearly thin.
 */
export const THIN_EVIDENCE_BELOW = 0.25;

/** True when a validated Jev answer says the evidence was thin. No answer is not thin. */
export const isThinEvidence = (record: JevRecord | null | undefined): boolean =>
	(record?.answer?.evidenceSufficient ?? 1) < THIN_EVIDENCE_BELOW;

export interface CallStateRow {
	key: string;
	value: string;
	/** "not available" in the request, or a field withheld on purpose. */
	missing: boolean;
}

export interface CallOption {
	option: string;
	text: string;
	/** The recorded rule for a profile option, when the rubric has one. */
	rule: string | null;
	/** Jev's probability, or null when there is no validated answer. */
	probability: number | null;
	jev: boolean;
	baseline: boolean;
	analyst: boolean;
}

export interface CallChoice {
	key: string;
	type: 'choice';
	instructions: string;
	options: CallOption[];
	confidence: number | null;
}

export interface CallNoul {
	key: string;
	type: 'noul';
	instructions: string;
	whenTrue: string;
	whenFalse: string;
	/** Probability that the true criterion holds, or null when unanswered. */
	probability: number | null;
}

export type CallQuestion = CallChoice | CallNoul;

export interface CallView {
	model: string;
	promptVersion: string;
	status: string;
	answered: boolean;
	state: CallStateRow[];
	questions: CallQuestion[];
}

export interface CallCompare {
	baseline: BaselineResult | null;
	analyst: ShapeLabel | null;
}

/** The state's "Label: value" lines as rows; the analyst label is always shown as withheld. */
export function stateRows(state: string): CallStateRow[] {
	const rows = state.split('\n').map((line) => {
		const at = line.indexOf(': ');
		const key = at < 0 ? line : line.slice(0, at);
		const value = at < 0 ? '' : line.slice(at + 2);
		return { key, value, missing: value === 'not available' };
	});
	return [...rows, { key: 'Analyst label', value: 'withheld from the request', missing: true }];
}

const STATUS_TEXT: Readonly<Record<string, string>> = {
	current: 'answered',
	'invalid-response': 'invalid response',
	timeout: 'timed out',
	error: 'request failed',
	overridden: 'overridden',
	pending: 'asking',
	'awaiting-acknowledgment': 'awaiting acknowledgment',
	'not-configured': 'not requested'
};

export function callView(
	request: JevSystemOneRequest,
	record: JevRecord | null,
	compare: CallCompare
): CallView {
	const answers = record?.status === 'current' ? (record.response?.answers ?? null) : null;
	const questions = Object.entries(request.questions).map(([key, question]): CallQuestion => {
		const answer = answers?.[key];
		if (question.type === 'noul') {
			const criteria = (question.criteria ?? {}) as { true?: string; false?: string };
			return {
				key,
				type: 'noul',
				instructions: question.instructions,
				whenTrue: criteria.true ?? '',
				whenFalse: criteria.false ?? '',
				probability: answer?.type === 'noul' ? answer.noul : null
			};
		}
		const criteria = (question.criteria ?? {}) as Record<string, string>;
		const choice = answer?.type === 'choice' ? answer : null;
		const options = Object.entries(criteria).map(([option, text]) => ({
			option,
			text,
			rule: isProfileLabel(option) ? RULE_SUMMARIES[option] : null,
			probability: choice ? (choice.probabilities[option] ?? 0) : null,
			jev: choice?.choice === option,
			baseline: compare.baseline?.label === option,
			analyst: compare.analyst === option
		}));
		if (choice) options.sort((a, b) => (b.probability ?? 0) - (a.probability ?? 0));
		return {
			key,
			type: 'choice',
			instructions: question.instructions,
			options,
			confidence: choice?.confidence ?? null
		};
	});
	return {
		model: record?.model ?? request.model,
		promptVersion: record?.promptVersion ?? PROMPT_VERSION,
		status: record ? (STATUS_TEXT[record.status] ?? record.status) : 'not requested',
		answered: answers !== null,
		state: stateRows(request.state),
		questions
	};
}

/** Which source draws a piece's shape in the lanes view. */
export type LabelSource = 'jev' | 'rule' | 'analyst';

/** One player's label from each source; null where a source has none. */
export interface SourceLabels {
	jev: ShapeLabel | null;
	rule: ShapeLabel | null;
	analyst: ShapeLabel;
}

export const SOURCE_NAMES: Readonly<Record<LabelSource, string>> = {
	jev: 'Jev',
	rule: 'Rule baseline',
	analyst: 'Analyst'
};

/** True when the sources that answered do not all agree. */
export function sourcesDisagree(labels: SourceLabels): boolean {
	const given = [labels.jev, labels.rule, labels.analyst].filter((label) => label !== null);
	return new Set(given).size > 1;
}

/** The labels for one player from a Jev record, a baseline result, and the analyst. */
export function sourceLabels(
	record: JevRecord | null,
	baseline: BaselineResult | null,
	analyst: ShapeLabel
): SourceLabels {
	return {
		jev: record?.status === 'current' ? (record.answer?.label ?? null) : null,
		rule: baseline?.label ?? null,
		analyst
	};
}
