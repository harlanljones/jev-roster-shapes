import { describe, expect, it } from 'vitest';
import {
	calculateComparison,
	calculateOffenseDelta,
	calculateScenario,
	validateCalculationResult
} from '../../src/lib/engine';
import { getStoryline } from '../../src/lib/storylines/registry';
import { validateBundle, type Bundle, type Scenario } from '../../src/lib/contracts';

const CASAS = 'mlbam-671213';
const ANTHONY = 'mlbam-701350';
const DURAN = 'mlbam-680776';

function storyBundle(): Bundle {
	const story = getStoryline('power-vacuum');
	if (!story) throw new Error('power-vacuum storyline missing');
	return story.bundle;
}

function copyBundle(): Bundle {
	return structuredClone(storyBundle());
}

function scenario(bundle: Bundle, id: string): Scenario {
	const found = [bundle.comparison.baseline, ...bundle.comparison.candidates].find(
		(candidate) => candidate.id === id
	);
	if (!found) throw new Error(`missing scenario ${id}`);
	return found;
}

function assignment(bundle: Bundle, scenarioId: string, templateIndex: number, order: number) {
	const selected = scenario(bundle, scenarioId).allocations[templateIndex];
	if (!selected) throw new Error('missing allocation');
	const found = selected.assignments.find((candidate) => candidate.order === order);
	if (!found) throw new Error('missing assignment');
	return found;
}

function projection(bundle: Bundle, playerId: string) {
	const found = bundle.dataset.projections.find((candidate) => candidate.playerId === playerId);
	if (!found) throw new Error('missing projection');
	return found;
}

