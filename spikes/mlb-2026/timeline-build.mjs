// Season-timeline storyline builder (D-44). Reads only the checked-in
// snapshot from timeline-fetch.mjs, so it runs offline and reproducibly.
// Each storyline is pinned to a date on the 2026 season and scores its
// baseline and two candidates with what was known on that date: observed
// runs per PA through the decision date (2025 season totals for the preseason
// questions) and position eligibility from the same data. Every bundle is
// validated with the frozen contract validator and run through the
// deterministic engine before it is written.
// Run: bun spikes/mlb-2026/timeline-build.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { calculateComparison } from '../../src/lib/engine/calculation.ts';
import { computeInputDigest, parseBundle } from '../../src/lib/contracts/bundle.ts';
import { seasonAsOf as seasonAsOfClamp } from './lib/timeline-plan.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const snapshot = JSON.parse(readFileSync(join(here, 'timeline-snapshot.json'), 'utf8'));
const outDir = join(here, '..', '..', 'src', 'lib', 'storylines');

const SOURCE_ID = 'mlb-stats-api-2026';
const ASSUMPTION_SOURCE_ID = 'storyline-assumptions';
const PROJECTION_SOURCE_ID = 'storyline-projection-2027';
const ROLES = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];
const FIELD = ROLES.slice(0, 8);
// D-35 rule, adapted to dated data: a position counts at >= 10 fielding games
// in 2025, or >= 10 starts there for Boston in 2026 through the decision date
// (the API's date-range fielding rows carry no position). A position the
// player started at least three times in the storyline's observed lineup
// window also counts, so the club's real lineups are always representable.
const ELIGIBILITY_MIN_GAMES = 10;
const OBSERVED_MIN_STARTS = 3;

// Named players (MLBAM IDs).
const P = {
	bregman: 608324,
	arozarena: 668227,
	lowe: 664040,
	rutschman: 668939,
	wong: 657136,
	narvaez: 665966,
	rogers: 668670,
	contreras: 575929,
	casas: 671213,
	sogard: 686765,
	ikf: 643396,
	monasterio: 655316,
	mayer: 691785,
	seigler: 678011,
	durbin: 702332,
	story: 596115,
	anthony: 701350,
	rafaela: 678882,
	abreu: 677800,
	duran: 680776,
	yoshida: 807799,
	gasper: 681508,
	jones: 663330,
	mead: 678554,
	eaton: 681987
};

// The season display follows the snapshot day in-season and clamps to the
// regular-season close once October games can no longer change a
// regular-season rate, so its label never claims data its rows do not have
// (D-54).
const seasonAsOf = seasonAsOfClamp(snapshot.asOf);
// The Wild Card pin is anchored to the last day of the regular season so a
// later daily refresh cannot drag its "regular season" rates past it.
const SEASON_END = '2026-09-27';
const lineup = (entries) => entries;
const same = (l) => ({ L: l, R: l });

// Lineups name the player at each role. `L` and `R` are the two pitcher-hand
// templates. Baselines are the club's observed lineups (see `observed`).
// Opening Day (March 26, vs LHP) and the first game against a right-hander
// (March 28): Kiner-Falefa started at second against the lefty, Mayer against
// righties; Anthony in left and Duran at DH both days.
const openingDay = lineup({
	C: 'narvaez',
	'1B': 'contreras',
	'2B': 'mayer',
	'3B': 'durbin',
	SS: 'story',
	LF: 'anthony',
	CF: 'rafaela',
	RF: 'abreu',
	DH: 'duran'
});
const openingDayLineups = { L: { ...openingDay, '2B': 'ikf' }, R: openingDay };
const both = (lineups, change) => ({
	L: { ...lineups.L, ...change },
	R: { ...lineups.R, ...change }
});
const juneRegulars = lineup({
	C: 'narvaez',
	'1B': 'contreras',
	'2B': 'seigler',
	'3B': 'durbin',
	SS: 'mayer',
	LF: 'duran',
	CF: 'rafaela',
	RF: 'abreu',
	DH: 'yoshida'
});
const deadlineRegulars = lineup({
	C: 'wong',
	'1B': 'contreras',
	'2B': 'seigler',
	'3B': 'durbin',
	SS: 'monasterio',
	LF: 'duran',
	CF: 'rafaela',
	RF: 'abreu',
	DH: 'yoshida'
});
// The Wild Card lineups (D-49, updated September 29): with Contreras cleared
// to return at first base, Tracy's plan for Game 1 against Schlittler (RHP) is
// the lineup reported that day: Anthony at DH, Duran in left, Sogard at
// second. Against Fried (LHP) Contreras takes first from Sogard in the
// September 22–23 lineup, with Monasterio at second and Jones at DH.
const wildCardVsLeft = lineup({
	C: 'rutschman',
	'1B': 'contreras',
	'2B': 'monasterio',
	'3B': 'durbin',
	SS: 'story',
	LF: 'anthony',
	CF: 'rafaela',
	RF: 'abreu',
	DH: 'jones'
});
const wildCardVsRight = lineup({
	C: 'rutschman',
	'1B': 'contreras',
	'2B': 'sogard',
	'3B': 'durbin',
	SS: 'story',
	LF: 'duran',
	CF: 'rafaela',
	RF: 'abreu',
	DH: 'anthony'
});
// If Contreras cannot swing after all: the September 25 lineups, Sogard at
// first and Kiner-Falefa at second against righties.
const noContrerasVsLeft = { ...wildCardVsLeft, '1B': 'sogard' };
const noContrerasVsRight = { ...wildCardVsRight, '1B': 'sogard', '2B': 'ikf' };

