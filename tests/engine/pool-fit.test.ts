import { describe, expect, it } from 'vitest';
import { calculateComparison, decimalToMillionths, formatMillionths } from '../../src/lib/engine';
import {
	POOL_FIT_VERSION,
	calculatePoolFit,
	poolFitFor,
	type PoolFitScenarioFit
} from '../../src/lib/engine/pool-fit';
import type { Bundle } from '../../src/lib/contracts';
import { storylineRegistry } from '../../src/lib/storylines/registry';
import { d44Bundle } from '../fixtures/season-timeline-d44';

// D-45: the pool's tightest fit is an engine analysis over the bundle's own
// dated metric. Expectations below are hand-derived from the bundle inputs
// (rates x slot PA), not read back from the implementation.
const ROLES = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'] as const;

// The hand derivations below use the frozen D-44 bundles (D-48 replaced them
// in the app); the reconciliation test runs over the live registry.
function bundle(slug: string): Bundle {
	return structuredClone(d44Bundle(slug));
}

/** The nine behind a fit, in slot order, for one template. */
function nine(fit: PoolFitScenarioFit, templateId: string): (string | null)[] {
	const context = fit.contexts.find((candidate) => candidate.templateId === templateId);
	if (!context) throw new Error(`fit has no context ${templateId}`);
	return ROLES.map((role) => {
		const slot = context.slots.find((candidate) => candidate.role === role);
		return slot?.playerId ?? null;
	});
}

function addRuns(values: (string | null)[]): string {
	return formatMillionths(
		values.reduce((total, value) => total + (value === null ? 0n : decimalToMillionths(value)), 0n)
	);
}

