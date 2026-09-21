// 2026 storyline bundle builder (D-40). Fetches observed-2026 Red Sox totals
// from the free MLB Stats API (no key), derives observed R/PA, assembles five
// static `public`-class v1 bundles (baseline + two candidates each), validates
// each with the frozen contract validator, and asserts the hand-derived
// offense expectations from D-40 before writing.
// Run: bun spikes/mlb-2026/build.mjs
// Output is checked in under src/lib/storylines/ and loaded directly by the
// app. No network call happens at bundle load.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { calculateComparison } from '../../src/lib/engine/calculation.ts';
import { computeInputDigest, parseBundle } from '../../src/lib/contracts/bundle.ts';

const SEASON = 2026;
const AS_OF_DATE = process.env.DATA_AS_OF ?? new Date().toISOString().slice(0, 10);
const FETCHED_AT = process.env.DATA_FETCHED_AT ?? `${AS_OF_DATE}T00:00:00Z`;
const SNAPSHOT_REVISION = Number(AS_OF_DATE.replaceAll('-', ''));
const METRIC_ID = 'mlbam-observed-r-per-pa-2026';
const MLB_SOURCE_ID = 'mlb-stats-api-2026';
const SPIKE_SOURCE_ID = 'storyline-assumptions';
// Reuse the D-35 spike default: a position counts with >= 10 games played
// across all 2026 stints. Evaluator decision TBD.
const ELIGIBILITY_MIN_GAMES = 10;
const POSITION_ORDER = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];

// Slot orders follow the domain contract: 1 C, 2 1B, 3 2B, 4 3B, 5 SS,
// 6 LF, 7 CF, 8 RF, 9 DH.
const MLBAM = {
	rutschman: 668939,
	wong: 657136,
	contreras: 575929,
	casas: 671213,
	sogard: 686765,
	ikf: 643396,
	monasterio: 655316,
	durbin: 702332,
	story: 596115,
	anthony: 701350,
	rafaela: 678882,
	abreu: 677800,
	duran: 680776,
	yoshida: 807799,
	eaton: 681987
};

// Common starters shared by every storyline baseline.
const CORE = { 1: 'rutschman', 2: 'contreras', 4: 'durbin', 7: 'rafaela', 8: 'abreu' };

