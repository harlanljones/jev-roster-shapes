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
	'offseason-infield': '957bd1d74783ad090654f0870b45427e67f00cf598c8c20bddc20404c52a9cd2',
	'opening-day-outfield': '7dac7fe96dc0a741649dee4af9b25a618a5c414de81b6bd9bf51e8bf48c820b3',
	'july-run': 'fb76f60edd973acc7ee57a4739fdb34e4dd5cb3f7a6b535357a7f2137a387023',
	deadline: '87d0445040c1bb982df47945da50f884ef9e865723140d30b483a0796a1f5aec',
	'wild-card-roster': '49d6184fda7902ccf1be48ba5dff2d2b47e90970a754335bff86e06dde0676ad'
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
		lede: 'Boston opens the Wild Card Series at Yankee Stadium on September 29: Cam Schlittler (RHP) in Game 1, Max Fried (LHP) in Game 2, Gerrit Cole or Carlos Rodón if it goes three. Willson Contreras, hit on the hand on September 17, still could not swing on September 25. The same day Mickey Gasper, the backup at first, hurt his biceps and is expected to miss the series. Curtis Mead is taking batting practice off a broken wrist and is not ruled out. With 14 spots for position players, as last October, who plays first?',
		eventDate: '2026-09-25',
		rateLabel: '2026 season to date',
		date: 'September 25, 2026',
		retrospective: false,
		eventBasis:
			'News as of September 25: Contreras (Boston.com), Gasper out for the series with a biceps injury (RotoWire, 98.5 The Sports Hub), Rafaela back after a clean MRI (MLB.com), Mead not ruled out (SI, citing the Boston Globe), Yoshida out with a hamstring strain since August (RotoWire). Yankees probables from Heavy, citing Aaron Boone. The 2025 Wild Card roster (14 position players, 12 pitchers) is from the club’s press release. Every scenario is held to 14 position players; with Gasper out, each carries 13. Lineups are Boston’s latest against each hand with Rafaela in center and Anthony taking Gasper’s DH at-bats against righties. Mead’s rate comes from his 329 PA before the injury, mostly with Washington. This compares three rosters on shared assumptions; it is not a postseason optimization.',
		sourceLabel: SNAPSHOT_LABEL,
		json: wildCardRosterJson,
		expected: [
			{ scenarioId: 'base', offenseRuns: '42.670486', offenseDelta: '0', feasibility: 'feasible' },
			{
				scenarioId: 'cand-a',
				offenseRuns: '43.356696',
				offenseDelta: '0.68621',
				feasibility: 'feasible'
			},
			{
				scenarioId: 'cand-b',
				offenseRuns: '44.424496',
				offenseDelta: '1.75401',
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
