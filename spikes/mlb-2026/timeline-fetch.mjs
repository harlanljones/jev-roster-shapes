// Season-timeline snapshot fetcher (D-44). Pulls the raw public 2026 Red Sox
// record, starting lineups, dated rosters, and dated player totals from the
// free MLB Stats API (no key) into one reviewable JSON file. The timeline
// bundle builder reads only that file, so every dated storyline rebuilds
// offline and reproducibly from checked-in evidence.
// Run: bun spikes/mlb-2026/timeline-fetch.mjs
// Output: spikes/mlb-2026/timeline-snapshot.json
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const TEAM = 111;
const SEASON = 2026;
const SEASON_START = '2026-03-01';
const END_DATE = process.env.DATA_AS_OF ?? new Date().toISOString().slice(0, 10);
if (!/^\d{4}-\d{2}-\d{2}$/.test(END_DATE))
	throw new Error(`DATA_AS_OF must be YYYY-MM-DD, got ${END_DATE}`);
const FETCHED_AT = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
const API = 'https://statsapi.mlb.com/api/v1';

// Dated rosters: the day before Opening Day, entering July, the day before the
// deadline trades, and the snapshot day.
const ROSTER_DATES = ['2026-03-25', '2026-06-30', '2026-08-02', END_DATE];

// Hitting and fielding windows. `through-*` windows are what was known on a
// decision date; `from-*` windows are what happened afterward.
const WINDOWS = {
	'season-2025': { stats: 'season', season: 2025 },
	'through-2026-06-30': { start: SEASON_START, end: '2026-06-30' },
	'through-2026-08-02': { start: SEASON_START, end: '2026-08-02' },
	[`through-${END_DATE}`]: { start: SEASON_START, end: END_DATE },
	'from-2026-07-01': { start: '2026-07-01', end: END_DATE },
	'from-2026-08-03': { start: '2026-08-03', end: END_DATE }
};

// Players the storylines name even if they never start a game in the window.
const NAMED = {
	casas: 671213,
	narvaez: 665966,
	mayer: 691785,
	rogers: 668670,
	rutschman: 668939
};

async function getJson(url, attempt = 0) {
	const response = await fetch(url);
	if (!response.ok) {
		if (attempt < 3 && response.status >= 500) {
			await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
			return getJson(url, attempt + 1);
		}
		throw new Error(`GET ${url} -> ${response.status}`);
	}
	return response.json();
}

async function pool(items, size, fn) {
	const out = new Array(items.length);
	let next = 0;
	await Promise.all(
		Array.from({ length: size }, async () => {
			while (next < items.length) {
				const index = next++;
				out[index] = await fn(items[index]);
			}
		})
	);
	return out;
}

// ---- record and lineups ----
const schedule = await getJson(
	`${API}/schedule?sportId=1&teamId=${TEAM}&season=${SEASON}&gameType=R&startDate=${SEASON_START}&endDate=${END_DATE}`
);
const finals = schedule.dates
	.flatMap((day) => day.games)
	.filter(
		(game) => game.status?.abstractGameState === 'Final' && game.status?.codedGameState !== 'D'
	)
	.sort((a, b) => a.gameDate.localeCompare(b.gameDate));

const games = await pool(finals, 6, async (game) => {
	const box = await getJson(`${API}/game/${game.gamePk}/boxscore`);
	const home = box.teams.home.team.id === TEAM;
	const bos = home ? box.teams.home : box.teams.away;
	const opp = home ? box.teams.away : box.teams.home;
	const lineup = Object.values(bos.players)
		.filter((p) => typeof p.battingOrder === 'string' && p.battingOrder.endsWith('00'))
		.map((p) => ({
			order: Number(p.battingOrder) / 100,
			id: p.person.id,
			pos: p.allPositions?.[0]?.abbreviation ?? p.position?.abbreviation ?? null
		}))
		.sort((a, b) => a.order - b.order);
	const bosSide = home ? game.teams.home : game.teams.away;
	const oppSide = home ? game.teams.away : game.teams.home;
	return {
		gamePk: game.gamePk,
		date: game.officialDate,
		home,
		opponent: oppSide.team.id,
		runs: bosSide.score ?? null,
		oppRuns: oppSide.score ?? null,
		win: bosSide.isWinner === true,
		oppStarterId: opp.pitchers?.[0] ?? null,
		lineup
	};
});

