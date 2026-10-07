import { describe, expect, it } from 'vitest';
import {
	RULE_SUMMARIES,
	buildProfileRequest,
	requestDigest,
	type BaselineResult,
	type JevRecord,
	type ProfileEvidence
} from '../../src/lib/classification';
import {
	THIN_EVIDENCE_BELOW,
	callView,
	isThinEvidence,
	sourceLabels,
	sourcesDisagree,
	stateRows
} from '../../src/lib/app/jev-call';

// D-57: the call view shows the request's questions, types, instructions and
// criteria, and lays an answer on them only when a validated one exists.
const evidence: ProfileEvidence = {
	playerId: 'mlbam-701350',
	name: 'Roman Anthony',
	bats: 'L',
	eligiblePositions: ['LF', 'RF'],
	age: null,
	rate: '0.099174',
	rateLabel: 'Observed runs per PA (2026 season to date)',
	seasonPA: 242,
	split: { vsLeft: { pa: 83, ops: '.588' }, vsRight: { pa: 159, ops: '.817' } },
	notes: null
};
const request = buildProfileRequest(evidence, 'jev-latest');
const star: BaselineResult = {
	playerId: evidence.playerId,
	label: 'Star',
	abstained: false,
	reason: null,
	firedRules: ['Star']
};

function answered(probabilities: Record<string, number>, noul: number): JevRecord {
	const choice = Object.entries(probabilities).sort((a, b) => b[1] - a[1])[0]![0];
	return {
		classificationVersion: 'jev-classification-v1',
		promptVersion: 'jev-profile-prompt-v1',
		rubricVersion: 'jev-profile-rubric-v1',
		responseContractVersion: 'jev-response-v1',
		requestDigest: requestDigest(request),
		providerId: 'test',
		requestedModel: 'jev-latest',
		model: 'jev-test-1',
		request,
		response: {
			model: 'jev-test-1',
			answers: {
				profile: { type: 'choice', choice, probabilities, confidence: 0.6 },
				evidence_sufficient: { type: 'noul', noul }
			},
			usage: { input_tokens: 10, output_tokens: 2 }
		},
		status: 'current',
		issues: [],
		usage: null,
		timingMs: 1,
		answer: null,
		override: null
	};
}

describe('callView', () => {
	it('shows every question, type, instruction, and criterion with no probabilities when unasked', () => {
		const view = callView(request, null, { baseline: star, analyst: 'Pentagon' });

		expect(view.answered).toBe(false);
		expect(view.status).toBe('not requested');
		expect(view.questions.map((q) => [q.key, q.type])).toEqual([
			['profile', 'choice'],
			['evidence_sufficient', 'noul']
		]);
		const profile = view.questions[0]!;
		if (profile.type !== 'choice') throw new Error('expected a choice');
		expect(profile.instructions).toMatch(/^Which single profile label/);
		expect(profile.options.map((o) => o.option)).toEqual(Object.keys(RULE_SUMMARIES));
		expect(profile.options.every((o) => o.probability === null && !o.jev)).toBe(true);
		expect(profile.options.find((o) => o.option === 'Star')).toMatchObject({
			baseline: true,
			analyst: false,
			rule: RULE_SUMMARIES.Star
		});
		const noul = view.questions[1]!;
		if (noul.type !== 'noul') throw new Error('expected a noul');
		expect(noul.probability).toBeNull();
		expect(noul.whenTrue).toMatch(/^The observations state position eligibility/);
	});

	it('orders the criteria by the validated answer and reads the noul', () => {
		const record = answered(
			{
				Star: 0.61,
				Pentagon: 0.17,
				Diamond: 0.1,
				Circle: 0.06,
				Square: 0.02,
				Rectangle: 0.01,
				Octagon: 0.01,
				Funky: 0.01,
				Unclassified: 0.01
			},
			0.72
		);
		const view = callView(request, record, { baseline: star, analyst: 'Pentagon' });

		expect(view.answered).toBe(true);
		expect(view.model).toBe('jev-test-1');
		const profile = view.questions[0]!;
		if (profile.type !== 'choice') throw new Error('expected a choice');
		expect(profile.options.slice(0, 2).map((o) => [o.option, o.probability, o.jev])).toEqual([
			['Star', 0.61, true],
			['Pentagon', 0.17, false]
		]);
		expect(profile.confidence).toBe(0.6);
		const noul = view.questions[1]!;
		expect(noul.type === 'noul' && noul.probability).toBe(0.72);
	});

	it('ignores a response that did not validate', () => {
		const record = { ...answered({ Star: 1 }, 0.9), status: 'invalid-response' as const };
		const view = callView(request, record, { baseline: null, analyst: null });

		expect(view.answered).toBe(false);
		expect(view.status).toBe('invalid response');
	});
});

describe('state and labels', () => {
	it('lists the state lines, marks missing values, and shows the analyst label as withheld', () => {
		const rows = stateRows(request.state);

		expect(rows.find((r) => r.key === 'Age')).toEqual({
			key: 'Age',
			value: 'not available',
			missing: true
		});
		expect(rows.at(-1)).toMatchObject({ key: 'Analyst label', missing: true });
	});

	it('keeps a missing Jev or rule label missing and flags disagreement', () => {
		const labels = sourceLabels(null, star, 'Pentagon');

		expect(labels).toEqual({ jev: null, rule: 'Star', analyst: 'Pentagon' });
		expect(sourcesDisagree(labels)).toBe(true);
		expect(sourcesDisagree({ jev: null, rule: null, analyst: 'Square' })).toBe(false);
	});
});

describe('thin evidence', () => {
	const withSufficiency = (evidenceSufficient: number): JevRecord => ({
		...answered({ Star: 1 }, evidenceSufficient),
		answer: { label: 'Star', probabilities: { Star: 1 }, confidence: 0.6, evidenceSufficient }
	});

	it('marks only an answer clearly below the recorded judgment cut', () => {
		expect(THIN_EVIDENCE_BELOW).toBe(0.25);
		// 0.10 is the recorded answer for a player with no plate appearances and no splits.
		expect(isThinEvidence(withSufficiency(0.1))).toBe(true);
		// 0.29–0.55 is the range recorded for players with full evidence: not thin.
		expect(isThinEvidence(withSufficiency(0.29))).toBe(false);
		expect(isThinEvidence(withSufficiency(0.49))).toBe(false);
	});

	it('never marks a missing or unanswered record thin', () => {
		expect(isThinEvidence(null)).toBe(false);
		expect(isThinEvidence(undefined)).toBe(false);
		expect(isThinEvidence(answered({ Star: 1 }, 0.1))).toBe(false);
	});
});
