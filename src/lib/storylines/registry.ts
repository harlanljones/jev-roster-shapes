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
const PROJECTION_LABEL =
	'MLB Stats API snapshot + projected 2027 roster from early-October reporting (D-56)';

export const PINNED_STORYLINE_DIGESTS = {
	'offseason-infield': 'a5882d8a356407cf1a878a70f456a242bdb73d4d0974b8b737934890c4f98f4c',
	'opening-day-outfield': '5a6286d7f9804bfb1c9d74079780c041fb43c305c2a3de39c98bf478b605f32f',
	'july-run': 'b1079ecd635975ad61e62cc1cda4ff7d57ece789aedcd7ed495a443366e9431a',
	deadline: '4d6ad9b32050fd8901b2416abca980041bf22018c2331108c665e42cb393e0b4',
	'wild-card-roster': '726173b245bd36844354a3b9a68f245ace741a21cfaa2b5f3580e0bb4519ad34',
	'winter-infield': '18852bf48122061e3c8e39b615554156ee228db058f45709e41cc38da3abf5a0',
	'winter-duran': '264b1a3688977d44aec03305a1420cc648f9bef31b5ad7a7e2fe2e131b436c84',
	'winter-bat': 'a97a0f7da5d4eabbd41cde42ad768edb4e5033063137c72d624b9cb652b7b01d'
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
		lede: 'Reporting projects the 2027 nine with Adley Rutschman behind the plate, Curtis Mead penciled in at second — “broadly (the) plan,” Chad Tracy said — and Trevor Story at short with Franklin Arias pushing. Arias has never taken a major-league plate appearance, so he cannot be scored from this data; Monasterio stands in at short in the succession scenarios. The pin compares the club’s plan with the two ways the succession can go: Story keeps his bat at DH, or he goes to the bench.',
		eventDate: '2026-10-01',
		rateLabel: '2026 regular season',
		date: 'October 1, 2026 → spring training 2027',
		retrospective: false,
		eventBasis:
			'No club decision had been announced as of October 1, 2026. Chad Tracy, via Tim Healey (The Boston Globe, October 5–6; MLB Trade Rumors and CBS Sports, October 6): it is “broadly (the) plan” for Curtis Mead to get the majority of the second-base work — “he was acquired for a reason.” Sports Illustrated (October 1) lays out the internal options: Arias at short with Mead at second and Story at DH, or Story at short with Arias at second and Mead at DH; Yahoo Sports’ projected roster (October 2) lists Story/Arias at short and Mead/Sogard at second. Franklin Arias is named but not scored — he has no major-league plate appearance (MLB Stats API, people/808265) — so Monasterio stands in at short. Baseline is the projected 2027 lineup (D-56): Story at short, Mead at second, with Rutschman catching and Anthony in left locked into the searched best nine. A gives Story the DH at-bats when Arias takes short; B benches him. Rates are regular-season R/PA through September 27, what Boston knows all winter. This compares three rosters on shared assumptions; it is not a projection of 2027.',
		sourceLabel: PROJECTION_LABEL,
		json: winterInfieldJson,
		expected: [
			{ scenarioId: 'base', offenseRuns: '45.720904', offenseDelta: '0', feasibility: 'feasible' },
			{
				scenarioId: 'cand-a',
				offenseRuns: '45.24008',
				offenseDelta: '-0.480824',
				feasibility: 'feasible'
			},
			{
				scenarioId: 'cand-b',
				offenseRuns: '46.146464',
				offenseDelta: '0.42556',
				feasibility: 'feasible'
			}
		]
	}),
	storyline({
		slug: 'winter-duran',
		short: 'Trade Duran',
		title: 'Trade Jarren Duran?',
		lede: 'Jarren Duran hit .207/.266/.361 in 2026 and is fourth on the depth chart behind Roman Anthony, Ceddanne Rafaela and Wilyer Abreu — while Boston still controls him through 2028 and has never traded him. Does he still have a role here: move him and keep the projected nine, or keep him and start him at DH against right-handers?',
		eventDate: '2026-12-07',
		rateLabel: '2026 regular season',
		date: 'October 1, 2026 → winter meetings, December 7–10, 2026',
		retrospective: false,
		eventBasis:
			'No trade had been announced in reporting as of October 1, 2026. The pin marks the Winter Meetings opening on December 7, a sourced point for trade discussions rather than a claim that Boston makes a deal that day. Feinsand (MLB.com, September): with Anthony, Rafaela and Abreu on the roster Duran has no clear-cut role, and Boston would have to settle for a lesser return; he makes $7.7 million and is controllable through 2028 (MLB Trade Rumors). ESPN (October 1): his trade value took a nosedive but two years of control will still find a taker, and he is clearly fourth on the depth chart. Sporting News (October 2026) and NBC Sports Boston (October 1) both put him at the top of the trade list. Baseline is the projected 2027 lineup (D-56): Anthony, Rafaela and Abreu every day, with Duran the fourth outfielder and Yoshida/Jones at DH. A trades him — the projected nine does not change, so the return is what the move is for and it is not priced here. B keeps him and starts him at DH against right-handers, his strong side, with Yoshida on the bench; the club used him that way in September (Just Baseball’s playoff projection). Rates are regular-season R/PA through September 27. This compares three rosters on shared assumptions; it is not a projection of a trade return.',
		sourceLabel: PROJECTION_LABEL,
		json: winterDuranJson,
		expected: [
			{ scenarioId: 'base', offenseRuns: '45.720904', offenseDelta: '0', feasibility: 'feasible' },
			{
				scenarioId: 'cand-a',
				offenseRuns: '45.720904',
				offenseDelta: '0',
				feasibility: 'feasible'
			},
			{
				scenarioId: 'cand-b',
				offenseRuns: '45.578704',
				offenseDelta: '-0.1422',
				feasibility: 'feasible'
			}
		]
	}),
	storyline({
		slug: 'winter-bat',
		short: 'Add a bat',
		title: 'Spend on a bat from outside?',
		lede: 'Upgrading the lineup is the No. 1 job this winter (NBC Sports Boston), and the top hitters on the market are Seattle outfielder Randy Arozarena, Chicago outfielder Seiya Suzuki and Pittsburgh second baseman Brandon Lowe. This pin prices two of them against the projected 2027 roster: Arozarena in left with Anthony moving to DH, or Lowe at second with Mead moving to DH.',
		eventDate: '2026-11-06',
		rateLabel: '2026 regular season',
		date: 'October 1, 2026 → free agency opens November 6, 2026',
		retrospective: false,
		eventBasis:
			'The question was posed in reporting on October 1; the pin marks free agency opening November 6, when outside signings become available. NBC Sports Boston (October 1): Arozarena, Suzuki and Lowe are the top three hitters set to hit free agency, and if Boston will not spend on one of them it should turn to the trade market. Bleacher Report (September 30): Arozarena is among the best fits for Boston and is a right-handed bat, while Suzuki would have to accept left field. Sports Illustrated (October 1): landing Arozarena would let Boston shift Anthony to DH. Yahoo (off-season outlook, September 30): expect Suzuki to be connected to Boston, and Lowe, who hit 35 home runs for Pittsburgh in 2026, would fit; MLB Trade Rumors (October 6) expects the club to push Mead to a multi-positional role before long, so B moves him to DH against right-handers and keeps Monasterio at second against left-handers, where Lowe cannot hit (.223/.270/.378 against lefties in 2026, RotoWire). Baseline is the projected 2027 lineup (D-56). Arozarena (670 PA, 113 R) and Lowe (656 PA, 94 R) were fetched into the snapshot for these two candidates only; eligibility comes from 2025 fielding (Arozarena 158 games in left, Lowe 121 at second). Trading Wilyer Abreu or extending Adley Rutschman (about $20 million a year is the reported ask) are separate questions that move no roster spot here. Rates are regular-season R/PA through September 27. This compares three rosters on shared assumptions; it is not a projection of 2027.',
		sourceLabel: PROJECTION_LABEL,
		json: winterBatJson,
		expected: [
			{ scenarioId: 'base', offenseRuns: '45.720904', offenseDelta: '0', feasibility: 'feasible' },
			{
				scenarioId: 'cand-a',
				offenseRuns: '47.95176',
				offenseDelta: '2.230856',
				feasibility: 'feasible'
			},
			{
				scenarioId: 'cand-b',
				offenseRuns: '46.378606',
				offenseDelta: '0.657702',
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
