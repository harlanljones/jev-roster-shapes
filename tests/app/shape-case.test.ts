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

const logjam = getStoryline('outfield-logjam')!;
const bundle = logjam.bundle;
const pool = buildPool(bundle);
const lineups = [bundle.comparison.baseline, ...bundle.comparison.candidates].map((s) =>
	scenarioLineup(bundle, s)
);

describe('Shape Case model (display layer, D-43)', () => {
	it('sizes pieces from actual 2026 PA × observed R/PA and keeps missing data missing', () => {
		expect(pool.get('mlbam-677800')!.runs).toBeCloseTo(81.5, 1); // Abreu
		expect(pool.get('mlbam-655316')!.runs).toBeCloseTo(35.0, 1); // Monasterio, scaled to 329 PA
		expect(pool.get('mlbam-671213')!.runs).toBeNull(); // Casas: no 2026 PA
	});

	it('reproduces the concept artifact run totals for each scenario', () => {
		expect(lineups.map((l) => lineupRuns(pool, l)?.toFixed(2))).toEqual([
			'472.11',
			'485.11',
			'455.33'
		]);
	});

	it('finds the tightest fit against each hand and packs it to the lid', () => {
		const fit = tightestFit(pool);
		expect(fit.L.DH).toBe('mlbam-657136'); // Wong vs LHP
		expect(fit.R.DH).toBe('mlbam-807799'); // Yoshida vs RHP
		expect(fit.R.SS).toBe('mlbam-655316');
		const bin = tightestBin(pool);
		expect(bin.runs?.toFixed(2)).toBe('499.82');
		expect(bin.overflows).toBe(false);
		expect(Math.round(bin.fill)).toBe(71);
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
		const withCasas = { ...lineups[0]!, '1B': 'mlbam-671213' };
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
				story: logjam.slug,
				scenarioId: 'cand-a',
				label: 'A',
				lineup: lineups[1]!,
				baseLineup: lineups[0]!
			}
		]);
		expect(edges.some((e) => e.type === 'swap')).toBe(true);
	});
});
