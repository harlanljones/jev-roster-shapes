// Shape Case model (D-43): the roster as a fitted case, its interaction map,
// its capacity bin, and its slot-by-slot bars. Ported from the "Red Sox Shape
// Case" concept artifact. Everything here is a display and judgment layer:
// piece sizes use actual 2026 production (season-to-date PA × season R/PA,
// while the engine scores each storyline with what was known on its date), cutout asks and fit grades are a proposed rubric, and split
// run estimates scale R/PA by split OPS. None of it enters a bundle, a digest,
// or the engine, and the workspace's pinned run totals stay the engine's.
import type { Bundle, Scenario } from '$lib/contracts';
import { boundingBox, columnSpan } from '$lib/shapes/geometry';
import { shapeOf, type ShapeLabel } from '$lib/shapes/taxonomy';
import {
	LEAGUE_OPS,
	LEAGUE_OPS_OVERALL,
	LEAGUE_RUNS_PER_PA,
	PLAYER_SPLITS,
	SAVANT_SPAN,
	SEASON_TOTALS,
	type PlayerSplit
} from './split-evidence';

export type Side = 'L' | 'R';
/** Lineup slots in diagram order (bins and bars read left to right). */
export const SLOT_ROLES = ['C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF', 'DH'] as const;
export type Role = (typeof SLOT_ROLES)[number];
export const FIELD_ROLES: readonly Role[] = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];

export interface CasePlayer {
	id: string;
	name: string;
	last: string;
	bats: string;
	elig: readonly string[];
	/** 2026 season-to-date R/PA: sizes the piece (display layer). */
	rate: number | null;
	/** 2026 season-to-date R/PA as text, six decimals. */
	seasonRateText: string | null;
	/** The bundle's R/PA, known on the storyline's decision date (engine input). */
	rateText: string | null;
	shape: ShapeLabel;
	rationale: string;
	split: PlayerSplit | null;
	pa: { L: number; R: number };
	/** Actual 2026 runs produced: actual PA × season R/PA, or null when missing. */
	runs: number | null;
}

/** Case and map scale: radius = K·√runs, so area is proportional to runs. */
export const CASE_K = 5.3;
export function caseRadius(player: CasePlayer): number {
	return player.runs == null ? 16 : CASE_K * Math.sqrt(player.runs);
}

export type Lineup = Partial<Record<Role, string | null>>;
export type Pool = ReadonlyMap<string, CasePlayer>;

function lastName(name: string): string {
	const parts = name.split(' ');
	return parts.slice(1).join(' ') || parts[0] || name;
}

export function buildPool(bundle: Bundle): Pool {
	const rates = new Map(
		bundle.dataset.projections
			.filter((p) => p.metricDefinitionId === bundle.assumptions.metricDefinitionId)
			.map((p) => [p.playerId, p.overall ?? null])
	);
	const pool = new Map<string, CasePlayer>();
	for (const player of bundle.dataset.players) {
		const rateText = rates.get(player.id) ?? null;
		const total = SEASON_TOTALS[player.id] ?? null;
		const rate = total ? total.runs / total.pa : null;
		const split = PLAYER_SPLITS[player.id] ?? null;
		// Split rows can trail the season total by a game; scale both sides
		// to the season PA in the same proportion.
		const k = split && total ? total.pa / (split.vL.pa + split.vR.pa) : 1;
		const pa = split ? { L: split.vL.pa * k, R: split.vR.pa * k } : { L: 0, R: 0 };
		const label = shapeOf(player.id);
		pool.set(player.id, {
			id: player.id,
			name: player.name,
			last: lastName(player.name),
			bats: player.bats,
			elig: player.eligiblePositions,
			rate,
			seasonRateText: rate == null ? null : rate.toFixed(6),
			rateText,
			shape: label.shape,
			rationale: label.rationale,
			split,
			pa,
			runs: rate != null && split ? (pa.L + pa.R) * rate : null
		});
	}
	return pool;
}

/** The scenario's lineup in its busiest pitcher-hand context (the right-starter template). */
export function scenarioLineup(bundle: Bundle, scenario: Scenario): Lineup {
	const template = bundle.assumptions.templates.reduce((a, b) => (b.games > a.games ? b : a));
	const allocation = scenario.allocations.find((a) => a.templateId === template.id);
	const lineup: Lineup = {};
	for (const slot of template.slots) {
		if (!(SLOT_ROLES as readonly string[]).includes(slot.role)) continue;
		const assignment = allocation?.assignments.find((a) => a.order === slot.order);
		lineup[slot.role] = assignment?.playerId ?? null;
	}
	return lineup;
}

export function lineupIds(lineup: Lineup): string[] {
	return SLOT_ROLES.map((r) => lineup[r]).filter((id): id is string => !!id);
}

/** Actual 2026 runs of the nine starters, or null when any is missing or a slot is empty. */
export function lineupRuns(pool: Pool, lineup: Lineup): number | null {
	let total = 0;
	for (const role of SLOT_ROLES) {
		const id = lineup[role];
		const runs = id ? pool.get(id)?.runs : null;
		if (runs == null) return null;
		total += runs;
	}
	return total;
}

