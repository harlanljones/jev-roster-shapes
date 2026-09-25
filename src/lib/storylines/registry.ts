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
	'offseason-infield': 'f25dd4d047d26f2ad9aecfb6fbc2e293ca693e9f938779bd8da3e3c1a3f58cd0',
	'opening-day-outfield': 'dc680022ae521951aaa0cd71c73021da8ac95c8a840cec79797b31b54b7ffcfe',
	'july-run': '530e9755537a0edb4f950f3593a6b4f6dbcd388a261645f2f355a48814484e3e',
	deadline: '1df6997dedf52d6a10545676559e46abf4c343ef075186364abc65fce8889c3f',
	'wild-card-roster': 'dd8a64b62cd45605129d5aa7d4e52cef770f3e8571a6b6681c07601ef9c72a2a'
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
		title: 'Who makes the Wild Card roster?',
		lede: 'Boston clinched on September 21. Willson Contreras was hit on the hand by a pitch on September 18 and still could not swing a week later. Last October the club carried 14 position players. Carry Contreras and wait, or give his spot away? Gasper, Jones, Duran, Sogard, Story, and Monasterio are all competing for the at-bats.',
		eventDate: '2026-09-25',
		rateLabel: '2026 season to date',
		date: 'September 25, 2026',
		retrospective: false,
		eventBasis:
			'Contreras injury from Boston.com, September 25; the 2025 Wild Card roster (14 position players, 12 pitchers) from the club’s press release; clinch date from NESN. Every scenario is held to 14 position players. Baselines are Boston’s latest lineups against a left-hander (September 23) and a right-hander (September 24). This compares three rosters on shared assumptions; it is not a postseason optimization.',
		sourceLabel: SNAPSHOT_LABEL,
		json: wildCardRosterJson,
		expected: [
			{ scenarioId: 'base', offenseRuns: '43.222792', offenseDelta: '0', feasibility: 'feasible' },
			{
				scenarioId: 'cand-a',
				offenseRuns: '43.853352',
				offenseDelta: '0.63056',
				feasibility: 'feasible'
			},
			{
				scenarioId: 'cand-b',
				offenseRuns: '42.679852',
				offenseDelta: '-0.54294',
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
