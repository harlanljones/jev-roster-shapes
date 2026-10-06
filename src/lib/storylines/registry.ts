// 2026 season-timeline storyline library (D-44, revised by D-48). Eight `public`-class v1
// bundles built offline by spikes/mlb-2026/timeline-build.mjs from the
// checked-in MLB Stats API snapshot. Each storyline sits on a date in the
// season and scores its options with what was known that day. Each bundle is
// parsed once (an invalid bundle fails the build and tests instead of shipping
// a broken storyline) and opened only through the D-36 public acknowledgment.
import deadlineJson from './deadline.json';
import julyRunJson from './july-run.json';
import offseasonInfieldJson from './offseason-infield.json';
import openingDayOutfieldJson from './opening-day-outfield.json';
import wildCardRosterJson from './wild-card-roster.json';
import winterBatJson from './winter-bat.json';
import winterDuranJson from './winter-duran.json';
import winterInfieldJson from './winter-infield.json';
import { computeInputDigest, parseBundle, type Bundle } from '../contracts';

export interface StorylineExpectation {
	scenarioId: string;
	offenseRuns: string | null;
	offenseDelta: string | null;
	feasibility: 'feasible';
}

export interface Storyline {
	slug: string;
	/** Short name for the timeline pin and navigation. */
	short: string;
	title: string;
	lede: string;
	/** Where the pin sits on the season timeline (ISO date). */
	eventDate: string;
	/** Rates and eligibility use data known through this date (ISO date). */
	asOf: string;
	/** Readable window the rates cover. */
	rateLabel: string;
	date: string;
	retrospective: boolean;
	eventBasis: string;
	sourceLabel: string;
	bundle: Bundle;
	inputDigest: string;
	expected: readonly StorylineExpectation[];
}

interface StorylineInput extends Omit<Storyline, 'bundle' | 'inputDigest' | 'asOf'> {
	json: unknown;
}