// ---------- color: Savant-style diverging by split OPS vs league ----------
const SAVANT_STOPS: readonly (readonly [number, readonly [number, number, number]])[] = [
	[-1, [50, 90, 168]],
	[-0.5, [140, 170, 215]],
	[0, [220, 220, 220]],
	[0.5, [236, 152, 130]],
	[1, [210, 45, 73]]
];
export const SAVANT_GRADIENT = `linear-gradient(90deg, ${SAVANT_STOPS.map(([, c], i) => `rgb(${c.join(',')}) ${(i / 4) * 100}%`).join(', ')})`;

export function savantColor(ops: string, side: Side): string {
	const v = Math.max(-1, Math.min(1, (Number(ops) - LEAGUE_OPS[side]) / SAVANT_SPAN));
	for (let i = 0; i < SAVANT_STOPS.length - 1; i++) {
		const [a, ca] = SAVANT_STOPS[i]!;
		const [b, cb] = SAVANT_STOPS[i + 1]!;
		if (v <= b) {
			const k = (v - a) / (b - a);
			return `rgb(${ca.map((c, j) => Math.round(c + (cb[j]! - c) * k)).join(',')})`;
		}
	}
	return `rgb(${SAVANT_STOPS[4]![1].join(',')})`;
}

export function sideOf(split: PlayerSplit, side: Side) {
	return side === 'L' ? split.vL : split.vR;
}

function weightedOps(split: PlayerSplit): number {
	return (
		(split.vL.pa * Number(split.vL.ops) + split.vR.pa * Number(split.vR.ops)) /
		(split.vL.pa + split.vR.pa)
	);
}

const clampScale = (v: number) => Math.max(0.6, Math.min(1.4, v));

/** Each half's scale: that split's OPS over the player's own PA-weighted OPS. */
export function splitScale(player: CasePlayer): { L: number; R: number } | null {
	if (!player.split) return null;
	const w = weightedOps(player.split);
	return {
		L: clampScale(Number(player.split.vL.ops) / w),
		R: clampScale(Number(player.split.vR.ops) / w)
	};
}

/** Estimated R/PA against one hand: observed R/PA scaled by split OPS (judgment layer). */
export function sideRate(player: CasePlayer, side: Side): number | null {
	if (player.rate == null) return null;
	if (!player.split) return player.rate;
	return (player.rate * Number(sideOf(player.split, side).ops)) / weightedOps(player.split);
}

export function cellRuns(player: CasePlayer | undefined, side: Side): number | null {
	if (!player) return null;
	const rate = sideRate(player, side);
	return rate == null ? null : player.pa[side] * rate;
}

export function leagueSideRate(side: Side): number {
	return (LEAGUE_RUNS_PER_PA * LEAGUE_OPS[side]) / LEAGUE_OPS_OVERALL;
}

export function splitText(player: CasePlayer): string {
	const s = player.split;
	if (!s) return player.rate == null ? 'no 2026 PA' : 'no split evidence';
	return `vs LHP ${s.vL.ops} (${s.vL.pa} PA) · vs RHP ${s.vR.ops} (${s.vR.pa} PA)`;
}

// ---------- the case: what each cutout asks for (proposed rubric) ----------
export type Grade = 'snug' | 'fits' | 'loose' | 'unknown';
export const CUTOUT_ASK: Readonly<
	Record<Role, { primary: ShapeLabel; accept: readonly ShapeLabel[]; why: string }>
> = {
	C: { primary: 'Square', accept: [], why: 'steady everyday catcher' },
	'1B': { primary: 'Square', accept: ['Rectangle'], why: 'everyday bat-first corner' },
	'2B': {
		primary: 'Square',
		accept: ['Circle', 'Octagon', 'Star'],
		why: 'steady everyday middle infielder; a Star fits only as half of a platoon'
	},
	'3B': { primary: 'Square', accept: ['Octagon'], why: 'everyday corner bat who can hold the bag' },
	SS: {
		primary: 'Octagon',
		accept: ['Circle', 'Star'],
		why: 'the glove the infield is built around'
	},
	LF: { primary: 'Rectangle', accept: ['Pentagon', 'Square'], why: 'everyday volume bat' },
	CF: {
		primary: 'Octagon',
		accept: ['Pentagon', 'Rectangle'],
		why: 'up-the-middle defensive anchor'
	},
	RF: {
		primary: 'Rectangle',
		accept: ['Pentagon', 'Square'],
		why: 'everyday volume bat with an arm'
	},
	DH: {
		primary: 'Funky',
		accept: ['Rectangle', 'Square', 'Star'],
		why: 'the only glove-free cutout, where quirky bats land'
	}
};
export const GRADE_TEXT: Readonly<Record<Grade, string>> = {
	snug: 'Snug',
	fits: 'Fits',
	loose: 'Loose',
	unknown: 'No data'
};

export function grade(player: CasePlayer, role: Role): Grade {
	const ask = CUTOUT_ASK[role];
	if (player.shape === 'Unclassified') return 'unknown';
	if (player.shape === ask.primary) return 'snug';
	if (ask.accept.includes(player.shape)) return 'fits';
	return 'loose';
}

