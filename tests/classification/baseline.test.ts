import { describe, expect, it } from 'vitest';
import type { ProfileEvidence } from '../../src/lib/classification/prompt';
import {
	baselineAgreement,
	classifyBaseline,
	medianRateOf,
	toRuleEvidence
} from '../../src/lib/classification/baseline';

const evidence = (over: Partial<ProfileEvidence>): ProfileEvidence => ({
	playerId: 'mlbam-1',
	name: 'Test Player',
	bats: 'R',
	eligiblePositions: ['2B'],
	age: null,
	rate: '0.126280',
	rateLabel: 'Observed runs per PA (2026 season to date)',
	seasonPA: 400,
	split: {
		vsLeft: { pa: 150, ops: '0.700' },
		vsRight: { pa: 250, ops: '0.720' }
	},
	notes: 'analyst judgment that must never reach the rules',
	...over
});

describe('rule baseline: label precedence (D-55)', () => {
	it('labels a player with no evidence Unclassified', () => {
		const result = classifyBaseline(
			toRuleEvidence(evidence({ eligiblePositions: [], seasonPA: 0, rate: null, split: null })),
			{ medianRate: 0.11 }
		);
		expect(result.label).toBe('Unclassified');
		expect(result.abstained).toBe(false);
	});

	it('labels the recorded platoon quirk Star before anything else', () => {
		const result = classifyBaseline(
			toRuleEvidence(
				evidence({
					seasonPA: 250,
					split: { vsLeft: { pa: 120, ops: '0.900' }, vsRight: { pa: 130, ops: '0.650' } }
				})
			),
			{ medianRate: 0.11 }
		);
		expect(result.firedRules).toContain('Star');
		expect(result.firedRules).toContain('Diamond');
		expect(result.label).toBe('Star');
	});

	it('labels an injury-limited above-median season Diamond', () => {
		const result = classifyBaseline(toRuleEvidence(evidence({ seasonPA: 250 })), {
			medianRate: 0.11
		});
		expect(result.label).toBe('Diamond');
	});

	it('labels 550-plus PA volume Rectangle even at one position', () => {
		const result = classifyBaseline(toRuleEvidence(evidence({ seasonPA: 600 })), {
			medianRate: 0.11
		});
		expect(result.firedRules).toContain('Rectangle');
		expect(result.label).toBe('Rectangle');
	});

	it('labels a DH-only or fringe bat Funky', () => {
		const result = classifyBaseline(
			toRuleEvidence(evidence({ eligiblePositions: [], seasonPA: 60 })),
			{ medianRate: 0.11 }
		);
		expect(result.label).toBe('Funky');
	});

	it('labels a steady single-position regular Square', () => {
		const result = classifyBaseline(toRuleEvidence(evidence({})), { medianRate: 0.11 });
		expect(result.label).toBe('Square');
		expect(result.firedRules).toContain('Square');
	});

	it('labels a multi-position non-everyday bat Circle', () => {
		const result = classifyBaseline(
			toRuleEvidence(evidence({ eligiblePositions: ['2B', '3B'], seasonPA: 300 })),
			{ medianRate: 0.11 }
		);
		expect(result.label).toBe('Circle');
	});
});

describe('rule baseline: abstention (D-55)', () => {
	it('abstains with a reason when the workload and rate are unknown', () => {
		const result = classifyBaseline(
			toRuleEvidence(evidence({ seasonPA: null, rate: null, split: null })),
			{ medianRate: 0.11 }
		);
		expect(result.abstained).toBe(true);
		expect(result.reason).toBeTruthy();
		expect(result.label).toBeNull();
	});
});

describe('rule baseline: leakage guard (D-55)', () => {
	it('narrowing drops the analyst notes, name, bats, and age the rules must not read', () => {
		const narrowed = toRuleEvidence(evidence({}));
		expect('notes' in narrowed).toBe(false);
		expect('name' in narrowed).toBe(false);
		expect('bats' in narrowed).toBe(false);
		expect('age' in narrowed).toBe(false);
	});
});

describe('rule baseline: median rate cut (D-55)', () => {
	it('takes the middle rate of the evaluated population', () => {
		expect(medianRateOf(['0.126280', '0.110000', '0.099000'])).toBe(0.11);
	});

	it('averages the middle two on an even population', () => {
		expect(medianRateOf(['0.130000', '0.110000'])).toBe(0.12);
	});

	it('is null when no evaluated player has a rate', () => {
		expect(medianRateOf([null, null])).toBeNull();
		expect(medianRateOf([])).toBeNull();
	});
});

describe('rule baseline: agreement metrics (D-55)', () => {
	const labels = {
		'mlbam-1': 'Square',
		'mlbam-2': 'Circle',
		'mlbam-3': 'Star',
		'mlbam-4': 'Pentagon'
	} as const;

	const results = [
		classifyBaseline(toRuleEvidence(evidence({ playerId: 'mlbam-1' })), { medianRate: 0.11 }), // Square → Square
		classifyBaseline(
			toRuleEvidence(evidence({ playerId: 'mlbam-2', eligiblePositions: ['2B', '3B'] })),
			{ medianRate: 0.11 }
		), // Circle → Circle
		classifyBaseline(
			toRuleEvidence(
				evidence({
					playerId: 'mlbam-3',
					seasonPA: 250,
					split: { vsLeft: { pa: 120, ops: '0.900' }, vsRight: { pa: 130, ops: '0.650' } }
				})
			),
			{ medianRate: 0.11 }
		), // analyst Star, baseline Star → match
		classifyBaseline(
			toRuleEvidence(evidence({ playerId: 'mlbam-4', seasonPA: null, rate: null, split: null })),
			{ medianRate: 0.11 }
		) // analyst Pentagon, baseline abstains
	];

	it('compares every labeled player and reports the confusion matrix', () => {
		const agreement = baselineAgreement(results, labels);
		expect(agreement.compared).toBe(4);
		expect(agreement.matched).toBe(3);
		expect(agreement.abstained).toBe(1);
		const starRow = agreement.matrix.find((row) => row.analyst === 'Star');
		expect(starRow?.counts).toEqual({ Star: 1 });
		const pentagonRow = agreement.matrix.find((row) => row.analyst === 'Pentagon');
		expect(pentagonRow?.counts).toEqual({ abstained: 1 });
	});

	it('reports per-class agreement and abstention coverage', () => {
		const agreement = baselineAgreement(results, labels);
		const square = agreement.perClass.find((row) => row.label === 'Square');
		expect(square).toEqual({ label: 'Square', n: 1, matched: 1, abstained: 0 });
		const pentagon = agreement.perClass.find((row) => row.label === 'Pentagon');
		expect(pentagon).toEqual({ label: 'Pentagon', n: 1, matched: 0, abstained: 1 });
		expect(agreement.abstentionCoverage).toBeCloseTo(0.25);
	});

	it('ignores results for players without analyst labels', () => {
		const extra = [
			...results,
			classifyBaseline(toRuleEvidence(evidence({ playerId: 'mlbam-99' })), { medianRate: 0.11 })
		];
		expect(baselineAgreement(extra, labels).compared).toBe(4);
	});
});