const STORYLINES = [
	{
		slug: 'power-vacuum',
		title: 'Who carries the lineup without Devers and Bregman?',
		bundleId: 'mlbam-bos-2026-power-vacuum',
		comparisonId: 'cmp-power-vacuum',
		scenarios: [
			{
				id: 'base',
				label: 'Baseline — Yoshida DH',
				extra: { 3: 'sogard', 5: 'story', 6: 'duran', 9: 'yoshida' },
				reserve: 'anthony',
				incoming: [],
				outgoing: []
			},
			{
				id: 'cand-a',
				label: 'A — Anthony everyday',
				extra: { 3: 'sogard', 5: 'story', 6: 'anthony', 9: 'duran' },
				reserve: null,
				incoming: ['anthony'],
				outgoing: ['yoshida']
			},
			{
				id: 'cand-b',
				label: 'B — Casas DH hope',
				extra: { 3: 'sogard', 5: 'story', 6: 'duran', 9: 'casas' },
				reserve: 'anthony',
				incoming: ['casas'],
				outgoing: ['yoshida']
			}
		],
		expected: { base: '39.13172', 'cand-a': '38.3194', deltaA: '-0.81232', 'cand-b': null }
	},
	{
		slug: 'outfield-logjam',
		title: 'Four gloves, three spots, one DH',
		bundleId: 'mlbam-bos-2026-outfield-logjam',
		comparisonId: 'cmp-outfield-logjam',
		scenarios: [
			{
				id: 'base',
				label: 'Baseline — Anthony LF, Duran DH',
				extra: { 3: 'sogard', 5: 'story', 6: 'anthony', 9: 'duran' },
				reserve: 'yoshida',
				incoming: [],
				outgoing: []
			},
			{
				id: 'cand-a',
				label: 'A — WBC-hot Yoshida DH',
				extra: { 3: 'sogard', 5: 'story', 6: 'duran', 9: 'yoshida' },
				reserve: null,
				incoming: ['yoshida'],
				outgoing: ['anthony']
			},
			{
				id: 'cand-b',
				label: 'B — Eaton speed DH',
				extra: { 3: 'sogard', 5: 'story', 6: 'duran', 9: 'eaton' },
				reserve: 'yoshida',
				incoming: ['eaton'],
				outgoing: ['anthony']
			}
		],
		expected: {
			base: '38.3194',
			'cand-a': '39.13172',
			deltaA: '0.81232',
			'cand-b': '37.46168',
			deltaB: '-0.85772'
		}
	},
	{
		slug: 'infield-reset',
		title: 'From the worst infield to steady',
		bundleId: 'mlbam-bos-2026-infield-reset',
		comparisonId: 'cmp-infield-reset',
		scenarios: [
			{
				id: 'base',
				label: 'Baseline — Sogard everyday 2B',
				extra: { 3: 'sogard', 5: 'story', 6: 'anthony', 9: 'duran' },
				reserve: 'wong',
				incoming: [],
				outgoing: []
			},
			{
				id: 'cand-a',
				label: 'A — IKF everyday 2B',
				extra: { 3: 'ikf', 5: 'story', 6: 'anthony', 9: 'duran' },
				reserve: 'wong',
				incoming: ['ikf'],
				outgoing: ['sogard']
			},
			{
				id: 'cand-b',
				label: 'B — Monasterio utility cover',
				extra: { 3: 'monasterio', 5: 'story', 6: 'anthony', 9: 'duran' },
				reserve: 'wong',
				incoming: ['monasterio'],
				outgoing: ['sogard']
			}
		],
		expected: {
			base: '38.3194',
			'cand-a': '39.95648',
			deltaA: '1.63708',
			'cand-b': '39.2414',
			deltaB: '0.922'
		}
	},
	{
		slug: 'catcher-split',
		title: "Narváez's middle ground vs Wong's rebound",
		bundleId: 'mlbam-bos-2026-catcher-split',
		comparisonId: 'cmp-catcher-split',
		scenarios: [
			{
				id: 'base',
				label: 'Baseline — Rutschman starts',
				extra: { 3: 'sogard', 5: 'story', 6: 'anthony', 9: 'duran' },
				reserve: 'eaton',
				incoming: [],
				outgoing: []
			},
			{
				id: 'cand-a',
				label: 'A — Wong starts',
				extra: { 1: 'wong', 3: 'sogard', 5: 'story', 6: 'anthony', 9: 'duran' },
				reserve: 'eaton',
				incoming: ['wong'],
				outgoing: ['rutschman']
			},
			{
				id: 'cand-b',
				label: 'B — Carry both catchers',
				extra: { 3: 'sogard', 5: 'story', 6: 'duran', 9: 'wong' },
				reserve: 'eaton',
				incoming: ['wong'],
				outgoing: ['anthony']
			}
		],
		expected: {
			base: '38.3194',
			'cand-a': '39.05276',
			deltaA: '0.73336',
			'cand-b': '38.32944',
			deltaB: '0.01004'
		}
	},
	{
		slug: 'lefty-hole',
		title: 'No Refsnyder, no Romy: who faces lefties?',
		bundleId: 'mlbam-bos-2026-lefty-hole',
		comparisonId: 'cmp-lefty-hole',
		scenarios: [
			{
				id: 'base',
				label: 'Baseline — Yoshida DH',
				extra: { 3: 'sogard', 5: 'story', 6: 'duran', 9: 'yoshida' },
				reserve: 'eaton',
				incoming: [],
				outgoing: []
			},
			{
				id: 'cand-a',
				label: 'A — IKF righty 2B',
				extra: { 3: 'ikf', 5: 'story', 6: 'duran', 9: 'yoshida' },
				reserve: 'sogard',
				incoming: ['ikf'],
				outgoing: ['eaton']
			},
			{
				id: 'cand-b',
				label: 'B — Monasterio SS, Story sits',
				extra: { 3: 'sogard', 5: 'monasterio', 6: 'duran', 9: 'yoshida' },
				reserve: 'story',
				incoming: ['monasterio'],
				outgoing: ['eaton']
			}
		],
		expected: {
			base: '39.13172',
			'cand-a': '40.7688',
			deltaA: '1.63708',
			'cand-b': '39.57752',
			deltaB: '0.4458'
		}
	}
];

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
const roster = await getJson(
	`https://statsapi.mlb.com/api/v1/teams/111/roster?rosterType=40Man&season=${SEASON}`
);
const rosterIds = new Set((roster.roster ?? []).map((entry) => entry.person.id));
const missingConfiguredPlayers = Object.entries(MLBAM)
	.filter(([, mlbam]) => !rosterIds.has(mlbam))
	.map(([key]) => key);