/** Columns a player can fill in the bin and bars: eligible positions, else DH. */
export function colsOf(player: CasePlayer): readonly string[] {
	return player.elig.length ? player.elig : ['DH'];
}

export interface Complement {
	vsL: string;
	vsR: string;
	at: string[];
}

/** Two players who share a position, each at least .050 OPS better on opposite sides. */
export function complements(pool: Pool): Complement[] {
	const ids = [...pool.values()].filter((p) => p.split);
	const out: Complement[] = [];
	for (let i = 0; i < ids.length; i++) {
		for (let j = i + 1; j < ids.length; j++) {
			const a = ids[i]!;
			const b = ids[j]!;
			const at = colsOf(a).filter((c) => colsOf(b).includes(c));
			if (!at.length || !a.split || !b.split) continue;
			const dL = Number(a.split.vL.ops) - Number(b.split.vL.ops);
			const dR = Number(a.split.vR.ops) - Number(b.split.vR.ops);
			if (dL >= 0.05 && dR <= -0.05) out.push({ vsL: a.id, vsR: b.id, at });
			else if (dL <= -0.05 && dR >= 0.05) out.push({ vsL: b.id, vsR: a.id, at });
		}
	}
	return out;
}

export interface Finding {
	lead: string;
	text: string;
	grade?: Grade;
}

export interface CaseView {
	lineup: Lineup;
	bench: string[];
	movedIn: string[];
	movedOut: string[];
	roleOf: ReadonlyMap<string, Role>;
	gaps: Role[];
	runs: number | null;
	findings: { empty: Finding[]; nice: Finding[]; friction: Finding[] };
}

const ops3 = (o: number) => `.${String(Math.round(o * 1000)).padStart(3, '0')}`;

export function caseView(pool: Pool, lineup: Lineup, baseLineup: Lineup): CaseView {
	const inLineup = new Set(lineupIds(lineup));
	const inBase = new Set(lineupIds(baseLineup));
	const bench = [...pool.keys()].filter((id) => !inLineup.has(id));
	const roleOf = new Map<string, Role>();
	for (const role of SLOT_ROLES) {
		const id = lineup[role];
		if (id) roleOf.set(id, role);
	}
	const dh = lineup.DH ? pool.get(lineup.DH) : undefined;
	// A position is covered when a bench piece is eligible there or the DH can slide over.
	const gaps = FIELD_ROLES.filter(
		(pos) =>
			!bench.some((id) => pool.get(id)?.elig.includes(pos)) && !(dh?.elig.includes(pos) ?? false)
	);

	const empty: Finding[] = [];
	const nice: Finding[] = [];
	const friction: Finding[] = [];
	const name = (id: string | null | undefined) => (id ? (pool.get(id)?.last ?? id) : 'nobody');
	for (const pos of gaps) {
		empty.push({
			lead: `No cover at ${pos}.`,
			text: `Nobody in the tray is eligible there and the DH can't slide over, so if ${name(lineup[pos])} misses a game the cutout sits empty.`
		});
	}
	const gloveless = bench.filter((id) => pool.get(id)?.elig.length === 0);
	if (gloveless.length) {
		empty.push({
			lead: `${gloveless.length} of ${bench.length} bench spots have no glove:`,
			text: `${gloveless.map(name).join(', ')}. Those spots take up room in the case without covering a position.`
		});
	}
	const weak = SLOT_ROLES.flatMap((role) => {
		const p = lineup[role] ? pool.get(lineup[role]) : undefined;
		return p?.split && Number(p.split.vL.ops) < 0.68
			? [{ role, p, o: Number(p.split.vL.ops) }]
			: [];
	}).sort((a, b) => a.o - b.o);
	if (weak.length) {
		empty.push({
			lead: 'Soft spots vs LHP:',
			text: `${weak.map((w) => `${w.p.last} ${w.role} (${ops3(w.o)})`).join(', ')}. These lineup halves shrink on the left side of their pieces.`
		});
	}
	const hasRightyOutfielder = bench.some((id) => {
		const p = pool.get(id);
		return p?.bats === 'R' && p.elig.some((e) => ['LF', 'CF', 'RF'].includes(e));
	});
	if (!hasRightyOutfielder) {
		empty.push({
			lead: 'No right-handed outfield bat in the tray.',
			text: 'The outfield can only be platooned from within itself.'
		});
	}
	for (const role of SLOT_ROLES) {
		const id = lineup[role];
		const p = id ? pool.get(id) : undefined;
		if (!id) {
			empty.push({ lead: `${role} is unassigned.`, text: 'The cutout is empty in this scenario.' });
			continue;
		}
		if (!p) continue;
		if (p.runs == null) {
			empty.push({
				lead: `${p.last} fills ${role} with no 2026 data.`,
				text: 'The cutout is occupied, but the run total is unavailable rather than zero.'
			});
		}
		const g = grade(p, role);
		const ask = CUTOUT_ASK[role];
		if (g === 'snug') {
			nice.push({
				lead: `${p.last} at ${role}:`,
				text: `a ${p.shape} in a ${ask.primary} cutout (${ask.why}).`
			});
		} else if (g === 'fits' || g === 'loose') {
			friction.push({
				lead: `${p.last} at ${role}:`,
				text: `a ${p.shape} in a ${ask.primary} cutout.`,
				grade: g
			});
		}
	}
	friction.sort((a, b) => (a.grade === 'loose' ? -1 : 1) - (b.grade === 'loose' ? -1 : 1));
	const benchCircles = bench.filter((id) => pool.get(id)?.shape === 'Circle');
	if (benchCircles.length) {
		nice.push({
			lead: `${benchCircles.map(name).join(' and ')} in the tray:`,
			text: `Circles are utility pieces, so the bench is the right place for them.`
		});
	}
	const benchCatchers = bench.filter((id) => pool.get(id)?.elig.includes('C'));
	if (benchCatchers.length) {
		nice.push({
			lead: `${benchCatchers.map(name).join(', ')} backs up catcher:`,
			text: 'a matched Square piece for the Square cutout.'
		});
	}
	const benchRated = bench
		.map((id) => pool.get(id)!)
		.filter((p) => p.rate != null)
		.sort((a, b) => b.rate! - a.rate!);
	const top = benchRated[0];
	if (top) {
		const weaker = SLOT_ROLES.flatMap((role) => {
			const p = lineup[role] ? pool.get(lineup[role]) : undefined;
			return p?.rate != null && p.rate < top.rate! && (role === 'DH' || top.elig.includes(role))
				? [`${p.last} at ${role} (${p.rateText})`]
				: [];
		});
		if (weaker.length) {
			friction.push({
				lead: `${top.last} (${top.rateText}) sits in the tray`,
				text: `but out-hits ${weaker.join(', ')} on observed R/PA, in a spot he's eligible to fill.`
			});
		}
	}
	return {
		lineup,
		bench,
		movedIn: [...inLineup].filter((id) => !inBase.has(id)),
		movedOut: [...inBase].filter((id) => !inLineup.has(id)),
		roleOf,
		gaps,
		runs: lineupRuns(pool, lineup),
		findings: { empty, nice, friction }
	};
}

