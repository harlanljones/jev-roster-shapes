// Public-data adapter spike (D-34). Fetches completed-2025 Red Sox data from
// the free MLB Stats API, derives observed R/PA rates, assembles one static
// `public`-class v1 bundle, validates it with the frozen contract validator,
// and smoke-runs the deterministic engine. Run: bun spikes/mlb-public/build.mjs
// The app does NOT open this bundle (D-28); output is a static file for review.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { calculateComparison } from '../../src/lib/engine/calculation.ts';
import { computeInputDigest, parseBundle } from '../../src/lib/contracts/bundle.ts';

const SEASON = 2025;
const METRIC_ID = 'mlbam-observed-r-per-pa-2025';
const MLB_SOURCE_ID = 'mlb-stats-api-2025';
const SPIKE_SOURCE_ID = 'spike-assumptions';
// Spike-default eligibility threshold (D-35): a position counts with >= 10
// games played across all 2025 stints. Evaluator decision TBD.
const ELIGIBILITY_MIN_GAMES = 10;
const POSITION_ORDER = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];

// Baseline slot plan: batting order, role, MLBAM id. Reserve + candidate-A
// incoming are listed separately below.
const SLOT_PLAN = [
	{ order: 1, role: 'C', mlbam: 665966 },
	{ order: 2, role: '1B', mlbam: 663993 },
	{ order: 3, role: '2B', mlbam: 692225 },
	{ order: 4, role: '3B', mlbam: 608324 },
	{ order: 5, role: 'SS', mlbam: 596115 },
	{ order: 6, role: 'LF', mlbam: 680776 },
	{ order: 7, role: 'CF', mlbam: 678882 },
	{ order: 8, role: 'RF', mlbam: 677800 },
	{ order: 9, role: 'DH', mlbam: 608701 }
];
const RESERVE_MLBAM = 663853;
const CANDIDATE_A = { incomingMlbam: 701350, outgoingMlbam: 608701 };

async function getJson(url) {
	const response = await fetch(url);
	if (!response.ok) throw new Error(`GET ${url} -> ${response.status}`);
	return response.json();
}

function rateString(runs, pa) {
	if (pa === 0) return null;
	return (Math.round((runs * 1_000_000) / pa) / 1_000_000).toFixed(6);
}

const players = new Map();
for (const mlbam of [
	...SLOT_PLAN.map((slot) => slot.mlbam),
	RESERVE_MLBAM,
	CANDIDATE_A.incomingMlbam
]) {
	const person = (await getJson(`https://statsapi.mlb.com/api/v1/people/${mlbam}`)).people[0];
	const hitting =
		(
			await getJson(
				`https://statsapi.mlb.com/api/v1/people/${mlbam}/stats?stats=season&season=${SEASON}&group=hitting`
			)
		).stats[0]?.splits ?? [];
	const fielding =
		(
			await getJson(
				`https://statsapi.mlb.com/api/v1/people/${mlbam}/stats?stats=season&season=${SEASON}&group=fielding`
			)
		).stats[0]?.splits ?? [];
	const pa = hitting.reduce((sum, split) => sum + (split.stat.plateAppearances ?? 0), 0);
	const runs = hitting.reduce((sum, split) => sum + (split.stat.runs ?? 0), 0);
	const gamesByPosition = new Map();
	for (const split of fielding) {
		const pos = split.position?.abbreviation;
		if (!pos || pos === 'DH' || !POSITION_ORDER.includes(pos)) continue;
		gamesByPosition.set(pos, (gamesByPosition.get(pos) ?? 0) + (split.stat.games ?? 0));
	}
	const eligiblePositions = POSITION_ORDER.filter(
		(pos) => (gamesByPosition.get(pos) ?? 0) >= ELIGIBILITY_MIN_GAMES
	);
	players.set(mlbam, {
		id: `mlbam-${mlbam}`,
		name: person.fullName,
		bats: person.batSide.code,
		primaryPosition: person.primaryPosition.abbreviation,
		eligiblePositions,
		pa,
		runs,
		rate: rateString(runs, pa)
	});
}

// Guard the slot plan against upstream changes: every field assignment must
// hold an eligible position under the spike threshold; DH is role-exempt.
for (const slot of SLOT_PLAN) {
	const player = players.get(slot.mlbam);
	if (slot.role !== 'DH' && !player.eligiblePositions.includes(slot.role)) {
		throw new Error(
			`slot plan drift: ${player.name} eligible [${player.eligiblePositions.join(',')}], expected ${slot.role}`
		);
	}
}

function template(id, label, starterHand, games, paL, paR) {
	const roles = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];
	return {
		id,
		label,
		starterHand,
		games,
		defensiveOutsPerGame: 27,
		slots: roles.map((role, index) => ({
			order: index + 1,
			role,
			paByPitcherHand: { L: paL, R: paR, unknown: 0 }
		}))
	};
}

const templates = [
	template('spike-vs-left', 'Spike vs left starter (illustrative)', 'L', 4, 4, 12),
	template('spike-vs-right', 'Spike vs right starter (illustrative)', 'R', 6, 6, 18)
];

const byMlbam = (mlbam) => players.get(mlbam).id;
const baselineMembers = [...SLOT_PLAN.map((slot) => slot.mlbam), RESERVE_MLBAM];
const candidateAMembers = baselineMembers
	.filter((mlbam) => mlbam !== CANDIDATE_A.outgoingMlbam)
	.concat([CANDIDATE_A.incomingMlbam]);

