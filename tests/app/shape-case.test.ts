import { describe, expect, it } from 'vitest';
import {
	benchTray,
	buildPool,
	caseView,
	complements,
	interactionEdges,
	lineupBin,
	lineupRuns,
	locksOf,
	scenarioLineup,
	tightestBin,
	tightestFit
} from '../../src/lib/app/shape-case';
import { getStoryline } from '../../src/lib/storylines/registry';

const story = getStoryline('offseason-infield')!;
const bundle = story.bundle;
const pool = buildPool(bundle);
const lineups = [bundle.comparison.baseline, ...bundle.comparison.candidates].map((s) =>
	scenarioLineup(bundle, s)
);

describe('Shape Case model (display layer, D-43)', () => {
	it('sizes pieces from actual 2026 PA × season R/PA and keeps missing data missing', () => {
		expect(pool.get('mlbam-677800')!.runs).toBeCloseTo(81, 6); // Abreu: 669 PA, 81 R
		expect(pool.get('mlbam-701350')!.runs).toBeCloseTo(24, 6); // Anthony: 237 PA, 24 R
		expect(pool.get('mlbam-701350')!.rateText).not.toBe(pool.get('mlbam-701350')!.seasonRateText);
		expect(pool.get('mlbam-671213')!.runs).toBeNull(); // Casas: no 2026 PA
	});

	it('sums actual 2026 runs for each scenario and suppresses the one with Casas', () => {
		// Baseline vs RHP: Narváez 22, Contreras 68, Mayer 19, Durbin 74, Story 24,
		// Anthony 24, Rafaela 67, Abreu 81, Duran 66. A swaps Mayer for Bregman's
		// 92 with the Cubs through September 27 (Durbin to second).
		expect(lineups.map((l) => lineupRuns(pool, l)?.toFixed(2) ?? null)).toEqual([
			'445.00',
			'518.00',
			null
		]);
	});

	it('finds the tightest fit against each hand and packs it to the lid', () => {
		const fit = tightestFit(pool);
		// With the regular season complete (September 27 refresh), Bregman is the
		// DH against both hands and Durbin keeps third.
		expect(fit.L.DH).toBe('mlbam-608324'); // Bregman vs LHP
		expect(fit.R.DH).toBe('mlbam-608324'); // Bregman vs RHP
		expect(fit.R['3B']).toBe('mlbam-702332'); // Durbin at third vs RHP
		expect(fit.R.CF).toBe('mlbam-678882'); // Rafaela in center vs RHP
		expect(fit.R.LF).toBe('mlbam-680776'); // Duran in left vs RHP
		const bin = tightestBin(pool);
		expect(bin.runs?.toFixed(2)).toBe('529.86');
		expect(bin.overflows).toBe(false);
		expect(Math.round(bin.fill)).toBe(64);
		expect(Math.round(bin.gaps + bin.headroom + bin.fill)).toBe(100);
	});

	it('packs every scenario into the same bin without overflow', () => {
		for (const l of lineups) {
			const bin = lineupBin(pool, l);
			expect(bin.overflows).toBe(false);
			expect(bin.fill).toBeLessThan(tightestBin(pool).fill + 0.001);
		}
	});

	it('puts everyone off the field in the tray at the board scale (D-50)', () => {
		const tray = benchTray(pool, lineups[0]!);
		const on = new Set(Object.values(lineups[0]!));
		expect(tray.pieces.map((p) => p.id).sort()).toEqual(
			[...pool.keys()].filter((id) => !on.has(id)).sort()
		);
		// Casas is off the field with no 2026 PA, so the tray total is suppressed.
		expect(tray.pieces.some((p) => p.id === 'mlbam-671213' && p.runs == null)).toBe(true);
		expect(tray.runs).toBeNull();
		// Same runs-to-area scale as the board: a bench piece matches its own
		// one-player slot piece on the board.
		const abreuBench = benchTray(pool, { ...lineups[0]!, RF: null }).pieces.find(
			(p) => p.id === 'mlbam-677800'
		)!;
		const abreuSlot = lineupBin(pool, lineups[0]!).pieces.find((p) => p.role === 'RF')!;
		expect(abreuSlot.idR).toBe('mlbam-677800');
		expect(abreuBench.r).toBeCloseTo(abreuSlot.r, 9);
		expect(tray.height).toBeGreaterThan(0);
	});

	it('suppresses a lineup total when a starter has no data', () => {
		const withCasas = { ...lineups[0]!, DH: 'mlbam-671213' };
		expect(lineupRuns(pool, withCasas)).toBeNull();
		expect(lineupBin(pool, withCasas).runs).toBeNull();
		const view = caseView(pool, withCasas, lineups[0]!);
		expect(view.runs).toBeNull();
		expect(view.findings.empty.some((f) => f.lead.includes('no 2026 data'))).toBe(true);
	});

	it('keeps locked projected starters in the hindsight best nine (D-56)', () => {
		const winter = getStoryline('winter-infield')!;
		const winterPool = buildPool(winter.bundle);
		const locks = locksOf(winter.bundle.comparison.baseline);
		const fit = tightestFit(winterPool, locks);

		expect(fit.L.C).toBe('mlbam-668939'); // Rutschman catches
		expect(fit.R.C).toBe('mlbam-668939');
		expect(Object.values(fit.L)).toContain('mlbam-701350'); // Anthony starts
		expect(Object.values(fit.R)).toContain('mlbam-701350');
		expect(fit.R['2B']).toBe('mlbam-678554'); // Mead keeps second
	});

	it('derives platoon complements and tested swaps from the storylines', () => {
		expect(complements(pool).length).toBeGreaterThan(0);
		const edges = interactionEdges(pool, [
			{
				story: story.slug,
				scenarioId: 'cand-a',
				label: 'A',
				lineup: lineups[1]!,
				baseLineup: lineups[0]!
			}
		]);
		expect(edges.some((e) => e.type === 'swap')).toBe(true);
	});
});