// ---------- interaction map ----------
export interface TestedScenario {
	story: string;
	scenarioId: string;
	label: string;
	lineup: Lineup;
	baseLineup: Lineup;
}

export type Edge =
	| { type: 'compete'; a: string; b: string; label: string }
	| { type: 'dh'; a: string; b: 'HUB' }
	| { type: 'platoon'; a: string; b: string; label: string }
	| {
			type: 'swap';
			a: string;
			b: string;
			label: string;
			title: string;
			tests: { story: string; scenarioId: string }[];
	  };

export function interactionEdges(pool: Pool, tested: readonly TestedScenario[]): Edge[] {
	const ids = [...pool.keys()];
	const out: Edge[] = [];
	for (let i = 0; i < ids.length; i++) {
		for (let j = i + 1; j < ids.length; j++) {
			const a = pool.get(ids[i]!)!;
			const b = pool.get(ids[j]!)!;
			const shared = a.elig.filter((e) => b.elig.includes(e));
			if (shared.length) out.push({ type: 'compete', a: a.id, b: b.id, label: shared.join('/') });
		}
	}
	const dh = new Set<string>();
	const swaps = new Map<
		string,
		{
			a: string;
			b: string;
			tests: {
				inn: string;
				out: string;
				delta: number | null;
				story: string;
				scenarioId: string;
			}[];
		}
	>();
	for (const t of tested) {
		if (t.lineup.DH) dh.add(t.lineup.DH);
		if (t.baseLineup.DH) dh.add(t.baseLineup.DH);
		const base = new Set(lineupIds(t.baseLineup));
		const cur = new Set(lineupIds(t.lineup));
		const ins = [...cur].filter((x) => !base.has(x));
		const outs = [...base].filter((x) => !cur.has(x));
		const runs = lineupRuns(pool, t.lineup);
		const baseRuns = lineupRuns(pool, t.baseLineup);
		const delta = runs == null || baseRuns == null ? null : runs - baseRuns;
		ins.forEach((inn, k) => {
			const o = outs[k];
			// Each storyline has its own dated pool; skip swaps whose players
			// are not in this one.
			if (!o || !pool.has(inn) || !pool.has(o)) return;
			const key = [inn, o].sort().join('|');
			const edge = swaps.get(key) ?? { a: o, b: inn, tests: [] };
			edge.tests.push({ inn, out: o, delta, story: t.story, scenarioId: t.scenarioId });
			swaps.set(key, edge);
		});
	}
	for (const id of dh) if (pool.has(id)) out.push({ type: 'dh', a: id, b: 'HUB' });
	for (const c of complements(pool)) {
		out.push({
			type: 'platoon',
			a: c.vsL,
			b: c.vsR,
			label: `${pool.get(c.vsL)!.last} vL · ${pool.get(c.vsR)!.last} vR`
		});
	}
	const fmt = (d: number | null) =>
		d == null ? 'n/a' : `${d >= 0 ? '+' : '−'}${Math.abs(d).toFixed(1)}`;
	for (const e of swaps.values()) {
		const first = e.tests[0]!;
		const uniq = e.tests.filter(
			(x, i) => e.tests.findIndex((u) => u.inn === x.inn && u.out === x.out) === i
		);
		const symmetric =
			uniq.length > 1 &&
			uniq.every(
				(x) => x.delta != null && Math.abs(Math.abs(x.delta) - Math.abs(uniq[0]!.delta!)) < 1e-9
			);
		out.push({
			type: 'swap',
			a: first.out,
			b: first.inn,
			label: symmetric
				? `±${Math.abs(uniq[0]!.delta!).toFixed(1)}`
				: uniq.map((x) => fmt(x.delta)).join(' / '),
			title: uniq
				.map((x) => `${pool.get(x.inn)?.name} for ${pool.get(x.out)?.name}: ${fmt(x.delta)} runs`)
				.join('; '),
			tests: e.tests.map((x) => ({ story: x.story, scenarioId: x.scenarioId }))
		});
	}
	return out;
}