function assignmentsFor(memberIds, overrides = new Map()) {
	const slotPlayer = new Map(SLOT_PLAN.map((slot) => [slot.order, slot.mlbam]));
	for (const [order, mlbam] of overrides) slotPlayer.set(order, mlbam);
	return templates.map((t) => ({
		templateId: t.id,
		assignments: SLOT_PLAN.map((slot) => {
			const mlbam = slotPlayer.get(slot.order);
			if (!memberIds.includes(mlbam)) {
				throw new Error(`assignment plan drift: ${mlbam} is not a member`);
			}
			return { order: slot.order, playerId: byMlbam(mlbam) };
		})
	}));
}

function capsFor(memberIds) {
	// Generous horizon caps: workload limits are TBD (O-02), so the spike does
	// not pretend to source them. Values clear the illustrative demand by far.
	return memberIds.map((mlbam) => ({
		playerId: byMlbam(mlbam),
		maxStarts: 10,
		maxDefensiveOuts: 300,
		maxPA: 200,
		sourceId: SPIKE_SOURCE_ID
	}));
}

function scenario(id, label, memberIds, incomingIds, outgoingIds, allocations) {
	return {
		id,
		revision: 1,
		authorId: 'spike-adapter',
		label,
		memberIds: memberIds.map(byMlbam),
		incomingIds: incomingIds.map(byMlbam),
		outgoingIds: outgoingIds.map(byMlbam),
		allocations,
		workloadCaps: capsFor(memberIds),
		constraints: { rosterSizeMax: null, costBudget: null, costs: [] },
		review: {
			scope: 'coverage_and_offense',
			uncheckedTransactionRulesAcknowledgedAt: null,
			acknowledgedScenarioRevision: null
		}
	};
}

// Candidate A: Anthony in, Refsnyder out; Anthony takes LF, Duran slides to DH.
const candidateAOverrides = new Map([
	[6, CANDIDATE_A.incomingMlbam],
	[9, 680776]
]);

const bundle = {
	schemaVersion: '1.0',
	bundleId: 'mlbam-bos-observed-2025-spike',
	createdAt: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
	dataClass: 'public',
	sources: [
		{
			id: MLB_SOURCE_ID,
			title: 'MLB Stats API — 2025 regular-season observed totals',
			kind: 'projection',
			effectiveAt: '2025-09-28T00:00:00Z',
			note: 'Free public endpoints (people, season hitting and fielding stats), fetched 2026-09-21. Hitting totals aggregate all teams for traded players. Eligibility aggregates fielding games by position across stints at >= 10 games (spike default, D-35); DH rows excluded. Use of page content acknowledges the MLBAM copyright notice. Rates are observed R/PA, not forward projections.'
		},
		{
			id: SPIKE_SOURCE_ID,
			title: 'Spike 10-game illustrative horizon',
			kind: 'manual',
			effectiveAt: '2026-09-21T00:00:00Z',
			note: 'Equal-share demand copied from the synthetic template shape (40 PA per slot: 10 vs L, 30 vs R; 27 defensive outs per game). Not a team planning horizon. Workload caps are generous placeholders; real limits are TBD (O-02).'
		}
	],
	dataset: {
		id: 'mlbam-bos-2025',
		revision: 1,
		sourceIds: [MLB_SOURCE_ID],
		players: [...players.values()].map((player) => ({
			id: player.id,
			name: player.name,
			bats: player.bats,
			eligiblePositions: player.eligiblePositions,
			sourceIds: [MLB_SOURCE_ID]
		})),
		metricDefinitions: [
			{
				id: METRIC_ID,
				unit: 'runs_per_PA',
				referenceBaseline: `observed ${SEASON} MLB regular-season R/PA (all teams)`,
				sourceId: MLB_SOURCE_ID,
				note: 'Derived rate R/PA rounded to six decimals per SPEC 5.3; documented conversion, not a published projection. Missing splits remain null.'
			}
		],
		projections: [...players.values()].map((player) => ({
			playerId: player.id,
			metricDefinitionId: METRIC_ID,
			overall: player.rate,
			vsL: null,
			vsR: null,
			sourceId: MLB_SOURCE_ID
		}))
	},
	assumptions: {
		id: 'spike-horizon-10',
		revision: 1,
		authorId: 'spike-adapter',
		horizonGames: 10,
		offenseMode: 'overall',
		metricDefinitionId: METRIC_ID,
		sourceId: SPIKE_SOURCE_ID,
		templates
	},
	comparison: {
		id: 'mlbam-bos-spike',
		revision: 1,
		datasetRef: { id: 'mlbam-bos-2025', revision: 1 },
		assumptionRef: { id: 'spike-horizon-10', revision: 1 },
		baseline: scenario(
			'mlbam-baseline',
			'Observed baseline',
			baselineMembers,
			[],
			[],
			assignmentsFor(baselineMembers)
		),
		candidates: [
			scenario(
				'mlbam-candidate-a',
				'Anthony for Refsnyder',
				candidateAMembers,
				[CANDIDATE_A.incomingMlbam],
				[CANDIDATE_A.outgoingMlbam],
				assignmentsFor(candidateAMembers, candidateAOverrides)
			)
		]
	},
	results: []
};

const parsed = parseBundle(bundle);
const digest = computeInputDigest(parsed);
const calc = calculateComparison(parsed);
for (const result of calc.results) {
	console.log(
		`${result.scenarioId} rev ${result.scenarioRevision}: ${result.feasibility} ` +
			`offense=${result.offense.runs ?? result.offense.status} ` +
			`ready=${result.readiness.ready} (${result.readiness.blockingCodes.join(',') || 'none'})`
	);
}
console.log(`inputDigest=${digest}`);

const outDir = dirname(fileURLToPath(import.meta.url));
writeFileSync(join(outDir, 'redsox-observed-2025.json'), `${JSON.stringify(bundle, null, 2)}\n`);
console.log('wrote redsox-observed-2025.json');