if (missingConfiguredPlayers.length > 0) {
	throw new Error(
		`configured scenario players are not on the ${SEASON} 40-man roster: ${missingConfiguredPlayers.join(', ')}. Update STORYLINES before refreshing; no bundles were written.`
	);
}
for (const key of Object.keys(MLBAM)) {
	const mlbam = MLBAM[key];
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
	players.set(key, {
		id: `mlbam-${mlbam}`,
		name: person.fullName,
		bats: person.batSide.code,
		eligiblePositions,
		pa,
		runs,
		rate: rateString(runs, pa)
	});
	console.log(
		`${key}: ${players.get(key).name} pa=${pa} runs=${runs} rate=${players.get(key).rate} elig=[${eligiblePositions.join(',')}]`
	);
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
	template(
		'bos26-vs-left',
		'Left-starter context · explicit 4 L / 12 R PA per slot',
		'L',
		4,
		4,
		12
	),
	template(
		'bos26-vs-right',
		'Right-starter context · explicit 6 L / 18 R PA per slot',
		'R',
		6,
		6,
		18
	)
];

function scenarioFor(def, memberKeys, assignments) {
	const byKey = (key) => players.get(key).id;
	return {
		id: def.id,
		revision: 1,
		authorId: 'storyline-adapter',
		label: def.label,
		memberIds: memberKeys.map(byKey),
		incomingIds: (def.incoming ?? []).map(byKey),
		outgoingIds: (def.outgoing ?? []).map(byKey),
		allocations: templates.map((t) => ({
			templateId: t.id,
			assignments: Object.entries(assignments).map(([order, key]) => ({
				order: Number(order),
				playerId: byKey(key)
			}))
		})),
		workloadCaps: memberKeys.map((key) => ({
			playerId: byKey(key),
			maxStarts: 10,
			maxDefensiveOuts: 300,
			maxPA: 200,
			sourceId: SPIKE_SOURCE_ID
		})),
		constraints: { rosterSizeMax: null, costBudget: null, costs: [] },
		review: {
			scope: 'coverage_and_offense',
			uncheckedTransactionRulesAcknowledgedAt: null,
			acknowledgedScenarioRevision: null
		}
	};
}

const outDir = join(
	dirname(fileURLToPath(import.meta.url)),
	'..',
	'..',
	'src',
	'lib',
	'storylines'
);
mkdirSync(outDir, { recursive: true });

