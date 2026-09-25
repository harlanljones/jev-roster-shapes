import { describe, expect, it } from 'vitest';
import {
	buildPool,
	caseView,
	complements,
	interactionEdges,
	lineupBin,
	lineupRuns,
	scenarioLineup,
	tightestBin,
	tightestFit
} from '../../src/lib/app/shape-case';
import { getStoryline } from '../../src/lib/storylines/registry';

const story = getStoryline('preseason-dh')!;
const bundle = story.bundle;
const pool = buildPool(bundle);
const lineups = [bundle.comparison.baseline, ...bundle.comparison.candidates].map((s) =>
	scenarioLineup(bundle, s)
);

describe('Shape Case model (display layer, D-43)', () => {
	it('sizes pieces from actual 2026 PA × season R/PA and keeps missing data missing', () => {
		expect(pool.get('mlbam-677800')!.runs).toBeCloseTo(81, 6); // Abreu: 669 PA, 81 R
		expect(pool.get('mlbam-701350')!.runs).toBeCloseTo(21, 6); // Anthony: 232 PA, 21 R
		expect(pool.get('mlbam-701350')!.rateText).not.toBe(pool.get('mlbam-701350')!.seasonRateText);
		expect(pool.get('mlbam-671213')!.runs).toBeNull(); // Casas: no 2026 PA
	});

	it('sums actual 2026 runs for each scenario and suppresses the one with Casas', () => {
		// Baseline: Narváez 21, Contreras 68, Mayer 19, Durbin 74, Story 24,
		// Duran 66, Rafaela 67, Abreu 81, Anthony 21. A swaps Anthony for Yoshida (34).
		expect(lineups.map((l) => lineupRuns(pool, l)?.toFixed(2) ?? null)).toEqual([
			'441.00',
			'454.00',
			null
		]);
	});

	it('finds the tightest fit against each hand and packs it to the lid', () => {
		const fit = tightestFit(pool);
		expect(fit.L.DH).toBe('mlbam-701350'); // Anthony vs LHP
		expect(fit.R.DH).toBe('mlbam-807799'); // Yoshida vs RHP
		expect(fit.L['3B']).toBe('mlbam-691785'); // Mayer moves to third against lefties
		const bin = tightestBin(pool);
		expect(bin.runs?.toFixed(2)).toBe('456.31');
		expect(bin.overflows).toBe(false);
		expect(Math.round(bin.fill)).toBe(63);
		expect(Math.round(bin.gaps + bin.headroom + bin.fill)).toBe(100);
	});

	it('packs every scenario into the same bin without overflow', () => {
		for (const l of lineups) {
			const bin = lineupBin(pool, l);
			expect(bin.overflows).toBe(false);
			expect(bin.fill).toBeLessThan(tightestBin(pool).fill + 0.001);
		}
	});

	it('suppresses a lineup total when a starter has no data', () => {
		const withCasas = { ...lineups[0]!, DH: 'mlbam-671213' };
		expect(lineupRuns(pool, withCasas)).toBeNull();
		expect(lineupBin(pool, withCasas).runs).toBeNull();
		const view = caseView(pool, withCasas, lineups[0]!);
		expect(view.runs).toBeNull();
		expect(view.findings.empty.some((f) => f.lead.includes('no 2026 data'))).toBe(true);
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