// The projected 2027 club as Boston reporting describes it in early October
// 2026 (D-56): Rutschman behind the plate, Contreras at first, Mead penciled
// in at second ("broadly our plan", Chad Tracy via The Boston Globe), Durbin
// at third, Story at short with Franklin Arias waiting, and Anthony in left
// every day with Rafaela and Abreu alongside him. The DH is the unsettled
// spot, so it stays with the club's own September usage: Yoshida against
// right-handers, Jones against left-handers. The projection is a judgment
// applied to all three winter pins; the rates stay decision-date.
const projectedVsRight = lineup({
	C: 'rutschman',
	'1B': 'contreras',
	'2B': 'mead',
	'3B': 'durbin',
	SS: 'story',
	LF: 'anthony',
	CF: 'rafaela',
	RF: 'abreu',
	DH: 'yoshida'
});
const projectedVsLeft = { ...projectedVsRight, DH: 'jones' };
const projectedLineups = { L: projectedVsLeft, R: projectedVsRight };
// Every projected starter is locked into the searched best nine (D-56), so a
// hot small sample cannot bench him. Reporting calls catcher, first, third,
// left, center and right settled; Anthony only has to be in the lineup, not a
// fixed slot, because a signing or a platoon can move him to DH. Mead is
// locked at second wherever the projection holds.
const settledLocks = [
	{ key: 'rutschman', role: 'C' },
	{ key: 'contreras', role: '1B' },
	{ key: 'durbin', role: '3B' },
	{ key: 'anthony', role: null },
	{ key: 'rafaela', role: 'CF' },
	{ key: 'abreu', role: 'RF' }
];
const projectedLocks = [...settledLocks, { key: 'mead', role: '2B' }];
const projectedLocksMeadOpen = [...settledLocks, { key: 'mead', role: null }];
// The projection keeps Story at short until Arias takes it, so scenarios whose
// lineup does that lock him there; the succession scenarios leave short open.
const storyAtShort = { key: 'story', role: 'SS' };
const winterReserves = ['wong', 'sogard', 'monasterio', 'seigler', 'duran'];