for (const story of STORYLINES) {
	const assignmentsFor = (def) => ({ ...CORE, ...def.extra });
	// Guard the slot plan: every field assignment must hold an eligible
	// position under the threshold; DH is role-exempt.
	for (const def of story.scenarios) {
		const assignments = assignmentsFor(def);
		for (const [order, key] of Object.entries(assignments)) {
			const role = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'][Number(order) - 1];
			const player = players.get(key);
			if (role !== 'DH' && !player.eligiblePositions.includes(role)) {
				throw new Error(
					`slot plan drift (${story.slug}/${def.id}): ${player.name} eligible [${player.eligiblePositions.join(',')}], expected ${role}`
				);
			}
		}
		// Membership equation: candidates = (baseline members - outgoing) + incoming.
		if (def.id !== 'base') {
			const base = story.scenarios[0];
			const baseKeys = [...Object.values({ ...CORE, ...base.extra }), base.reserve].filter(
				(k) => k !== null
			);
			const want = new Set(baseKeys.filter((k) => !def.outgoing.includes(k)).concat(def.incoming));
			const got = new Set([...Object.values(assignments), def.reserve].filter((k) => k !== null));
			if (want.size !== got.size || [...want].some((k) => !got.has(k))) {
				throw new Error(`membership drift (${story.slug}/${def.id})`);
			}
		}
	}

	const bundle = {
		schemaVersion: '1.0',
		bundleId: story.bundleId,
		createdAt: FETCHED_AT,
		dataClass: 'public',
		sources: [
			{
				id: MLB_SOURCE_ID,
				title: 'MLB Stats API — 2026 regular-season observed totals',
				kind: 'projection',
				effectiveAt: `${AS_OF_DATE}T00:00:00Z`,
				note: `Free public endpoints (team 40-man roster, people, season hitting and fielding stats) for the configured Red Sox decision pool, observed through ${AS_OF_DATE}, fetched ${FETCHED_AT}. Eligibility aggregates fielding games by position across stints at >= 10 games (spike default, D-35); DH rows excluded. Use of page content acknowledges the MLBAM copyright notice. Rates are observed R/PA, not forward projections; splits unavailable.`
			},
			{
				id: SPIKE_SOURCE_ID,
				title: 'Storyline 10-game illustrative horizon',
				kind: 'manual',
				effectiveAt: `${AS_OF_DATE}T00:00:00Z`,
				note: 'Equal-share demand (40 PA per slot: 10 vs L, 30 vs R; 27 defensive outs per game). Not a team planning horizon. Workload caps are generous placeholders; real limits are TBD (O-02).'
			}
		],
		dataset: {
			id: 'mlbam-bos-2026',
			revision: SNAPSHOT_REVISION,
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
			id: 'storyline-horizon-10',
			revision: 1,
			authorId: 'storyline-adapter',
			horizonGames: 10,
			offenseMode: 'overall',
			metricDefinitionId: METRIC_ID,
			sourceId: SPIKE_SOURCE_ID,
			templates
		},
		comparison: {
			id: story.comparisonId,
			revision: 1,
			datasetRef: { id: 'mlbam-bos-2026', revision: SNAPSHOT_REVISION },
			assumptionRef: { id: 'storyline-horizon-10', revision: 1 },
			baseline: scenarioFor(
				story.scenarios[0],
				[...Object.values(assignmentsFor(story.scenarios[0])), story.scenarios[0].reserve].filter(
					(k) => k !== null
				),
				assignmentsFor(story.scenarios[0])
			),
			candidates: story.scenarios.slice(1).map((def) =>
				scenarioFor(
					def,
					[...Object.values(assignmentsFor(def)), def.reserve].filter((k) => k !== null),
					assignmentsFor(def)
				)
			)
		},
		results: []
	};

	const parsed = parseBundle(bundle);
	const digest = computeInputDigest(parsed);
	const calc = calculateComparison(parsed);
	const byId = new Map(calc.results.map((r) => [r.scenarioId, r]));
	const exp = story.expected;
	const failures = [];
	const baseRuns = byId.get('base')?.offense.runs;
	if (baseRuns !== exp.base) failures.push(`base offense ${baseRuns} != ${exp.base}`);
	if ((byId.get('cand-a')?.offense.runs ?? null) !== (exp['cand-a'] ?? null)) {
		failures.push(`cand-a offense ${byId.get('cand-a')?.offense.runs} != ${exp['cand-a']}`);
	}
	const deltaA = calc.offenseDeltas.find((d) => d.scenarioId === 'cand-a');
	if ((deltaA?.runs ?? null) !== (exp.deltaA ?? null)) {
		failures.push(`cand-a delta ${deltaA?.runs} != ${exp.deltaA}`);
	}
	if ('cand-b' in exp) {
		if ((byId.get('cand-b')?.offense.runs ?? null) !== exp['cand-b']) {
			failures.push(`cand-b offense ${byId.get('cand-b')?.offense.runs} != ${exp['cand-b']}`);
		}
		const deltaB = calc.offenseDeltas.find((d) => d.scenarioId === 'cand-b');
		if ((deltaB?.runs ?? null) !== (exp.deltaB ?? null)) {
			failures.push(`cand-b delta ${deltaB?.runs} != ${exp.deltaB}`);
		}
	}
	for (const result of calc.results) {
		if (result.feasibility !== 'feasible') failures.push(`${result.scenarioId} not feasible`);
		console.log(
			`${story.slug}/${result.scenarioId}: ${result.feasibility} offense=${result.offense.runs ?? result.offense.status}`
		);
	}
	if (failures.length > 0 && process.env.DATA_REFRESH !== '1')
		throw new Error(`hand-derived mismatch (${story.slug}): ${failures.join('; ')}`);
	if (failures.length > 0)
		console.warn(`refresh requires review (${story.slug}): ${failures.join('; ')}`);
	console.log(`${story.slug}: inputDigest=${digest}`);
	writeFileSync(join(outDir, `${story.slug}.json`), `${JSON.stringify(bundle, null, 2)}\n`);
}
console.log('wrote 5 storyline bundles');