// ---- dated rosters ----
const rosters = {};
for (const date of ROSTER_DATES) {
	const active = await getJson(`${API}/teams/${TEAM}/roster?rosterType=active&date=${date}`);
	const forty = await getJson(`${API}/teams/${TEAM}/roster?rosterType=40Man&date=${date}`);
	rosters[date] = {
		active: (active.roster ?? []).map((entry) => entry.person.id).sort((a, b) => a - b),
		fortyMan: (forty.roster ?? []).map((entry) => entry.person.id).sort((a, b) => a - b)
	};
}

// ---- people ----
const hitterIds = new Set(Object.values(NAMED));
for (const game of games) for (const slot of game.lineup) hitterIds.add(slot.id);
const pitcherIds = new Set(games.map((game) => game.oppStarterId).filter(Boolean));
const allPeople = [...hitterIds, ...pitcherIds];
const people = {};
for (let i = 0; i < allPeople.length; i += 50) {
	const batch = allPeople.slice(i, i + 50);
	const data = await getJson(`${API}/people?personIds=${batch.join(',')}`);
	for (const person of data.people ?? []) {
		people[person.id] = {
			name: person.fullName,
			bats: person.batSide?.code ?? null,
			throws: person.pitchHand?.code ?? null,
			primary: person.primaryPosition?.abbreviation ?? null
		};
	}
}
for (const game of games) game.oppStarterHand = people[game.oppStarterId]?.throws ?? null;

// ---- dated player totals ----
function statsUrl(id, group, window) {
	if (window.stats === 'season') {
		return `${API}/people/${id}/stats?stats=season&season=${window.season}&group=${group}`;
	}
	return `${API}/people/${id}/stats?stats=byDateRange&season=${SEASON}&group=${group}&startDate=${window.start}&endDate=${window.end}`;
}
const rows = (data) => data.stats?.[0]?.splits ?? [];
const hitting = {};
const fielding = {};
// Season platoon splits (OPS by pitcher hand) for the display layer only; OPS
// is not an additive run measure and never enters a bundle (D-42, D-43).
const splits = {};
await pool([...hitterIds], 4, async (id) => {
	hitting[id] = {};
	fielding[id] = {};
	for (const [key, window] of Object.entries(WINDOWS)) {
		hitting[id][key] = rows(await getJson(statsUrl(id, 'hitting', window))).map((split) => ({
			team: split.team?.id ?? null,
			pa: split.stat.plateAppearances ?? 0,
			runs: split.stat.runs ?? 0,
			games: split.stat.gamesPlayed ?? 0
		}));
		// byDateRange fielding rows carry no position, so dated eligibility
		// comes from the snapshot's own starting lineups instead.
		if (window.stats !== 'season') continue;
		fielding[id][key] = rows(await getJson(statsUrl(id, 'fielding', window))).map((split) => ({
			team: split.team?.id ?? null,
			pos: split.position?.abbreviation ?? null,
			games: split.stat.games ?? 0,
			gamesStarted: split.stat.gamesStarted ?? 0
		}));
	}
	const splitRows = rows(
		await getJson(
			`${API}/people/${id}/stats?stats=statSplits&group=hitting&season=${SEASON}&sitCodes=vl,vr`
		)
	);
	splits[id] = splitRows.map((split) => ({
		code: split.split?.code ?? null,
		team: split.team?.id ?? null,
		pa: split.stat.plateAppearances ?? 0,
		ops: split.stat.ops ?? null
	}));
});

const sortKeys = (object) =>
	Object.fromEntries(Object.entries(object).sort(([a], [b]) => Number(a) - Number(b)));
const snapshot = {
	source: 'MLB Stats API (statsapi.mlb.com), free public endpoints; MLBAM copyright applies',
	team: TEAM,
	season: SEASON,
	asOf: END_DATE,
	fetchedAt: FETCHED_AT,
	windows: WINDOWS,
	games,
	rosters,
	people: sortKeys(people),
	hitting: sortKeys(hitting),
	fielding: sortKeys(fielding),
	splits: sortKeys(splits)
};
const out = join(dirname(fileURLToPath(import.meta.url)), 'timeline-snapshot.json');
writeFileSync(out, `${JSON.stringify(snapshot, null, '\t')}\n`);
const wins = games.filter((game) => game.win).length;
console.log(
	`games=${games.length} record=${wins}-${games.length - wins} hitters=${hitterIds.size} pitchers=${pitcherIds.size} -> ${out}`
);