describe('pool fit', () => {
	it('finds the best nine the baseline roster allows, hand-derived', () => {
		// preseason-second, 2025 observed R/PA. Slot PA over the ten-game horizon:
		// orders 1-3 carry 50 PA, orders 4-9 carry 40 PA.
		//   50 x (Narvaez .114350 + Monasterio .140741 + Rafaela .143101)
		// + 40 x (Mayer .147059 + Story .139144 + Anthony .158416
		//        + Duran .123563 + Abreu .127098 + Contreras .124334)
		// = 19.9096 + 32.78456 = 52.69416
		const analysis = calculatePoolFit(bundle('preseason-second'));
		const fit = poolFitFor(analysis, 'base')!;

		expect(fit.feasibility).toBe('feasible');
		expect(fit.runs).toBe('52.69416');
		expect(nine(fit, 'bos26-vs-left')).toEqual([
			'mlbam-665966', // C  Carlos Narvaez
			'mlbam-655316', // 1B Andruw Monasterio
			'mlbam-678882', // 2B Ceddanne Rafaela
			'mlbam-691785', // 3B Marcelo Mayer
			'mlbam-596115', // SS Trevor Story
			'mlbam-701350', // LF Roman Anthony
			'mlbam-680776', // CF Jarren Duran
			'mlbam-677800', // RF Wilyer Abreu
			'mlbam-575929' // DH Willson Contreras
		]);
		// The same nine answers both contexts, because the two templates weight
		// slots in the same 5:4 proportion and the bundle carries no split rates.
		expect(nine(fit, 'bos26-vs-right')).toEqual(nine(fit, 'bos26-vs-left'));
		// 20/16 PA per context: 7.96384 + 13.113824 and 11.94576 + 19.670736.
		expect(fit.contexts.map((context) => context.runs)).toEqual(['21.077664', '31.616496']);
		expect(addRuns(fit.contexts.map((context) => context.runs))).toBe(fit.runs);
		// 52.69416 - 51.68311 = 1.01105 runs left off the table by the lineup used.
		expect(fit.deltaVsReference?.runs).toBe('1.01105');
		expect(fit.deltaVsBaseline?.runs).toBe('1.01105');
	});

	it('beats the greedy per-slot best nine by the hand-derived exchange margin', () => {
		// A search that takes the best eligible rate at each slot in turn would
		// put Mayer at 2B (.147059) and Rafaela in center, leaving Durbin at 3B.
		// Moving Rafaela to second, Mayer to third, and Duran to center is better
		// by 50 x (.143101 - .147059) + 40 x (.147059 + .123563 - .118577 - .143101)
		// = -0.1979 + 0.35776 = 0.15986 runs, so a greedy search is detectably wrong.
		const greedy = formatMillionths(
			50n *
				(decimalToMillionths('0.114350') +
					decimalToMillionths('0.140741') +
					decimalToMillionths('0.147059')) +
				40n *
					(decimalToMillionths('0.118577') +
						decimalToMillionths('0.139144') +
						decimalToMillionths('0.158416') +
						decimalToMillionths('0.143101') +
						decimalToMillionths('0.127098') +
						decimalToMillionths('0.124334'))
		);
		const analysis = calculatePoolFit(bundle('preseason-second'));
		const fit = poolFitFor(analysis, 'base')!;

		expect(greedy).toBe('52.5343');
		expect(formatMillionths(decimalToMillionths(fit.runs!) - decimalToMillionths(greedy))).toBe(
			'0.15986'
		);
	});

	it('reports nothing left on the table when the lineup used is already the best nine', () => {
		// preseason-dh: C/1B/2B are forced or best-in-class, and Duran (LF) and
		// Anthony (DH) tie inside the 40-PA weight class, so the tie-break keeps
		// Boston's own assignment.
		const analysis = calculatePoolFit(bundle('preseason-dh'));
		const fit = poolFitFor(analysis, 'base')!;

		expect(fit.runs).toBe('51.68311');
		expect(fit.deltaVsReference?.runs).toBe('0');
		expect(fit.contexts.every((context) => context.matchesReference)).toBe(true);
		expect(fit.moves).toEqual([]);
		expect(fit.transfers).toEqual([]);
	});

	it('bounds each fit by the roster that comparison actually has', () => {
		const data = bundle('preseason-dh');
		const analysis = calculatePoolFit(data);
		const base = poolFitFor(analysis, 'base')!;
		const candB = poolFitFor(analysis, 'cand-b')!;

		// Casas is only a member of candidate B, so only B's fit may field him.
		expect(data.comparison.baseline.memberIds).not.toContain('mlbam-671213');
		expect(nine(base, 'bos26-vs-left')).not.toContain('mlbam-671213');
		// Candidate B's lineup puts Casas in the DH lane, where he has the lowest
		// rate on the roster (.044643), so the fit takes him back out and leaves
		// him on the bench with the 40 PA his own lineup would have had.
		expect(candB.bench.find((member) => member.playerId === 'mlbam-671213')).toEqual({
			playerId: 'mlbam-671213',
			pa: 40,
			runs: '1.78572'
		});
		expect(candB.runs).toBe('51.68311');
	});

	it('reconciles every context total with the engine total for all five storylines', () => {
		for (const story of storylineRegistry) {
			const analysis = calculatePoolFit(story.bundle);
			expect(analysis.analysisVersion).toBe(POOL_FIT_VERSION);
			expect(analysis.inputDigest).toBe(calculateComparison(story.bundle).inputDigest);
			expect(analysis.fits).toHaveLength(3);
			for (const fit of analysis.fits) {
				expect(fit.feasibility).toBe('feasible');
				expect(fit.runs).not.toBeNull();
				expect(addRuns(fit.contexts.map((context) => context.runs))).toBe(fit.runs);
				expect(fit.contexts.map((context) => context.templateId)).toEqual(
					story.bundle.assumptions.templates.map((template) => template.id)
				);
			}
		}
	});

	it('excludes a member with no usable rate instead of scoring them as zero', () => {
		const data = bundle('preseason-dh');
		data.dataset.projections = data.dataset.projections.filter(
			({ playerId }) => playerId !== 'mlbam-671213'
		);
		const fit = poolFitFor(calculatePoolFit(data), 'cand-b')!;

		expect(fit.excluded).toEqual([
			{
				playerId: 'mlbam-671213',
				code: 'MISSING_RATE',
				detail: 'no mlbam-observed-r-per-pa-2025 row in this bundle'
			}
		]);
		// The scored nine is unchanged, and Casas's forgone runs stay missing
		// rather than becoming 0.
		expect(fit.runs).toBe('51.68311');
		expect(fit.bench.find((member) => member.playerId === 'mlbam-671213')?.runs).toBeNull();
	});

	it('leaves a slot uncovered and suppresses the total when the pool cannot field it', () => {
		const data = bundle('preseason-dh');
		// Story is the roster's only shortstop; remove his rate and nothing in the
		// pool can be scored at short.
		data.dataset.projections = data.dataset.projections.filter(
			({ playerId }) => playerId !== 'mlbam-596115'
		);
		const fit = poolFitFor(calculatePoolFit(data), 'base')!;

		expect(fit.feasibility).toBe('incomplete');
		expect(fit.runs).toBeNull();
		expect(fit.deltaVsReference).toBeNull();
		expect(fit.contexts.map((context) => context.runs)).toEqual([null, null]);
		expect(nine(fit, 'bos26-vs-left')[4]).toBeNull();
		// 4 games x 27 outs and 6 games x 27 outs of shortstop coverage remain open.
		expect(fit.shortfalls).toEqual([
			{ templateId: 'bos26-vs-left', position: 'SS', shortfallOuts: 108 },
			{ templateId: 'bos26-vs-right', position: 'SS', shortfallOuts: 162 }
		]);
		expect(
			fit.evaluation.paReconciliation.templates.map(({ unallocatedPA }) => unallocatedPA)
		).toEqual([16, 24]);
	});

	it('reports a fit the capacity rules reject instead of quietly searching past it', () => {
		const data = bundle('preseason-second');
		// The reference lineup gives Rafaela 40 PA in center; the fit wants her at
		// second base for 50. A 45-PA cap accepts the first and rejects the second.
		const baseline = data.comparison.baseline;
		baseline.workloadCaps = baseline.workloadCaps.map((cap) =>
			cap.playerId === 'mlbam-678882' ? { ...cap, maxPA: 45 } : cap
		);
		const comparison = calculateComparison(data);
		const reference = comparison.results[0]!;
		const fit = poolFitFor(calculatePoolFit(data), 'base')!;

		expect(reference.offense.status).toBe('available');
		expect(fit.feasibility).toBe('invalid');
		expect(fit.runs).toBeNull();
		expect(fit.deltaVsReference).toBeNull();
		expect(fit.reasons.map(({ code }) => code)).toContain('CAP_EXCEEDED');
		expect(fit.reasons.find(({ code }) => code === 'CAP_EXCEEDED')?.playerIds).toEqual([
			'mlbam-678882'
		]);
	});

	it('refuses to score a split comparison whose bundle carries no split rates', () => {
		const data = bundle('preseason-dh');
		data.assumptions.offenseMode = 'split';
		const fit = poolFitFor(calculatePoolFit(data), 'base')!;

		expect(fit.runs).toBeNull();
		expect(fit.feasibility).toBe('incomplete');
		expect(fit.excluded.every(({ code }) => code === 'MISSING_RATE')).toBe(true);
		expect(fit.excluded).toHaveLength(data.comparison.baseline.memberIds.length);
	});

	it('is deterministic and independent of array order inside the bundle', () => {
		const first = calculatePoolFit(bundle('october-lineup'));
		const second = calculatePoolFit(bundle('october-lineup'));
		expect(first).toEqual(second);

		const reordered = bundle('october-lineup');
		reordered.dataset.players = [...reordered.dataset.players].reverse();
		for (const scenario of [reordered.comparison.baseline, ...reordered.comparison.candidates]) {
			scenario.memberIds = [...scenario.memberIds].reverse();
		}
		const third = calculatePoolFit(reordered);
		// Array order is part of the input identity (C-22), so the digest may
		// differ, but the discovered lineups and totals may not.
		expect(third.inputDigest).not.toBe(first.inputDigest);
		expect(third.fits.map(({ runs, contexts }) => [runs, contexts.map((c) => c.slots)])).toEqual(
			first.fits.map(({ runs, contexts }) => [runs, contexts.map((c) => c.slots)])
		);
	});

	it('ranks the best available fit across scenarios without claiming a value claim', () => {
		const analysis = calculatePoolFit(bundle('deadline-catcher'));

		// Candidate A's roster can field a nine the baseline's cannot; the
		// baseline can still reach 46.16173, 0.07654 under the lineup it used.
		expect(analysis.best).toEqual({ scenarioId: 'cand-a', runs: '46.62413' });
		expect(poolFitFor(analysis, 'base')?.deltaVsReference?.runs).toBe('0.07654');
		expect(poolFitFor(analysis, 'cand-a')?.deltaVsBaseline?.runs).toBe('0.53894');
	});
});
