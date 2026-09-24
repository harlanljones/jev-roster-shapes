// Observed 2026 platoon splits and plate appearances for the decision pool
// (D-43). Display-layer source evidence for the Shape Case diagrams only: it
// never enters a bundle, an input digest, or the deterministic engine, and it
// never changes a pinned run total. Split OPS is not an additive run measure
// (D-42), so the diagrams use it only to shape and color pieces, and label any
// split-scaled run estimate as a judgment layer.
//
// Source: MLB Stats API people/{id}/stats, group=hitting, type=statSplits,
// sitCodes vl/vr, season 2026, fetched 2026-09-24 (a few games after the
// bundles' Sep 20 R/PA snapshot). League lines were summed from team statSplits
// the same day; the API returned 25 of 30 teams per side, so they are close
// estimates, not official league lines.

export const SPLIT_SOURCE = {
	label: 'MLB Stats API statSplits (vs LHP / vs RHP), 2026 season',
	fetchedAt: '2026-09-24'
} as const;

export interface SplitSide {
	pa: number;
	ops: string;
}

export interface PlayerSplit {
	vL: SplitSide;
	vR: SplitSide;
	/** Total 2026 PA when the split rows cover only part of the season. */
	seasonPa?: number;
	note?: string;
}

export const PLAYER_SPLITS: Readonly<Record<string, PlayerSplit>> = {
	'mlbam-668939': {
		vL: { pa: 132, ops: '.622' },
		vR: { pa: 263, ops: '.796' },
		note: 'Baltimore and Boston rows combined.'
	},
	'mlbam-657136': { vL: { pa: 69, ops: '.732' }, vR: { pa: 164, ops: '.624' } },
	'mlbam-575929': { vL: { pa: 144, ops: '.981' }, vR: { pa: 389, ops: '.878' } },
	'mlbam-686765': { vL: { pa: 60, ops: '.799' }, vR: { pa: 197, ops: '.713' } },
	'mlbam-643396': { vL: { pa: 51, ops: '.445' }, vR: { pa: 122, ops: '.708' } },
	'mlbam-655316': {
		vL: { pa: 104, ops: '.889' },
		vR: { pa: 194, ops: '.642' },
		seasonPa: 329,
		note: 'Boston rows only (298 of 329 PA); both sides scale to 329 in the same proportion.'
	},
	'mlbam-702332': { vL: { pa: 155, ops: '.727' }, vR: { pa: 415, ops: '.725' } },
	'mlbam-596115': { vL: { pa: 67, ops: '.705' }, vR: { pa: 185, ops: '.624' } },
	'mlbam-701350': { vL: { pa: 69, ops: '.632' }, vR: { pa: 154, ops: '.763' } },
	'mlbam-678882': { vL: { pa: 149, ops: '.801' }, vR: { pa: 420, ops: '.746' } },
	'mlbam-677800': { vL: { pa: 203, ops: '.873' }, vR: { pa: 458, ops: '.745' } },
	'mlbam-680776': { vL: { pa: 133, ops: '.631' }, vR: { pa: 460, ops: '.623' } },
	'mlbam-807799': { vL: { pa: 30, ops: '.774' }, vR: { pa: 267, ops: '.743' } },
	'mlbam-681987': { vL: { pa: 34, ops: '.442' }, vR: { pa: 24, ops: '.673' } }
	// mlbam-671213 (Triston Casas): no 2026 PA. Missing stays missing.
};

/** 2026 league OPS by pitcher hand; Savant-style colors center on these. */
export const LEAGUE_OPS = { L: 0.719, R: 0.727 } as const;
/** Colors saturate at ±.150 OPS from the league line. */
export const SAVANT_SPAN = 0.15;
/**
 * 2026 league runs per PA: all 30 teams' runs (standings) over games × 38.0 PA
 * per game (from the 20 teams whose vs-LHP and vs-RHP rows both returned).
 */
export const LEAGUE_RUNS_PER_PA = 0.118;
export const LEAGUE_OPS_OVERALL = 0.7246;