describe('deterministic calculation engine', () => {
	it('matches the hand-derived power-vacuum results and validates every result', () => {
		const comparison = calculateComparison(storyBundle());
		expect(comparison.results.map(({ scenarioId }) => scenarioId)).toEqual([
			'base',
			'cand-a',
			'cand-b'
		]);
		expect(comparison.results.map(({ offense }) => offense.runs)).toEqual([
			'39.13172',
			'38.3194',
			null
		]);
		expect(comparison.results[2]?.offense.status).toBe('unavailable');
		expect(comparison.offenseDeltas.map(({ runs }) => runs)).toEqual(['0', '-0.81232', null]);
		expect(comparison.results.every((result) => result.feasibility === 'feasible')).toBe(true);
		expect(comparison.results.every((result) => result.readiness.ready === false)).toBe(true);
		expect(
			comparison.results.every((result) =>
				result.readiness.blockingCodes.includes('ACKNOWLEDGMENT_REQUIRED')
			)
		).toBe(true);
		for (const result of comparison.results) {
			expect(validateCalculationResult(result).success).toBe(true);
		}
		const baseline = comparison.evaluations[0];
		expect(baseline?.paReconciliation).toMatchObject({
			totalDemandPA: 360,
			allocatedPA: 360,
			unallocatedPA: 0,
			conserved: true
		});
		expect(baseline?.result.workload.reduce((total, player) => total + (player.PA ?? 0), 0)).toBe(
			360
		);
		expect(
			baseline?.result.coverage.reduce((total, lane) => total + (lane.allocatedOuts ?? 0), 0)
		).toBe(2160);
	});

	it('keeps partial coverage and PA reconciliation for an incomplete RF draft', () => {
		const bundle = copyBundle();
		for (const allocation of scenario(bundle, 'base').allocations) {
			const rf = allocation.assignments.find((candidate) => candidate.order === 8);
			if (rf) rf.playerId = null;
		}
		const comparison = calculateComparison(bundle);
		const result = comparison.results[0];
		const reconciliation = comparison.evaluations[0]?.paReconciliation;
		expect(result?.feasibility).toBe('incomplete');
		expect(result?.offense.status).toBe('unavailable');
		expect(result?.issues.some(({ code }) => code === 'UNASSIGNED_SLOT')).toBe(true);
		expect(
			result?.coverage
				.filter(({ position }) => position === 'RF')
				.reduce((total, lane) => total + (lane.shortfallOuts ?? 0), 0)
		).toBe(270);
		expect(reconciliation).toMatchObject({ allocatedPA: 320, unallocatedPA: 40, conserved: true });
		expect(comparison.results[1]?.offense.runs).toBe('38.3194');
	});

	it('invalidates simultaneous duplicate and ineligible assignments without authoritative totals', () => {
		const duplicate = copyBundle();
		assignment(duplicate, 'base', 0, 6).playerId = DURAN;
		assignment(duplicate, 'base', 0, 7).playerId = DURAN;
		const duplicateResult = calculateScenario(duplicate, 'base');
		expect(duplicateResult.feasibility).toBe('invalid');
		expect(duplicateResult.issues.some(({ code }) => code === 'DUPLICATE_ASSIGNMENT')).toBe(true);
		expect(duplicateResult.workload.every(({ starts, PA }) => starts === null && PA === null)).toBe(
			true
		);
		expect(duplicateResult.coverage.every(({ demandOuts }) => demandOuts === null)).toBe(true);

		const ineligible = copyBundle();
		for (let templateIndex = 0; templateIndex < 2; templateIndex += 1) {
			assignment(ineligible, 'cand-a', templateIndex, 3).playerId = ANTHONY;
		}
		const ineligibleResult = calculateScenario(ineligible, 'cand-a');
		expect(ineligibleResult.feasibility).toBe('invalid');
		expect(ineligibleResult.issues.some(({ code }) => code === 'INELIGIBLE_POSITION')).toBe(true);
	});

	it('enforces caps, including the exact PA boundary and unknown allocated limits', () => {
		const over = copyBundle();
		const candidateCap = scenario(over, 'cand-a').workloadCaps.find(
			({ playerId }) => playerId === ANTHONY
		);
		if (!candidateCap) throw new Error('missing candidate cap');
		candidateCap.maxPA = 39;
		expect(
			calculateScenario(over, 'cand-a').issues.some(({ code }) => code === 'CAP_EXCEEDED')
		).toBe(true);
		candidateCap.maxPA = 40;
		expect(calculateScenario(over, 'cand-a').feasibility).toBe('feasible');

		const unknownAllocated = copyBundle();
		const allocatedCap = scenario(unknownAllocated, 'cand-a').workloadCaps.find(
			({ playerId }) => playerId === ANTHONY
		);
		if (!allocatedCap) throw new Error('missing allocated cap');
		allocatedCap.maxStarts = null;
		const incomplete = calculateScenario(unknownAllocated, 'cand-a');
		expect(incomplete.feasibility).toBe('incomplete');
		expect(incomplete.issues.some(({ code }) => code === 'CAP_UNKNOWN')).toBe(true);

		const unusedUnknown = copyBundle();
		const reserveCap = scenario(unusedUnknown, 'base').workloadCaps.find(
			({ playerId }) => playerId === ANTHONY
		);
		if (!reserveCap) throw new Error('missing reserve cap');
		reserveCap.maxStarts = null;
		reserveCap.maxDefensiveOuts = null;
		reserveCap.maxPA = null;
		expect(calculateScenario(unusedUnknown, 'base').feasibility).toBe('feasible');
	});

	it('calculates split offense from explicit exposure and preserves unknown exposure', () => {
		const split = copyBundle();
		split.assumptions.offenseMode = 'split';
		for (const row of split.dataset.projections) {
			if (row.overall !== null) {
				row.vsL = row.overall;
				row.vsR = row.overall;
			}
		}
		projection(split, ANTHONY).vsL = '0.10';
		projection(split, ANTHONY).vsR = '0.06';
		const result = calculateScenario(split, 'cand-a');
		expect(result.offense.runs).toBe('37.3526');
		expect(calculateOffenseDelta(calculateScenario(split, 'base'), result).runs).toBe('-1.77912');

		const changedExposure = copyBundle();
		changedExposure.assumptions.offenseMode = 'split';
		for (const row of changedExposure.dataset.projections) {
			if (row.overall !== null) {
				row.vsL = row.overall;
				row.vsR = row.overall;
			}
		}
		projection(changedExposure, ANTHONY).vsL = '0.10';
		projection(changedExposure, ANTHONY).vsR = '0.06';
		for (const template of changedExposure.assumptions.templates) {
			const slot = template.slots.find(({ role }) => role === 'LF');
			if (!slot) throw new Error('missing LF slot');
			if (template.id === 'bos26-vs-left') slot.paByPitcherHand = { L: 8, R: 8, unknown: 0 };
			else slot.paByPitcherHand = { L: 12, R: 12, unknown: 0 };
		}
		expect(calculateScenario(changedExposure, 'cand-a').offense.runs).toBe('37.7526');

		const unknownExposure = copyBundle();
		unknownExposure.assumptions.offenseMode = 'split';
		const slot = unknownExposure.assumptions.templates[0]?.slots.find(({ role }) => role === '2B');
		if (!slot) throw new Error('missing 2B slot');
		slot.paByPitcherHand.R -= 1;
		slot.paByPitcherHand.unknown += 1;
		const unknown = calculateScenario(unknownExposure, 'cand-a');
		expect(unknown.offense.status).toBe('unavailable');
		expect(unknown.offense.reasons.some(({ code }) => code === 'UNKNOWN_EXPOSURE')).toBe(true);
	});

	it('keeps coverage available when rates are missing, and accepts negative rates', () => {
		const missing = calculateScenario(copyBundle(), 'cand-b');
		expect(missing.feasibility).toBe('feasible');
		expect(missing.offense).toMatchObject({ status: 'unavailable', runs: null });
		expect(missing.offense.reasons.some(({ code }) => code === 'MISSING_RATE')).toBe(true);
		expect(missing.coverage.every(({ shortfallOuts }) => shortfallOuts === 0)).toBe(true);

		const negative = copyBundle();
		projection(negative, ANTHONY).overall = '-0.01';
		const comparison = calculateComparison(negative);
		expect(comparison.results[1]?.offense.runs).toBe('34.1526');
		expect(comparison.offenseDeltas[1]?.runs).toBe('-4.97912');
	});

	it('treats DH as opportunity demand only and handles a zero-game horizon', () => {
		const noDH = copyBundle();
		for (const allocation of scenario(noDH, 'base').allocations) {
			const dh = allocation.assignments.find((candidate) => candidate.order === 9);
			if (dh) dh.playerId = null;
		}
		const noDHResult = calculateScenario(noDH, 'base');
		expect(noDHResult.feasibility).toBe('incomplete');
		expect(noDHResult.coverage.every(({ shortfallOuts }) => shortfallOuts === 0)).toBe(true);
		expect(calculateComparison(noDH).evaluations[0]?.paReconciliation.unallocatedPA).toBe(40);

		const zero = copyBundle();
		zero.assumptions.horizonGames = 0;
		for (const template of zero.assumptions.templates) {
			template.games = 0;
			for (const slot of template.slots) slot.paByPitcherHand = { L: 0, R: 0, unknown: 0 };
		}
		const zeroResult = calculateScenario(zero, 'base');
		expect(zeroResult.feasibility).toBe('feasible');
		expect(zeroResult.offense).toMatchObject({ status: 'available', runs: '0' });
		expect(
			zeroResult.coverage.every(
				({ demandOuts, allocatedOuts, shortfallOuts }) =>
					demandOuts === 0 && allocatedOuts === 0 && shortfallOuts === 0
			)
		).toBe(true);
	});

	it('reports constraint states, numeric overflow, and incompatible deltas', () => {
		const roster = copyBundle();
		scenario(roster, 'base').constraints.rosterSizeMax = 9;
		const rosterResult = calculateScenario(roster, 'base');
		expect(rosterResult.constraints.rosterSize.status).toBe('failed');
		expect(rosterResult.feasibility).toBe('feasible');

		const cost = copyBundle();
		const baseline = scenario(cost, 'base');
		baseline.constraints.costBudget = {
			currency: 'XTS',
			period: 'pilot-horizon',
			maxMinorUnits: 1
		};
		const costResult = calculateScenario(cost, 'base');
		expect(costResult.constraints.cost.status).toBe('unknown');

		const overflow = copyBundle();
		projection(overflow, ANTHONY).overall = '9007199254.740992';
		const overflowResult = calculateScenario(overflow, 'cand-a');
		expect(overflowResult.offense.status).toBe('unavailable');
		expect(overflowResult.offense.reasons.some(({ code }) => code === 'NUMERIC_OVERFLOW')).toBe(
			true
		);

		const other = copyBundle();
		other.assumptions.revision += 1;
		other.comparison.assumptionRef.revision = other.assumptions.revision;
		const incompatible = calculateOffenseDelta(
			calculateScenario(storyBundle(), 'base'),
			calculateScenario(other, 'cand-a')
		);
		expect(incompatible.status).toBe('unavailable');
		expect(incompatible.reasons.some(({ code }) => code === 'INCOMPATIBLE_COMPARISON')).toBe(true);
	});

	it('does not alter inputs, and the contract catches malformed cost structures', () => {
		const bundle = copyBundle();
		const before = JSON.stringify(bundle);
		calculateComparison(bundle);
		expect(JSON.stringify(bundle)).toBe(before);

		const malformed = copyBundle();
		const baseline = scenario(malformed, 'base');
		baseline.constraints.costs.push({
			playerId: CASAS,
			currency: 'XTS',
			period: 'pilot-horizon',
			minorUnits: 1,
			sourceId: 'mlb-stats-api-2026'
		});
		const validation = validateBundle(malformed);
		expect(validation.success).toBe(false);
		if (!validation.success)
			expect(validation.issues.some(({ code }) => code === 'UNKNOWN_REFERENCE')).toBe(true);
	});
});