const TIMELINE = [
	{
		slug: 'offseason-infield',
		bundleId: 'mlbam-bos-2026-offseason-infield',
		asOf: '2026-03-25',
		rates: 'season-2025',
		observed: ['2026-03-26', '2026-04-08'],
		rateLabel: '2025 season',
		scenarios: [
			{
				id: 'base',
				label: 'Baseline — The infield Boston built: Contreras, Durbin, Mayer and Kiner-Falefa',
				lineups: openingDayLineups,
				reserves: ['monasterio']
			},
			{
				id: 'cand-a',
				label: 'A — Bregman re-signs: Bregman at third, Durbin at second',
				lineups: both(openingDayLineups, { '2B': 'durbin', '3B': 'bregman' }),
				reserves: ['mayer', 'ikf', 'monasterio'],
				incoming: ['bregman']
			},
			{
				id: 'cand-b',
				label: 'B — No Contreras trade: Casas at first',
				lineups: both(openingDayLineups, { '1B': 'casas' }),
				reserves: ['monasterio'],
				incoming: ['casas'],
				outgoing: ['contreras']
			}
		]
	},
	{
		slug: 'opening-day-outfield',
		bundleId: 'mlbam-bos-2026-opening-day-outfield',
		asOf: '2026-03-25',
		rates: 'season-2025',
		observed: ['2026-03-26', '2026-04-08'],
		rateLabel: '2025 season',
		scenarios: [
			{
				id: 'base',
				label: 'Baseline — Opening Day: Anthony in left, Duran at DH, Yoshida on the bench',
				lineups: openingDayLineups,
				reserves: ['yoshida']
			},
			{
				id: 'cand-a',
				label: 'A — Yoshida DHs against righties, Duran to left, Anthony sits',
				lineups: {
					L: openingDayLineups.L,
					R: { ...openingDayLineups.R, LF: 'duran', DH: 'yoshida' }
				},
				reserves: []
			},
			{
				id: 'cand-b',
				label: 'B — Trade Duran over the winter: Yoshida at DH',
				lineups: both(openingDayLineups, { DH: 'yoshida' }),
				reserves: [],
				outgoing: ['duran']
			}
		]
	},
	{
		slug: 'july-run',
		bundleId: 'mlbam-bos-2026-july-run',
		asOf: '2026-06-30',
		rates: 'through-2026-06-30',
		observed: ['2026-06-01', '2026-07-31'],
		rateLabel: '2026 through June 30',
		scenarios: [
			{
				id: 'base',
				label: 'Baseline — June regulars',
				lineups: same(juneRegulars),
				reserves: ['wong', 'monasterio']
			},
			{
				id: 'cand-a',
				label: 'A — July regulars: Wong catches, Monasterio at short',
				lineups: same({ ...juneRegulars, C: 'wong', SS: 'monasterio' }),
				reserves: ['narvaez', 'mayer']
			},
			{
				id: 'cand-b',
				label: 'B — June lineup with Wong catching',
				lineups: same({ ...juneRegulars, C: 'wong' }),
				reserves: ['narvaez', 'monasterio']
			}
		]
	},
	{
		slug: 'deadline',
		bundleId: 'mlbam-bos-2026-deadline',
		asOf: '2026-08-02',
		rates: 'through-2026-08-02',
		observed: ['2026-07-20', '2026-08-02'],
		rateLabel: '2026 through August 2',
		// Mayer was on the injured list at the deadline (last Boston start
		// June 25), so he is off the API's 40-man list and has no starts in the
		// window; he was still Boston's to trade or keep.
		injured: ['mayer'],
		scenarios: [
			{
				id: 'base',
				label: 'Baseline — Stand pat: Wong catches, Seigler at second, Mayer stays',
				lineups: same(deadlineRegulars),
				reserves: ['narvaez', 'mayer']
			},
			{
				id: 'cand-a',
				label: 'A — The trades: Rutschman in, Narváez and Mayer out',
				lineups: same({ ...deadlineRegulars, C: 'rutschman' }),
				reserves: ['wong', 'rogers'],
				incoming: ['rutschman', 'rogers'],
				outgoing: ['narvaez', 'mayer']
			},
			{
				id: 'cand-b',
				label: 'B — Rutschman in, keep Mayer at second',
				lineups: same({ ...deadlineRegulars, C: 'rutschman', '2B': 'mayer' }),
				reserves: ['wong', 'rogers', 'seigler'],
				incoming: ['rutschman', 'rogers'],
				outgoing: ['narvaez']
			}
		]
	},
	{
		slug: 'wild-card-roster',
		bundleId: 'mlbam-bos-2026-wild-card-roster',
		asOf: SEASON_END,
		rates: `through-${SEASON_END}`,
		observed: ['2026-09-11', SEASON_END],
		rateLabel: `2026 through ${SEASON_END}`,
		// Boston's 2025 Wild Card roster carried 14 position players and 12
		// pitchers; the same limit applies to every scenario here. Gasper is on
		// the injured list and Mead did not travel (September 27), so neither is
		// on any roster; Eaton takes the last spot as the extra outfielder.
		rosterSizeMax: 14,
		scenarios: [
			{
				id: 'base',
				label: 'Baseline — Contreras back at first, Sogard to second vs RHP',
				lineups: { L: wildCardVsLeft, R: wildCardVsRight },
				reserves: ['wong', 'ikf', 'eaton']
			},
			{
				id: 'cand-a',
				label: 'A — Contreras only DHs: Sogard at first, Duran sits vs RHP',
				lineups: {
					// Against the lefty this is the September 27 finale lineup.
					L: { ...wildCardVsLeft, '1B': 'monasterio', '2B': 'sogard', DH: 'contreras' },
					R: { ...noContrerasVsRight, LF: 'anthony', DH: 'contreras' }
				},
				reserves: ['wong', 'eaton', 'duran', 'jones']
			},
			{
				id: 'cand-b',
				label: 'B — Contreras can’t swing: carry him, Sogard plays first',
				lineups: { L: noContrerasVsLeft, R: noContrerasVsRight },
				reserves: ['contreras', 'wong', 'eaton']
			}
		]
	},
	{
		slug: 'winter-infield',
		bundleId: 'mlbam-bos-2026-winter-infield',
		asOf: SEASON_END,
		rates: 'through-2026-09-27',
		observed: ['2026-08-03', SEASON_END],
		rateLabel: '2026 through 2026-09-27',
		projected: true,
		scenarios: [
			{
				id: 'base',
				label: 'Baseline — The projected 2027 infield: Story at short, Mead at second',
				lineups: projectedLineups,
				reserves: winterReserves,
				projectedStarters: [...projectedLocks, storyAtShort]
			},
			{
				id: 'cand-a',
				label: 'A — Arias takes short: Story moves to DH',
				lineups: both(projectedLineups, { SS: 'monasterio', DH: 'story' }),
				reserves: ['wong', 'sogard', 'seigler', 'duran', 'jones', 'yoshida'],
				projectedStarters: projectedLocks
			},
			{
				id: 'cand-b',
				label: 'B — Arias takes short: Story to the bench',
				lineups: both(projectedLineups, { SS: 'monasterio' }),
				reserves: ['wong', 'sogard', 'seigler', 'duran', 'story'],
				projectedStarters: projectedLocks
			}
		]
	},
	{
		slug: 'winter-duran',
		bundleId: 'mlbam-bos-2026-winter-duran',
		asOf: SEASON_END,
		rates: 'through-2026-09-27',
		observed: ['2026-08-03', SEASON_END],
		rateLabel: '2026 through 2026-09-27',
		projected: true,
		scenarios: [
			{
				id: 'base',
				label: 'Baseline — The projected outfield: Anthony, Rafaela and Abreu, with Duran fourth',
				lineups: projectedLineups,
				reserves: winterReserves,
				projectedStarters: [...projectedLocks, storyAtShort]
			},
			{
				id: 'cand-a',
				label: 'A — Trade him: the projected nine does not change',
				lineups: projectedLineups,
				reserves: ['wong', 'sogard', 'monasterio', 'seigler'],
				outgoing: ['duran'],
				incoming: [],
				projectedStarters: [...projectedLocks, storyAtShort]
			},
			{
				id: 'cand-b',
				label: 'B — Keep him: start him at DH against right-handers',
				lineups: {
					L: projectedVsLeft,
					R: { ...projectedVsRight, DH: 'duran' }
				},
				reserves: ['wong', 'sogard', 'monasterio', 'seigler', 'yoshida'],
				outgoing: [],
				incoming: [],
				projectedStarters: [...projectedLocks, storyAtShort]
			}
		]
	},
	{
		slug: 'winter-bat',
		bundleId: 'mlbam-bos-2026-winter-bat',
		asOf: SEASON_END,
		rates: 'through-2026-09-27',
		observed: ['2026-08-03', SEASON_END],
		rateLabel: '2026 through 2026-09-27',
		projected: true,
		scenarios: [
			{
				id: 'base',
				label: 'Baseline — The projected 2027 lineup: Yoshida and Jones at DH, no outside bat',
				lineups: projectedLineups,
				reserves: winterReserves,
				projectedStarters: [...projectedLocks, storyAtShort]
			},
			{
				id: 'cand-a',
				label: 'A — Sign Arozarena: Anthony moves to DH',
				lineups: both(projectedLineups, { LF: 'arozarena', DH: 'anthony' }),
				reserves: ['wong', 'sogard', 'monasterio', 'seigler', 'jones', 'yoshida'],
				outgoing: ['duran'],
				incoming: ['arozarena'],
				projectedStarters: [...projectedLocks, storyAtShort, { key: 'arozarena', role: null }]
			},
			{
				id: 'cand-b',
				label: 'B — Sign Lowe: Mead moves to DH',
				lineups: {
					L: projectedVsLeft,
					R: { ...projectedVsRight, '2B': 'lowe', DH: 'mead' }
				},
				reserves: ['wong', 'monasterio', 'seigler', 'yoshida', 'duran'],
				outgoing: ['sogard'],
				incoming: ['lowe'],
				projectedStarters: [...projectedLocksMeadOpen, storyAtShort]
			}
		]
	}
];