export function interactionFindings(pool: Pool, edges: readonly Edge[]): Finding[][] {
	const degree = new Map([...pool.keys()].map((id) => [id, 0]));
	for (const e of edges) {
		if (e.type !== 'compete') continue;
		degree.set(e.a, (degree.get(e.a) ?? 0) + 1);
		degree.set(e.b, (degree.get(e.b) ?? 0) + 1);
	}
	const players = [...pool.values()];
	const loners = players.filter((p) => p.elig.length && degree.get(p.id) === 0);
	const crowd = players
		.filter((p) => (degree.get(p.id) ?? 0) >= 3)
		.sort((a, b) => degree.get(b.id)! - degree.get(a.id)!);
	const dhUsers = edges.filter((e) => e.type === 'dh').map((e) => pool.get(e.a)!.last);
	const gloveless = players.filter((p) => !p.elig.length).map((p) => p.last);
	const swaps = edges.filter((e) => e.type === 'swap');
	const bridge = players
		.filter((p) => p.elig.length >= 2 && edges.some((e) => e.type === 'dh' && e.a === p.id))
		.map((p) => p.last);
	return [
		[
			...(loners.length
				? [
						{
							lead: `${loners.map((p) => `${p.last} (${p.elig.join('/')})`).join(' and ')}`,
							text: 'share a position with nobody in the pool, so losing either leaves a hole no swap in the pool can fill.'
						}
					]
				: []),
			...(gloveless.length
				? [
						{
							lead: gloveless.join(', '),
							text: 'connect only through the DH lane. Their only interaction is competing for one slot.'
						}
					]
				: [])
		],
		[
			...(crowd.length
				? [
						{
							lead: 'The densest knot:',
							text: `${crowd.map((p) => `${p.last} (${degree.get(p.id)} links)`).join(', ')}. Redundancy there is cheap cover, and every test inside it is a small move.`
						}
					]
				: []),
			{
				lead: `The DH lane has ${dhUsers.length} players across the storylines`,
				text: `(${dhUsers.join(', ')}). It's the busiest node on the map.`
			}
		],
		[
			...(bridge.length
				? [
						{
							lead: `${bridge.join(', ')} ${bridge.length === 1 ? 'is the bridge' : 'are the bridges'}.`,
							text: 'Linked to more than one position and the DH lane, so moving one piece moves others.'
						}
					]
				: []),
			{
				lead: `${swaps.length} distinct swaps are tested.`,
				text: 'Arrows point at the player who comes in and carry the change in actual 2026 runs.'
			}
		]
	];
}

// ---------- tightest fit: best nine against each hand ----------
/** Best nine against one hand, eligibility enforced, a player in at most one slot. */
export function bestAgainst(pool: Pool, side: Side): Lineup {
	const ids = [...pool.values()].filter((p) => p.rate != null && p.split);
	const order = [...SLOT_ROLES].sort(
		(a, b) =>
			Number(a === 'DH') - Number(b === 'DH') ||
			ids.filter((p) => p.elig.includes(a)).length - ids.filter((p) => p.elig.includes(b)).length
	);
	let best = { v: -1, lineup: {} as Lineup };
	const used = new Set<string>();
	const lineup: Lineup = {};
	const go = (k: number, v: number) => {
		if (k === order.length) {
			if (v > best.v) best = { v, lineup: { ...lineup } };
			return;
		}
		const role = order[k]!;
		for (const p of ids) {
			if (used.has(p.id) || (role !== 'DH' && !p.elig.includes(role))) continue;
			used.add(p.id);
			lineup[role] = p.id;
			go(k + 1, v + (cellRuns(p, side) ?? 0));
			used.delete(p.id);
			delete lineup[role];
		}
	};
	go(0, 0);
	return best.lineup;
}

export interface TightestFit {
	L: Lineup;
	R: Lineup;
}