// The dataset revision is the as-of date (yyyymmdd), so a refreshed snapshot
// moves the date with the data instead of leaving a stale label behind.
function asOfDate(bundle: Bundle): string {
	const digits = String(bundle.dataset.revision);
	return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

function storyline({ json, ...rest }: StorylineInput): Storyline {
	const bundle = parseBundle(json);
	return { ...rest, asOf: asOfDate(bundle), bundle, inputDigest: computeInputDigest(bundle) };
}

const SNAPSHOT_LABEL =
	'MLB Stats API season-timeline snapshot (spikes/mlb-2026/timeline-snapshot.json)';

export const PINNED_STORYLINE_DIGESTS = {
	'offseason-infield': '74e18f82c56de781204f0c6db7edd922c71e413725d44321d64d24040bbfe07a',
	'opening-day-outfield': '46d5da5f741e4823b61c95b73a2468804a393b775a250454a336b6a80b032436',
	'july-run': 'aa6a80ac05944f65cd66fa600a13dfd6fa0138dfb27b6fd7165cb21cd82de4b5',
	deadline: '630cd397d2cce063589ea39cf72a961a0452d49ee558c57aeaff827319020efa',
	'wild-card-roster': '1259941764c7001fe7b504f5e3f8ac809ab677f8b1ebe52452f8ab44d57326cf',
	'winter-infield': '49c1fccce9e3be9d3fa256e277d5ff803948ba0dcc56dcaaf0b253f7a813f3a1',
	'winter-duran': '32fce7755e4ad54038ebd7f1649f7979cc02fdb57ebfea351329f4d7da955feb',
	'winter-bat': '599910b787ccc38864f3042479f80ad28e2b8e565f3c67e0f585c17d2e79057b'
} as const;

export const storylineRegistry: readonly Storyline[] = [
	storyline({
		slug: 'offseason-infield',
		short: 'Offseason IF',
		title: 'How do you replace Bregman?',
		lede: 'Alex Bregman signed with the Cubs on January 14 after turning down a five-year Boston offer with deferrals. The club had already traded for Willson Contreras to play first, then added Caleb Durbin and Andruw Monasterio from Milwaukee and signed Isiah Kiner-Falefa as a utility man. Was the rebuilt infield better than keeping Bregman, or than staying with Triston Casas at first?',
		eventDate: '2026-01-14',
		rateLabel: '2025 season',
		date: 'December 22, 2025 → February 9, 2026',
		retrospective: true,
		eventBasis:
			'Contreras trade (December 22), Bregman offer, and Milwaukee trade (February 9) from MLB Trade Rumors and NBC Sports Boston. Baseline is the Opening Day infield: Kiner-Falefa started at second against the lefty, Mayer against right-handers. Rates are 2025 totals, what the club knew that winter; Casas’s cover 112 PA before his knee injury.',
		sourceLabel: SNAPSHOT_LABEL,
		json: offseasonInfieldJson,
		expected: [
			{ scenarioId: 'base', offenseRuns: '50.70271', offenseDelta: '0', feasibility: 'feasible' },
			{
				scenarioId: 'cand-a',
				offenseRuns: '50.68765',
				offenseDelta: '-0.01506',
				feasibility: 'feasible'
			},
			{
				scenarioId: 'cand-b',
				offenseRuns: '46.71816',
				offenseDelta: '-3.98455',
				feasibility: 'feasible'
			}
		]
	}),
	storyline({
		slug: 'opening-day-outfield',
		short: 'Opening Day',
		title: 'Four outfielders, a DH, and Yoshida',
		lede: 'Boston opened with Roman Anthony in left and Jarren Duran at DH, Wilyer Abreu and Ceddanne Rafaela playing every day, and Masataka Yoshida on the bench. The club had turned away trade interest in Duran all winter. Should Yoshida have taken the DH at-bats against right-handers, or should Duran have been traded?',
		eventDate: '2026-03-26',
		rateLabel: '2025 season',
		date: 'Opening Day, March 26, 2026',
		retrospective: true,
		eventBasis:
			'Opening Day lineup from the MLB box score and CBS Boston; Duran was the planned DH until Anthony went on the injured list May 7. Trade interest in Duran is from an executive quoted by Sports Illustrated. Rates are 2025 totals, what the club knew before Opening Day.',
		sourceLabel: SNAPSHOT_LABEL,
		json: openingDayOutfieldJson,
		expected: [
			{ scenarioId: 'base', offenseRuns: '50.70271', offenseDelta: '0', feasibility: 'feasible' },
			{
				scenarioId: 'cand-a',
				offenseRuns: '48.773902',
				offenseDelta: '-1.928808',
				feasibility: 'feasible'
			},
			{
				scenarioId: 'cand-b',
				offenseRuns: '48.88215',
				offenseDelta: '-1.82056',
				feasibility: 'feasible'
			}
		]
	}),
	storyline({
		slug: 'july-run',
		short: 'July run',
		title: 'What changed in the 21–4 July?',
		lede: "June went 12–14. July went 21–4, with a 15-game winning streak that tied the 1946 club's franchise record on July 22. Connor Wong took over behind the plate and Monasterio at shortstop. Judged on what everyone had hit through June, was the new lineup the difference?",
		eventDate: '2026-07-22',
		rateLabel: '2026 through June 30',
		date: 'June 1 → July 31, 2026',
		retrospective: true,
		eventBasis:
			'Starting lineups from MLB box scores: Narváez caught 11 June starts to Wong’s 8, and Wong caught 15 July starts to Narváez’s 10. Mayer started 15 June games at short; Monasterio started 17 July games there. Rates run through June 30.',
		sourceLabel: SNAPSHOT_LABEL,
		json: julyRunJson,
		expected: [
			{ scenarioId: 'base', offenseRuns: '44.0207', offenseDelta: '0', feasibility: 'feasible' },
			{
				scenarioId: 'cand-a',
				offenseRuns: '45.77464',
				offenseDelta: '1.75394',
				feasibility: 'feasible'
			},
			{
				scenarioId: 'cand-b',
				offenseRuns: '44.7284',
				offenseDelta: '0.7077',
				feasibility: 'feasible'
			}
		]
	}),
	storyline({
		slug: 'deadline',
		short: 'Deadline',
		title: 'Rutschman in, Mayer out',
		lede: 'At the August 3 deadline Boston sent Carlos Narváez and three prospects to Baltimore for Adley Rutschman, added catcher Jake Rogers, and traded Marcelo Mayer to San Francisco for reliever Erik Miller. Rutschman arrived hurt, so Connor Wong kept catching until August 11. Was the catcher worth it, and should Mayer have stayed at second?',
		eventDate: '2026-08-03',
		rateLabel: '2026 through August 2',
		date: 'Trade deadline, August 3, 2026',
		retrospective: true,
		eventBasis:
			'Trades from Boston Globe, NBC Sports Boston, and MLB.com deadline coverage. Baseline is the lineup Boston used most from July 20 to August 2; Mayer was on the injured list (last Boston start June 25). Rates run through August 2; Rutschman’s and Rogers’s come from their clubs before the trade.',
		sourceLabel: SNAPSHOT_LABEL,
		json: deadlineJson,
		expected: [
			{ scenarioId: 'base', offenseRuns: '46.08519', offenseDelta: '0', feasibility: 'feasible' },
			{
				scenarioId: 'cand-a',
				offenseRuns: '46.54759',
				offenseDelta: '0.4624',
				feasibility: 'feasible'
			},
			{
				scenarioId: 'cand-b',
				offenseRuns: '44.65364',
				offenseDelta: '-1.43155',
				feasibility: 'feasible'
			}
		]
	}),
	storyline({
		slug: 'wild-card-roster',
		short: 'Wild Card',
		title: 'Who plays first against the Yankees?',
		lede: 'Boston finished 87–75 and opens the Wild Card Series at Yankee Stadium on September 29: Payton Tolle (LHP) starts Game 1 against Cam Schlittler, Sonny Gray takes Game 2 against Max Fried, and Ranger Suárez is behind them if it goes three. Willson Contreras, hit on the hand on September 17, came back as the DH in the September 27 finale, and Chad Tracy plans to return him to first base if he checks out. Mickey Gasper is on the injured list and Curtis Mead did not travel. With 14 spots for position players, who plays first: Contreras, Contreras at DH only, or nobody but Sogard?',
		eventDate: '2026-09-27',
		rateLabel: '2026 regular season',
		date: 'September 27–29, 2026',
		retrospective: false,
		eventBasis:
			'News as of September 29: Contreras back as DH on September 27 and expected to play first in Game 1 (MLB.com; Tracy via Yahoo Sports), Gasper placed on the injured list (Boston Sports Journal), Mead not traveling to New York (Yahoo Sports, Heavy), Tolle vs Schlittler in Game 1, Gray vs Fried in Game 2, and Suárez lined up behind them if it goes three (ESPN and MLB.com, September 28, when Tracy announced the rotation; New York had named Schlittler, Fried and Cole). The baseline against righties is the Game 1 lineup MLB.com reported before first pitch; against lefties Contreras replaces Sogard at first in the September 22–23 lineup. A is the September 27 finale against the lefty, with Contreras at DH and Anthony in left against righties. B is the September 25 plan without him. Every scenario carries 14 position players, with Nate Eaton as the extra outfielder. Rates are regular-season R/PA through September 27. This compares three rosters on shared assumptions; it is not a postseason optimization.',
		sourceLabel: SNAPSHOT_LABEL,
		json: wildCardRosterJson,
		expected: [
			{ scenarioId: 'base', offenseRuns: '43.289994', offenseDelta: '0', feasibility: 'feasible' },
			{
				scenarioId: 'cand-a',
				offenseRuns: '43.51009',
				offenseDelta: '0.220096',
				feasibility: 'feasible'
			},
			{
				scenarioId: 'cand-b',
				offenseRuns: '42.799194',
				offenseDelta: '-0.4908',
				feasibility: 'feasible'
			}
		]
	}),
	storyline({
		slug: 'winter-infield',
		short: '2027 infield',
		title: 'Who plays short and second in 2027?',
		lede: 'Boston started six players at shortstop and seven at second in 2026 and finished with Trevor Story at short and Nick Sogard or Andruw Monasterio at second. ESPN says those positions will probably be resolved in 2027 with Franklin Arias and Curtis Mead — and Arias has never taken a major-league plate appearance, so he cannot be scored from this data. The pin therefore compares only what Boston already has rates for: keep Story at short and hand second base to Mead, or move Story off shortstop as well?',
		eventDate: '2026-10-01',
		rateLabel: '2026 regular season',
		date: 'October 1, 2026 → spring training 2027',
		retrospective: false,
		eventBasis:
			'No club decision had been announced as of October 1, 2026. ESPN (Schoenfield, October 1): the positions will probably be resolved in 2027 with Franklin Arias and Curtis Mead, and Story still has a year on his contract but has no reason to play ahead of Arias. NBC Sports Boston (October 1): Story and Duran are the top trade candidates and Arias is ready to take the shortstop job. SI: the internal version is Arias at short, Mead at second and Story at DH, with Story owed $25 million for 2027. Arias is not on the 40-man roster and has no major-league stats (MLB Stats API, people/808265), so every scenario here uses only the four infielders with 2026 rates: Story, Mead, Monasterio and Sogard, with Seigler behind them; Isiah Kiner-Falefa, who also played second, is a free agent (ESPN, October 1). Baseline is the September shape: Story at short, Sogard at second against right-handers and Monasterio against left-handers. A hands second base to Mead, the player the club acquired to play it there (The Athletic, July 27). B moves Story off shortstop too, the internal stand-in for the answer reporting gives. Rates are regular-season R/PA through September 27, what Boston knows all winter. This compares three rosters on shared assumptions; it is not a projection of 2027.',
		sourceLabel: SNAPSHOT_LABEL,
		json: winterInfieldJson,
		expected: [
			{ scenarioId: 'base', offenseRuns: '43.289994', offenseDelta: '0', feasibility: 'feasible' },
			{
				scenarioId: 'cand-a',
				offenseRuns: '45.578704',
				offenseDelta: '2.28871',
				feasibility: 'feasible'
			},
			{
				scenarioId: 'cand-b',
				offenseRuns: '46.004264',
				offenseDelta: '2.71427',
				feasibility: 'feasible'
			}
		]
	}),
	storyline({
		slug: 'winter-duran',
		short: 'Trade Duran',
		title: 'Trade Jarren Duran?',
		lede: 'Jarren Duran hit .207/.266/.361 in 2026 and is fourth on the depth chart behind Roman Anthony, Ceddanne Rafaela and Wilyer Abreu — while Boston still controls him through 2028 and has never traded him. Does he still have a role here: move him and play the other three every day, or keep him and play him against left-handers too?',
		eventDate: '2026-12-07',
		rateLabel: '2026 regular season',
		date: 'October 1, 2026 → winter meetings, December 7–10, 2026',
		retrospective: false,
		eventBasis:
			'No trade had been announced in reporting as of October 1, 2026. The pin marks the Winter Meetings opening on December 7, a sourced point for trade discussions rather than a claim that Boston makes a deal that day. Feinsand (MLB.com, September): with Anthony, Rafaela and Abreu on the roster Duran has no clear-cut role, and Boston would have to settle for a lesser return; he makes $7.7 million and is controllable through 2028 (MLB Trade Rumors). ESPN (October 1): his trade value took a nosedive but two years of control will still find a taker, and he is clearly fourth on the depth chart. Sporting News (October 2026) and NBC Sports Boston (October 1) both put him at the top of the trade list. Baseline is the September shape: Duran in left against right-handers only, with Anthony in left and Jones at DH against left-handers. A trades him and plays Anthony in left with Yoshida at DH. B keeps him and plays him against left-handers too — the club did not do that once in October (he sat Game 2 against Max Fried with Nate Eaton in left; Rotowire via CBS Sports, September 30). Rates are regular-season R/PA through September 27. This compares three rosters on shared assumptions; it is not a projection of a trade return.',
		sourceLabel: SNAPSHOT_LABEL,
		json: winterDuranJson,
		expected: [
			{ scenarioId: 'base', offenseRuns: '43.289994', offenseDelta: '0', feasibility: 'feasible' },
			{
				scenarioId: 'cand-a',
				offenseRuns: '43.432194',
				offenseDelta: '0.1422',
				feasibility: 'feasible'
			},
			{
				scenarioId: 'cand-b',
				offenseRuns: '43.25889',
				offenseDelta: '-0.031104',
				feasibility: 'feasible'
			}
		]
	}),
	storyline({
		slug: 'winter-bat',
		short: 'Add a bat',
		title: 'Spend on a bat from outside?',
		lede: 'Upgrading the lineup is the No. 1 job this winter (NBC Sports Boston), and the top hitters on the market are Seattle outfielder Randy Arozarena, Chicago outfielder Seiya Suzuki and Pittsburgh second baseman Brandon Lowe. This pin prices two of them against the roster Boston has: Arozarena in left, or Lowe at second base, each taking the spot of the player who held it in September.',
		eventDate: '2026-11-06',
		rateLabel: '2026 regular season',
		date: 'October 1, 2026 → free agency opens November 6, 2026',
		retrospective: false,
		eventBasis:
			'The question was posed in reporting on October 1; the pin marks free agency opening November 6, when outside signings become available. NBC Sports Boston (October 1): Arozarena, Suzuki and Lowe are the top three hitters set to hit free agency, and if Boston will not spend on one of them it should turn to the trade market. Bleacher Report (September 30): Arozarena is among the best fits for Boston and is a right-handed bat, while Suzuki would have to accept left field. Yahoo (off-season outlook, September 30): expect Suzuki to be connected to Boston, and Lowe, who hit 35 home runs for Pittsburgh in 2026, would fit. Lowe cannot hit left-handed pitching (.223/.270/.378 against lefties in 2026, RotoWire), so B keeps Monasterio at second against left-handers. Arozarena (670 PA, 113 R) and Lowe (656 PA, 94 R) were fetched into the snapshot for these two candidates only; eligibility comes from 2025 fielding (Arozarena 158 games in left, Lowe 121 at second). Trading Wilyer Abreu or extending Adley Rutschman (about $20 million a year is the reported ask) are separate questions that move no roster spot here. Rates are regular-season R/PA through September 27. This compares three rosters on shared assumptions; it is not a projection of 2027.',
		sourceLabel: SNAPSHOT_LABEL,
		json: winterBatJson,
		expected: [
			{ scenarioId: 'base', offenseRuns: '43.289994', offenseDelta: '0', feasibility: 'feasible' },
			{
				scenarioId: 'cand-a',
				offenseRuns: '45.66305',
				offenseDelta: '2.373056',
				feasibility: 'feasible'
			},
			{
				scenarioId: 'cand-b',
				offenseRuns: '44.447994',
				offenseDelta: '1.158',
				feasibility: 'feasible'
			}
		]
	})
];

/** The decision `/` opens on (D-49): the Wild Card roster, kept there even
 * though the winter pins (D-52) are dated later — the season's pivotal choice. */
export const CURRENT_SLUG = 'wild-card-roster';

export function getStoryline(slug: string): Storyline | undefined {
	return storylineRegistry.find((storyline) => storyline.slug === slug);
}
