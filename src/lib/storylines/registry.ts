// 2026 season-timeline storyline library (D-44, revised by D-48). Five `public`-class v1
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
	'offseason-infield': 'fb37cb527a636e7b4ca0edbf0e62326570ef5385c33214e05e30f56c420b6b0e',
	'opening-day-outfield': '672880262e11d8c19a8acabc7d3dd0f6c903bbff790e047e55b611f65eabe263',
	'july-run': 'b3858ce8b3ab18d42b2ab93fabd7cff85a7cb3f56e9c476e3dc905fa1377cf39',
	deadline: 'eb0ad03bcb9b9301556acdaff5bf515d8c1528467535abd78c7e6ec5de0c0065',
	'wild-card-roster': '722754326238ef0ff5d28927664cda632ebe4d029aee3f0183112166a9126531'
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
		lede: 'Boston finished 87–75 and opens the Wild Card Series at Yankee Stadium on September 29: Cam Schlittler (RHP) in Game 1, Max Fried (LHP) in Game 2, Gerrit Cole or Carlos Rodón if it goes three. Willson Contreras, hit on the hand on September 17, came back as the DH in the September 27 finale, and Chad Tracy plans to return him to first base if he checks out. Mickey Gasper is on the injured list and Curtis Mead did not travel. With 14 spots for position players, who plays first: Contreras, Contreras at DH only, or nobody but Sogard?',
		eventDate: '2026-09-27',
		rateLabel: '2026 regular season',
		date: 'September 27–29, 2026',
		retrospective: false,
		eventBasis:
			'News as of September 29: Contreras back as DH on September 27 and expected to play first in Game 1 (MLB.com; Tracy via Yahoo Sports), Gasper placed on the injured list (Boston Sports Journal), Mead not traveling to New York (Yahoo Sports, Heavy), Tolle vs Schlittler in Game 1 and Fried in Game 2 (ESPN, MLB.com). The baseline against righties is the Game 1 lineup MLB.com reported before first pitch; against lefties Contreras replaces Sogard at first in the September 22–23 lineup. A is the September 27 finale against the lefty, with Contreras at DH and Anthony in left against righties. B is the September 25 plan without him. Every scenario carries 14 position players, with Nate Eaton as the extra outfielder. Rates are regular-season R/PA through September 27. This compares three rosters on shared assumptions; it is not a postseason optimization.',
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
	})
];

/** The decision `/` opens on (D-49): the latest pin, the Wild Card roster. */
export const CURRENT_SLUG = 'wild-card-roster';

export function getStoryline(slug: string): Storyline | undefined {
	return storylineRegistry.find((storyline) => storyline.slug === slug);
}