// The pool is rebuilt on every workspace edit, but its players rarely change,
// so the search and the bin calibration are cached by the pool's contents.
function poolKey(pool: Pool): string {
	return [...pool.values()]
		.map((p) => `${p.id}:${p.rateText}:${p.shape}:${p.elig.join('/')}`)
		.join('|');
}
const fitCache = new Map<string, TightestFit>();
export function tightestFit(pool: Pool): TightestFit {
	const key = poolKey(pool);
	let fit = fitCache.get(key);
	if (!fit) {
		fit = { L: bestAgainst(pool, 'L'), R: bestAgainst(pool, 'R') };
		fitCache.set(key, fit);
	}
	return fit;
}

// ---------- capacity bin: the assigned shapes packed by gravity ----------
export const BIN_W = 430;
export const BIN_H = 560;

export interface BinPiece {
	role: Role;
	idL: string | null;
	idR: string | null;
	runs: number | null;
	r: number;
	kL: number;
	kR: number;
	area: number;
	box: { left: number; right: number; top: number; bottom: number };
	x: number;
	y: number;
}

function pieceShape(pool: Pool, id: string | null): ShapeLabel {
	const shape = id ? (pool.get(id)?.shape ?? 'Unclassified') : 'Unclassified';
	return shape === 'Unclassified' ? 'Circle' : shape;
}

function slotPiece(
	pool: Pool,
	role: Role,
	idL: string | null,
	idR: string | null,
	scale: number
): BinPiece {
	const pL = idL ? pool.get(idL) : undefined;
	const pR = idR ? pool.get(idR) : undefined;
	const vL = cellRuns(pL, 'L');
	const vR = cellRuns(pR, 'R');
	if (vL == null || vR == null || !pL || !pR) {
		const r = 30;
		return {
			role,
			idL,
			idR,
			runs: null,
			r,
			kL: 1,
			kR: 1,
			area: 0,
			box: { left: r + 2, right: r + 2, top: r + 2, bottom: r + 2 },
			x: 0,
			y: 0
		};
	}
	const runs = vL + vR;
	const composite = runs / (pL.pa.L + pR.pa.R);
	const kL = clampScale(sideRate(pL, 'L')! / composite);
	const kR = clampScale(sideRate(pR, 'R')! / composite);
	const r = scale * Math.sqrt(runs);
	const bl = boundingBox(pieceShape(pool, idL), r * kL);
	const br = boundingBox(pieceShape(pool, idR), r * kR);
	return {
		role,
		idL,
		idR,
		runs,
		r,
		kL,
		kR,
		area: (Math.PI * r * r * (kL * kL + kR * kR)) / 2,
		box: {
			left: -bl.left + 2,
			right: br.right + 2,
			top: -Math.min(bl.top, br.top) + 2,
			bottom: Math.max(bl.bottom, br.bottom) + 2
		},
		x: 0,
		y: 0
	};
}

/**
 * Gravity packing by true outline: each piece's silhouette is sampled one unit
 * column at a time and drops until some column touches the pile, so points and
 * curves settle into neighbors' notches. Biggest pieces first.
 */
function pack(pool: Pool, pieces: BinPiece[]): { top: number; under: number } {
	const sky = new Array<number>(BIN_W).fill(0);
	const ordered = [...pieces].sort((a, b) => b.area - a.area || (a.role < b.role ? -1 : 1));
	for (const pc of ordered) {
		const L = Math.ceil(pc.box.left);
		const w = Math.ceil(pc.box.left + pc.box.right);
		const profile: ({ low: number; high: number } | null)[] = [];
		for (let j = 0; j < w; j++) {
			const lx = j - L + 0.5;
			const left = lx < 0;
			const id = left ? pc.idL : pc.idR;
			const span = columnSpan(
				pieceShape(pool, id),
				pc.r * (pc.runs == null ? 1 : left ? pc.kL : pc.kR),
				lx
			);
			profile.push(span ? { low: -span[1] - 1, high: -span[0] + 1 } : null);
		}
		let best: { x: number; Y: number } | null = null;
		for (let x = 0; x + w <= BIN_W; x++) {
			let Y = -Infinity;
			for (let j = 0; j < w; j++) {
				const col = profile[j];
				if (col) Y = Math.max(Y, sky[x + j]! - col.low);
			}
			if (!best || Y < best.Y - 0.25) best = { x, Y };
		}
		best ??= { x: 0, Y: Math.max(...sky) };
		for (let j = 0; j < w; j++) {
			const col = profile[j];
			if (col) sky[best.x + j] = Math.max(sky[best.x + j]!, best.Y + col.high);
		}
		pc.x = best.x + L;
		pc.y = best.Y;
	}
	return { top: Math.max(...sky), under: sky.reduce((s, h) => s + Math.min(h, BIN_H), 0) };
}

export interface BinResult {
	pieces: BinPiece[];
	runs: number | null;
	/** Shares of the bin, in percent. */
	fill: number;
	gaps: number;
	headroom: number;
	overflows: boolean;
}