// ---- snapshot readers ----
function rowsFor(table, id, windowKey) {
	const rows = snapshot[table][String(id)]?.[windowKey];
	if (!rows) throw new Error(`snapshot has no ${table} ${windowKey} for ${id}`);
	return rows;
}
// Traded players get one row per team plus a combined row without a team;
// use the combined row when present so nothing is counted twice.
function hittingTotal(id, windowKey) {
	// byDateRange can repeat the same row; count each distinct row once.
	const rows = [
		...new Set(rowsFor('hitting', id, windowKey).map((row) => JSON.stringify(row)))
	].map((row) => JSON.parse(row));
	const combined = rows.filter((row) => row.team === null);
	const use = combined.length > 0 ? combined : rows;
	return use.reduce((sum, row) => ({ pa: sum.pa + row.pa, runs: sum.runs + row.runs }), {
		pa: 0,
		runs: 0
	});
}
function gamesByPosition(id, windowKey) {
	const byPos = new Map();
	for (const row of rowsFor('fielding', id, windowKey)) {
		if (!FIELD.includes(row.pos)) continue;
		const entry = byPos.get(row.pos) ?? { combined: null, teams: 0 };
		if (row.team === null) entry.combined = row.games;
		else entry.teams += row.games;
		byPos.set(row.pos, entry);
	}
	return new Map([...byPos].map(([pos, e]) => [pos, e.combined ?? e.teams]));
}
function observedStarts(id, start, end) {
	const starts = new Map();
	for (const game of snapshot.games) {
		if (game.date < start || game.date > end) continue;
		for (const slot of game.lineup) {
			if (slot.id === id && FIELD.includes(slot.pos)) {
				starts.set(slot.pos, (starts.get(slot.pos) ?? 0) + 1);
			}
		}
	}
	return starts;
}
function rateString(runs, pa) {
	if (pa === 0) return null;
	return (Math.round((runs * 1_000_000) / pa) / 1_000_000).toFixed(6);
}

