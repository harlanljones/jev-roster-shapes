// Observed 2026 season-to-date production and platoon splits for every
// storyline player (D-43, D-44). Display-layer source evidence for the Shape
// Case diagrams only: it never enters a bundle, an input digest, or the
// deterministic engine, and it never changes a pinned run total. Split OPS is
// not an additive run measure (D-42), so the diagrams use it only to shape and
// color pieces, and label any split-scaled run estimate as a judgment layer.
//
// The engine scores each storyline with what was known on its decision date;
// the case shows what the season actually produced. Both come from the same
// checked-in MLB Stats API snapshot (spikes/mlb-2026/timeline-snapshot.json),
// written into src/lib/storylines/season.json by timeline-build.mjs. Traded
// players use the combined all-teams rows. League lines were summed from team
// statSplits on 2026-09-24; the API returned 25 of 30 teams per side, so they
// are close estimates, not official league lines.
import season from '$lib/storylines/season.json';

export const SPLIT_SOURCE = {
	label: 'MLB Stats API season totals and statSplits (vs LHP / vs RHP), 2026 season to date',
	fetchedAt: season.fetchedAt.slice(0, 10),
	asOf: season.asOf
} as const;

export interface SplitSide {
	pa: number;
	ops: string;
}

export interface PlayerSplit {
	vL: SplitSide;
	vR: SplitSide;
	note?: string;
}

export interface SeasonTotal {
	pa: number;
	runs: number;
}

interface SeasonPlayer {
	name: string;
	pa: number;
	runs: number;
	split: { vL: SplitSide; vR: SplitSide } | null;
}

const players = season.players as Readonly<Record<string, SeasonPlayer>>;

/** Season-to-date platoon splits; a player without both sides is absent. */
export const PLAYER_SPLITS: Readonly<Record<string, PlayerSplit>> = Object.fromEntries(
	Object.entries(players)
		.filter(([, player]) => player.split !== null)
		.map(([id, player]) => [id, player.split as PlayerSplit])
);

/** Season-to-date PA and runs; a player with no 2026 PA is absent. */
export const SEASON_TOTALS: Readonly<Record<string, SeasonTotal>> = Object.fromEntries(
	Object.entries(players)
		.filter(([, player]) => player.pa > 0)
		.map(([id, player]) => [id, { pa: player.pa, runs: player.runs }])
);

/** Boston's 2026 results in date order, for the season timeline. */
export const SEASON_RECORD: readonly { date: string; win: boolean }[] = season.record;

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