function binWith(pool: Pool, lineupL: Lineup, lineupR: Lineup, scale: number): BinResult {
	const pieces = SLOT_ROLES.map((role) =>
		slotPiece(pool, role, lineupL[role] ?? null, lineupR[role] ?? null, scale)
	);
	const pile = pack(pool, pieces);
	const total = BIN_W * BIN_H;
	const shapes = pieces.reduce((s, p) => s + p.area, 0);
	return {
		pieces,
		runs: pieces.some((p) => p.runs == null) ? null : pieces.reduce((s, p) => s + p.runs!, 0),
		fill: (shapes / total) * 100,
		gaps: (Math.max(0, pile.under - shapes) / total) * 100,
		headroom: ((total - pile.under) / total) * 100,
		overflows: pile.top > BIN_H
	};
}

const scaleCache = new Map<string, number>();
/** Scale runs → radius so the tightest fit's pile just reaches the lid. */
export function binScale(pool: Pool): number {
	const key = poolKey(pool);
	const cached = scaleCache.get(key);
	if (cached != null) return cached;
	const fit = tightestFit(pool);
	const fitRuns = SLOT_ROLES.reduce((s, r) => {
		const l = fit.L[r];
		const rr = fit.R[r];
		return (
			s +
			(cellRuns(l ? pool.get(l) : undefined, 'L') ?? 0) +
			(cellRuns(rr ? pool.get(rr) : undefined, 'R') ?? 0)
		);
	}, 0);
	let k = Math.sqrt((0.6 * BIN_W * BIN_H) / (Math.PI * Math.max(fitRuns, 1)));
	const topAt = (scale: number) => {
		const pieces = SLOT_ROLES.map((role) =>
			slotPiece(pool, role, fit.L[role] ?? null, fit.R[role] ?? null, scale)
		);
		return pack(pool, pieces).top;
	};
	for (let i = 0; i < 12; i++) {
		const top = topAt(k);
		if (Math.abs(top - BIN_H) < 2) break;
		k *= Math.sqrt(BIN_H / top);
	}
	for (let i = 0; i < 200 && topAt(k) > BIN_H; i++) k *= 0.995;
	scaleCache.set(key, k);
	return k;
}

/** A lineup (one player per slot, both sides) packed into the pool's bin. */
export function lineupBin(pool: Pool, lineup: Lineup): BinResult {
	return binWith(pool, lineup, lineup, binScale(pool));
}

/** The pool's tightest fit (platoons and position moves allowed) packed into the same bin. */
export function tightestBin(pool: Pool): BinResult {
	const fit = tightestFit(pool);
	return binWith(pool, fit.L, fit.R, binScale(pool));
}

// ---------- slot by slot: bars by lineup slot and batting side ----------
/** Full band = .150 R/PA in every actual PA. */
export const CAP_RATE = 0.15;

export interface BarCell {
	role: Role;
	L: { id: string | null; runs: number | null; pa: number };
	R: { id: string | null; runs: number | null; pa: number };
	pa: number;
}

export interface BarResult {
	cells: BarCell[];
	runs: number | null;
	knownRuns: number;
	pa: number;
	pct: number;
}

export function barFill(pool: Pool, lineupL: Lineup, lineupR: Lineup): BarResult {
	let runs = 0;
	let known = true;
	const cells = SLOT_ROLES.map((role) => {
		const side = (s: Side) => {
			const id = (s === 'L' ? lineupL : lineupR)[role] ?? null;
			const p = id ? pool.get(id) : undefined;
			const v = cellRuns(p, s);
			if (v == null) known = false;
			else runs += v;
			return { id, runs: v, pa: v == null || !p ? 30 : p.pa[s] };
		};
		const L = side('L');
		const R = side('R');
		return { role, L, R, pa: L.pa + R.pa };
	});
	const pa = cells.reduce((s, c) => s + c.pa, 0);
	return {
		cells,
		runs: known ? runs : null,
		knownRuns: runs,
		pa,
		pct: (runs / (pa * CAP_RATE)) * 100
	};
}

// ---------- findings under the bin and the bars ----------
function opsOf(player: CasePlayer | undefined, side: Side): string {
	return player?.split ? sideOf(player.split, side).ops : 'n/a';
}