// ---- shared assumptions (D-42 pattern, unchanged) ----
function template(id, label, starterHand, games) {
	return {
		id,
		label,
		starterHand,
		games,
		defensiveOutsPerGame: 27,
		slots: ROLES.map((role, index) => {
			const totalPA = games * (index < 3 ? 5 : 4);
			const leftHandedPA = Math.round(totalPA * 0.25);
			return {
				order: index + 1,
				role,
				paByPitcherHand: { L: leftHandedPA, R: totalPA - leftHandedPA, unknown: 0 }
			};
		})
	};
}
const templates = [
	template('bos26-vs-left', 'Left-starter context · 4 games', 'L', 4),
	template('bos26-vs-right', 'Right-starter context · 6 games', 'R', 6)
];

const results = [];
for (const story of TIMELINE) {
	const keysIn = (def) => [
		...new Set([...Object.values(def.lineups.L), ...Object.values(def.lineups.R), ...def.reserves])
	];
	const allKeys = [...new Set(story.scenarios.flatMap(keysIn))];
	const players = new Map();
	for (const key of allKeys) {
		const mlbam = P[key];
		if (!mlbam) throw new Error(`unknown player key ${key}`);
		const person = snapshot.people[String(mlbam)];
		if (!person) throw new Error(`snapshot has no person ${mlbam} (${key})`);
		const { pa, runs } = hittingTotal(mlbam, story.rates);
		const eligible = new Set();
		for (const [pos, games] of gamesByPosition(mlbam, 'season-2025')) {
			if (games >= ELIGIBILITY_MIN_GAMES) eligible.add(pos);
		}
		for (const [pos, starts] of observedStarts(mlbam, '2026-03-01', story.asOf)) {
			if (starts >= ELIGIBILITY_MIN_GAMES) eligible.add(pos);
		}
		for (const [pos, starts] of observedStarts(mlbam, ...story.observed)) {
			if (starts >= OBSERVED_MIN_STARTS) eligible.add(pos);
		}
		players.set(key, {
			id: `mlbam-${mlbam}`,
			name: person.name,
			bats: person.bats,
			eligiblePositions: FIELD.filter((pos) => eligible.has(pos)),
			pa,
			runs,
			rate: rateString(runs, pa)
		});
	}

	story.playerIds = allKeys.map((key) => P[key]);
	const baseDef = story.scenarios[0];
	const baseMembers = keysIn(baseDef);
	// The baseline is who Boston actually had: every member must be on the
	// 40-man roster on the decision date or have started for Boston in the
	// pin's observed window. (The API's August 2 roster already omits Narváez,
	// who started that day; the start counts.) Only candidates bring players in.
	const fortyMan = snapshot.rosters[story.asOf]?.fortyMan;
	if (!fortyMan) throw new Error(`snapshot has no roster for ${story.asOf} (${story.slug})`);
	for (const key of baseMembers) {
		const injured = (story.injured ?? []).includes(key);
		if (
			!injured &&
			!fortyMan.includes(P[key]) &&
			observedStarts(P[key], ...story.observed).size === 0
		) {
			throw new Error(
				`${story.slug}: ${key} is neither on the ${story.asOf} 40-man roster nor a starter in ${story.observed.join('..')}`
			);
		}
	}
	for (const def of story.scenarios) {
		for (const hand of ['L', 'R']) {
			const used = new Set();
			for (const role of ROLES) {
				const key = def.lineups[hand][role];
				if (used.has(key)) throw new Error(`${story.slug}/${def.id}/${hand}: ${key} twice`);
				used.add(key);
				const player = players.get(key);
				if (role !== 'DH' && !player.eligiblePositions.includes(role)) {
					throw new Error(
						`${story.slug}/${def.id}/${hand}: ${player.name} is not eligible at ${role} [${player.eligiblePositions.join(',')}]`
					);
				}
			}
		}
		if (def.id !== 'base') {
			const want = new Set(
				baseMembers.filter((k) => !(def.outgoing ?? []).includes(k)).concat(def.incoming ?? [])
			);
			const got = new Set(keysIn(def));
			if (want.size !== got.size || [...want].some((k) => !got.has(k))) {
				throw new Error(
					`membership drift (${story.slug}/${def.id}): want [${[...want]}] got [${[...got]}]`
				);
			}
		}
	}

	const metricId =
		story.rates === 'season-2025'
			? 'mlbam-observed-r-per-pa-2025'
			: `mlbam-observed-r-per-pa-${story.rates}`;
	const datasetId = `mlbam-bos-asof-${story.asOf}`;
	const datasetRevision = Number(story.asOf.replaceAll('-', ''));
	const assumptionId = 'storyline-horizon-10';
	// The projected winter pins revise the baseline assumption (D-56), so they
	// carry a new revision; every other pin keeps revision 2.
	const assumptionRevision = story.projected ? 3 : 2;
	const byKey = (key) => players.get(key).id;
	const scenarioFor = (def) => {
		const members = keysIn(def);
		return {
			id: def.id,
			revision: 1,
			authorId: 'storyline-adapter',
			label: def.label,
			memberIds: members.map(byKey),
			incomingIds: (def.incoming ?? []).map(byKey),
			outgoingIds: (def.outgoing ?? []).map(byKey),
			allocations: templates.map((t) => ({
				templateId: t.id,
				assignments: ROLES.map((role, index) => ({
					order: index + 1,
					playerId: byKey(def.lineups[t.starterHand][role])
				}))
			})),
			workloadCaps: members.map((key) => ({
				playerId: byKey(key),
				maxStarts: 10,
				maxDefensiveOuts: 300,
				maxPA: 200,
				sourceId: ASSUMPTION_SOURCE_ID
			})),
			...(def.projectedStarters
				? {
						projectedStarters: def.projectedStarters.map(({ key, role }) => ({
							playerId: byKey(key),
							role,
							sourceId: PROJECTION_SOURCE_ID
						}))
					}
				: {}),
			constraints: { rosterSizeMax: story.rosterSizeMax ?? null, costBudget: null, costs: [] },
			review: {
				scope: 'coverage_and_offense',
				uncheckedTransactionRulesAcknowledgedAt: null,
				acknowledgedScenarioRevision: null
			}
		};
	};

	const windowNote =
		story.rates === 'season-2025'
			? 'observed 2025 regular-season totals (what was known before Opening Day)'
			: `observed 2026 regular-season totals from ${snapshot.windows[story.rates].start} through ${snapshot.windows[story.rates].end} (what was known on the decision date)`;
	const bundle = {
		schemaVersion: '1.0',
		bundleId: story.bundleId,
		createdAt: snapshot.fetchedAt,
		dataClass: 'public',
		sources: [
			{
				id: SOURCE_ID,
				title: `MLB Stats API — Red Sox season-timeline snapshot, as of ${story.asOf}`,
				kind: 'projection',
				effectiveAt: `${story.asOf}T00:00:00Z`,
				note: `Free public endpoints, fetched ${snapshot.fetchedAt} into spikes/mlb-2026/timeline-snapshot.json. Rates are ${windowNote}; for traded players the combined all-teams row is used. Eligibility: >= ${ELIGIBILITY_MIN_GAMES} fielding games at a position in 2025 or >= ${ELIGIBILITY_MIN_GAMES} Boston starts there in 2026 through ${story.asOf} (D-35 rule, adapted), or >= ${OBSERVED_MIN_STARTS} starts there in Boston's starting lineups from ${story.observed[0]} to ${story.observed[1]}; DH excluded. Boston starts only: a traded player's starts for another club do not count toward the 2026 rule. Use of page content acknowledges the MLBAM copyright notice. Rates are observed R/PA, not forward projections; splits unavailable.`
			},
			{
				id: ASSUMPTION_SOURCE_ID,
				title: 'Observed batting-order pattern · illustrative 10-game allocation',
				kind: 'manual',
				effectiveAt: `${story.asOf}T00:00:00Z`,
				note: `PA demand is scaled from one observed nine-inning Boston–Pittsburgh game on 2026-08-14: 39 PA across the nine starting slots (5 each for batting orders 1–3; 4 each for orders 4–9). Applied to four left-starter-context games and six right-starter-context games: top three slots receive 20/30 PA per context; remaining slots receive 16/24. L/R exposure is an illustrative 25/75 split assumption, not measured context data. This is not a team planning horizon or forecast. Workload caps remain generous placeholders (O-02). ${
					story.projected
						? 'Baseline and scenario lineups are the projected 2027 roster (see the projected-roster source), not the club’s observed September shape.'
						: 'Baseline lineups are the club’s observed starting lineups for the storyline’s window.'
				} Source box score: https://www.baseball-almanac.com/box-scores/boxscore.php?boxid=202608140PIT`
			},
			...(story.projected
				? [
						{
							id: PROJECTION_SOURCE_ID,
							title: 'Projected 2027 roster — Boston reporting, October 1–6, 2026',
							kind: 'projection',
							effectiveAt: '2026-10-06T00:00:00Z',
							note: 'The baseline and every scenario lineup are the projected 2027 roster: a judgment recorded from early-October reporting, applied to all three winter pins while the rates stay decision-date. Chad Tracy, via Tim Healey (The Boston Globe, October 5–6; MLB Trade Rumors and CBS Sports, October 6): it is “broadly (the) plan” for Curtis Mead to get the majority of the second-base work — “he was acquired for a reason.” Sports Illustrated (October 1): with Anthony in left, Rafaela in center, Abreu in right, Contreras at first, Durbin at third and Rutschman behind the plate, shortstop, second base and the DH are the open spots; internally Boston can play Arias at short with Mead at second and Story at DH, or Story at short with Arias at second and Mead at DH. Yahoo Sports’ projected roster (October 2) lists Mead/Sogard at second and Story/Arias at short. Rutschman catching, Anthony starting and Mead at second are locked into every searched lineup so a hot small sample cannot bench them (D-56). The DH stays with the club’s September usage: Yoshida against right-handers, Jones against left-handers. Franklin Arias is named but not scored — he has no major-league plate appearance (MLB Stats API, people/808265) — so Monasterio stands in at short in the succession scenarios. Rates remain observed 2026 R/PA through September 27.'
						}
					]
				: [])
		],
		dataset: {
			id: datasetId,
			revision: datasetRevision,
			sourceIds: [SOURCE_ID],
			players: [...players.values()].map((player) => ({
				id: player.id,
				name: player.name,
				bats: player.bats,
				eligiblePositions: player.eligiblePositions,
				sourceIds: [SOURCE_ID]
			})),
			metricDefinitions: [
				{
					id: metricId,
					unit: 'runs_per_PA',
					referenceBaseline: `observed MLB regular-season R/PA, ${story.rateLabel} (all teams)`,
					sourceId: SOURCE_ID,
					note: 'Derived rate R/PA rounded to six decimals per SPEC 5.3; documented conversion, not a published projection. Missing splits remain null.'
				}
			],
			projections: [...players.values()].map((player) => ({
				playerId: player.id,
				metricDefinitionId: metricId,
				overall: player.rate,
				vsL: null,
				vsR: null,
				sourceId: SOURCE_ID
			}))
		},
		assumptions: {
			id: assumptionId,
			revision: assumptionRevision,
			authorId: 'storyline-adapter',
			horizonGames: 10,
			offenseMode: 'overall',
			metricDefinitionId: metricId,
			sourceId: ASSUMPTION_SOURCE_ID,
			templates
		},
		comparison: {
			id: `cmp-${story.slug}`,
			revision: 1,
			datasetRef: { id: datasetId, revision: datasetRevision },
			assumptionRef: { id: assumptionId, revision: assumptionRevision },
			baseline: scenarioFor(baseDef),
			candidates: story.scenarios.slice(1).map(scenarioFor)
		},
		results: []
	};

	const parsed = parseBundle(bundle);
	const digest = computeInputDigest(parsed);
	const calc = calculateComparison(parsed);
	for (const player of players.values()) {
		console.log(
			`  ${story.slug} ${player.name}: pa=${player.pa} runs=${player.runs} rate=${player.rate} elig=[${player.eligiblePositions.join(',')}]`
		);
	}
	for (const result of calc.results) {
		const delta = calc.offenseDeltas.find((d) => d.scenarioId === result.scenarioId)?.runs;
		if (result.feasibility !== 'feasible') {
			throw new Error(`${story.slug}/${result.scenarioId} is ${result.feasibility}`);
		}
		if (story.rosterSizeMax && result.constraints.rosterSize.status !== 'passed') {
			throw new Error(`${story.slug}/${result.scenarioId} breaks the roster limit`);
		}
		console.log(
			`${story.slug}/${result.scenarioId}: ${result.feasibility} offense=${result.offense.runs ?? result.offense.status} delta=${delta ?? 'n/a'}`
		);
		results.push({ slug: story.slug, scenarioId: result.scenarioId, runs: result.offense.runs });
	}
	console.log(`${story.slug}: inputDigest=${digest}`);
	writeFileSync(join(outDir, `${story.slug}.json`), `${JSON.stringify(bundle, null, '\t')}\n`);
}
// Season evidence for the display layer (D-43, D-44): the game-by-game record
// for the timeline, and each storyline player's 2026 season-to-date PA, runs,
// and platoon splits for the Shape Case. It never enters a bundle, a digest,
// or the engine.
const seasonPlayers = {};
for (const mlbam of [...new Set(TIMELINE.flatMap((story) => story.playerIds))].sort(
	(a, b) => a - b
)) {
	const total = hittingTotal(mlbam, `through-${seasonAsOf}`);
	const rows = snapshot.splits[String(mlbam)] ?? [];
	const side = (code) => {
		const matching = rows.filter((row) => row.code === code);
		const row =
			matching.find((r) => r.team === null) ?? (matching.length === 1 ? matching[0] : null);
		return row && row.pa > 0 && row.ops ? { pa: row.pa, ops: row.ops } : null;
	};
	const vL = side('vl');
	const vR = side('vr');
	seasonPlayers[`mlbam-${mlbam}`] = {
		name: snapshot.people[String(mlbam)].name,
		pa: total.pa,
		runs: total.runs,
		split: vL && vR ? { vL, vR } : null
	};
}
const season = {
	source: snapshot.source,
	asOf: seasonAsOf,
	fetchedAt: snapshot.fetchedAt,
	record: snapshot.games.map((game) => ({
		date: game.date,
		win: game.win,
		runs: game.runs,
		oppRuns: game.oppRuns
	})),
	players: seasonPlayers
};
writeFileSync(join(outDir, 'season.json'), `${JSON.stringify(season, null, '\t')}\n`);
console.log(
	`wrote ${TIMELINE.length} storyline bundles and season.json from the ${seasonAsOf} snapshot`
);