export function binFindings(
	pool: Pool,
	lineup: Lineup,
	cur: BinResult,
	best: BinResult
): Finding[][] {
	const inLineup = new Set(lineupIds(lineup));
	const fit = tightestFit(pool);
	const inFit = new Set([...lineupIds(fit.L), ...lineupIds(fit.R)]);
	const stars = [...pool.values()].filter((p) => p.shape === 'Star');
	const more = cur.runs == null || best.runs == null ? null : best.runs - cur.runs;
	return [
		[
			{
				lead: `This lineup fills ${Math.round(cur.fill)}% of the bin.`,
				text: `${Math.round(cur.gaps)}% is lost in gaps where shapes don't nest, and ${Math.round(cur.headroom)}% is headroom: value no one on the field supplies.`
			},
			{
				lead: 'The lid is where the tightest fit tops out,',
				text: 'so headroom is value this lineup leaves off compared with the best the pool can do.'
			},
			...(cur.runs == null
				? [
						{
							lead: 'A starter has no 2026 data.',
							text: 'That piece is hatched at a nominal size, so the fill is a floor and no total is claimed.'
						}
					]
				: [])
		],
		[
			{
				lead: 'The tightest fit reaches the lid',
				text: `${more == null ? '' : `(about ${more.toFixed(1)} runs more than this lineup) `}using platoons and position moves. Even so, ${Math.round(best.gaps)}% of the bin is gaps between shapes.`
			},
			{
				lead: 'Squares and rectangles sit flush',
				text: 'against each other and waste almost nothing. Circles and Stars leave pockets.'
			}
		],
		[
			...(stars.length
				? [
						{
							lead: 'Stars (tough fits):',
							text: `${stars
								.map(
									(p) =>
										`${p.last} ${inLineup.has(p.id) ? 'is in this lineup' : 'is on the bench here'}${inFit.has(p.id) ? ' and makes the tightest fit as a platoon half' : ''}`
								)
								.join(
									'; '
								)}. Their points rarely nest against a neighbor, so gaps open around every Star.`
						}
					]
				: []),
			{
				lead: 'Split halves use an estimated split R/PA',
				text: '(observed R/PA scaled by split OPS), a judgment layer outside the run totals.'
			}
		]
	];
}

export function barFindings(pool: Pool, cur: BarResult, best: BarResult): Finding[][] {
	const name = (id: string | null) => (id ? (pool.get(id)?.last ?? id) : 'nobody');
	const gaps = cur.cells
		.flatMap((c) =>
			(['L', 'R'] as const).flatMap((side) => {
				const cell = c[side];
				return cell.runs == null
					? []
					: [{ role: c.role, side, id: cell.id, gap: cell.pa * CAP_RATE - cell.runs }];
			})
		)
		.sort((a, b) => b.gap - a.gap)
		.slice(0, 3);
	const fit = tightestFit(pool);
	const platoons = best.cells.filter((c) => c.L.id !== c.R.id);
	const roleIn = (l: Lineup, id: string) => SLOT_ROLES.find((r) => l[r] === id);
	const moved = [...pool.keys()].flatMap((id) => {
		const a = roleIn(fit.L, id);
		const b = roleIn(fit.R, id);
		return a && b && a !== b ? [`${name(id)} plays ${a} vs LHP and ${b} vs RHP`] : [];
	});
	const used = new Set([...lineupIds(fit.L), ...lineupIds(fit.R)]);
	const out = [...pool.values()].filter((p) => !used.has(p.id));
	const stars = [...pool.values()].filter((p) => p.shape === 'Star');
	const diff = Math.round(best.pct - cur.pct);
	return [
		[
			{
				lead: `This lineup fills ${Math.round(cur.pct)}% of the container.`,
				text: `The biggest empty stretches: ${gaps
					.map(
						(g) =>
							`${g.role} vs ${g.side}HP (${name(g.id)}, ${opsOf(g.id ? pool.get(g.id) : undefined, g.side)} OPS, ${g.gap.toFixed(1)} R short)`
					)
					.join('; ')}.`
			},
			...(cur.runs == null
				? [
						{
							lead: 'A starter has no 2026 data,',
							text: 'so those cells are hatched and the fill is a floor, not a total.'
						}
					]
				: []),
			{
				lead: 'A band only fills when the hitter is good against that hand.',
				text: 'A single hitter carrying a weak side leaves empty space every day he plays.'
			}
		],
		[
			{
				lead: `The tightest fit fills ${Math.round(best.pct)}%,`,
				text: `${diff < 1 ? 'within a point of' : `${diff} point${diff === 1 ? '' : 's'} more than`} this lineup${best.runs != null && cur.runs != null ? `, about ${(best.runs - cur.runs).toFixed(1)} R more over actual PA` : ''}.`
			},
			...(platoons.length
				? [
						{
							lead: 'Platoons:',
							text: `${platoons.map((c) => `${c.role} ${name(c.L.id)} vs LHP / ${name(c.R.id)} vs RHP`).join('; ')}.`
						}
					]
				: []),
			...(moved.length
				? [
						{
							lead: 'Position moves:',
							text: `${moved.join('; ')}. Flexibility lets a piece fill whichever slot has room that day.`
						}
					]
				: [])
		],
		[
			...(out.length
				? [
						{
							lead: 'Left out against both hands:',
							text: `${out.map((p) => `${p.last}${p.rate == null || !p.split ? ' (no data)' : ''}`).join(', ')}. Nowhere in the container fits them better than someone else.`
						}
					]
				: []),
			...(stars.length
				? [
						{
							lead: 'Stars (tough fits):',
							text: `${stars.map((p) => `${p.last} ${opsOf(p, 'L')} vs LHP, ${opsOf(p, 'R')} vs RHP`).join('; ')}. Each fills one band well and leaves the other mostly empty, so they fit snugly only in a platoon.`
						}
					]
				: []),
			{
				lead: 'Band fills use an estimated split R/PA.',
				text: 'The bundles carry no split R/PA, so these fills are a judgment layer, not a published total.'
			}
		]
	];
}
