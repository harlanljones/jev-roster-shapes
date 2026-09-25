// 2026 season-timeline storyline library (D-44). Five `public`-class v1
// bundles built offline by spikes/mlb-2026/timeline-build.mjs from the
// checked-in MLB Stats API snapshot. Each storyline sits on a date in the
// season and scores its options with what was known that day. Each bundle is
// parsed once (an invalid bundle fails the build and tests instead of shipping
// a broken storyline) and opened only through the D-36 public acknowledgment.
import deadlineCatcherJson from './deadline-catcher.json';
import julyRunJson from './july-run.json';
import octoberLineupJson from './october-lineup.json';
import preseasonDhJson from './preseason-dh.json';
import preseasonSecondJson from './preseason-second.json';
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
	'preseason-dh': '3f540e3b7d2d73fefd860928f0412f9586a48a1ff8d26132fa1a467f0e09808f',
	'preseason-second': '8074c682d0ac5c2947f329c5645ab3478776b825ea430f9095c5945a09f30996',
	'july-run': 'f805b7a6a44935ebe89a54ed1bca085d4453a789da878a4730cce2b2a5ec1a9b',
	'deadline-catcher': '9b53aa7b5cbec78ad49594d7f692dcb9e0cab7df04ffc3cf45b08af1a15f5cbf',
	'october-lineup': '4c50380c1acd18b6983fa5c9a32a89118e585dccd39a6e7dd7d6a2fd3429e70c'
} as const;

export const storylineRegistry: readonly Storyline[] = [
	storyline({
		slug: 'preseason-dh',
		short: 'DH lane',
		title: 'Who takes the DH at-bats?',
		lede: 'Devers and Bregman were gone, and Boston opened with four outfielders for three spots. Roman Anthony took most of the early DH starts while Jarren Duran played left. Did the 21-year-old belong there, or Masataka Yoshida, or Triston Casas had he been healthy?',
		eventDate: '2026-03-26',
		rateLabel: '2025 season',
		date: 'January 14 → Opening Day, March 26, 2026',
		retrospective: true,
		eventBasis:
			'Bregman signed with the Cubs January 14; Casas opened on the injured list March 25. Baseline is the lineup Boston used most in its first two weeks. Rates are 2025 totals, what the club knew before Opening Day.',
		sourceLabel: SNAPSHOT_LABEL,
		json: preseasonDhJson,
		expected: [
			{ scenarioId: 'base', offenseRuns: '51.68311', offenseDelta: '0', feasibility: 'feasible' },
			{
				scenarioId: 'cand-a',
				offenseRuns: '48.46843',
				offenseDelta: '-3.21468',
				feasibility: 'feasible'
			},
			{
				scenarioId: 'cand-b',
				offenseRuns: '47.13219',
				offenseDelta: '-4.55092',
				feasibility: 'feasible'
			}
		]
	}),
	storyline({
		slug: 'preseason-second',
		short: 'Second base',
		title: 'Who plays second, and who faces lefties?',
		lede: 'The February 9 trade brought Caleb Durbin and Andruw Monasterio from Milwaukee, and Isiah Kiner-Falefa signed as a veteran glove. Marcelo Mayer started 9 of the first 10 games against right-handers at second. Should it have been Kiner-Falefa, or a platoon with Monasterio against lefties?',
		eventDate: '2026-02-09',
		rateLabel: '2025 season',
		date: 'February 9 → Opening Day, March 26, 2026',
		retrospective: true,
		eventBasis:
			'Durbin, Monasterio, and Seigler arrived in the February 9 trade with Milwaukee. Baseline is the lineup Boston used most in its first two weeks. Rates are 2025 totals, what the club knew before Opening Day.',
		sourceLabel: SNAPSHOT_LABEL,
		json: preseasonSecondJson,
		expected: [
			{ scenarioId: 'base', offenseRuns: '51.68311', offenseDelta: '0', feasibility: 'feasible' },
			{
				scenarioId: 'cand-a',
				offenseRuns: '49.23211',
				offenseDelta: '-2.451',
				feasibility: 'feasible'
			},
			{
				scenarioId: 'cand-b',
				offenseRuns: '51.55675',
				offenseDelta: '-0.12636',
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
		slug: 'deadline-catcher',
		short: 'Deadline C',
		title: 'Rutschman at the deadline, or stand pat?',
		lede: 'On August 3 Boston sent Carlos Narváez and three prospects to Baltimore for Adley Rutschman and Jake Rogers. Wong had been catching most days. Did Rutschman add more behind the plate, or at DH with Wong still catching?',
		eventDate: '2026-08-03',
		rateLabel: '2026 through August 2',
		date: 'Trade deadline, August 3, 2026',
		retrospective: true,
		eventBasis:
			'Trade as recorded on the 2026 Red Sox season page. Baseline is the lineup Boston used most from July 20 to August 2. Rates run through August 2; Rutschman’s and Rogers’s come from their clubs before the trade.',
		sourceLabel: SNAPSHOT_LABEL,
		json: deadlineCatcherJson,
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
				offenseRuns: '45.60467',
				offenseDelta: '-0.48052',
				feasibility: 'feasible'
			}
		]
	}),
	storyline({
		slug: 'october-lineup',
		short: 'October',
		title: 'The lineup going into October',
		lede: 'Boston clinched a playoff spot on September 21. Willson Contreras has started only four September games at first, Nick Sogard has played there instead, and Rutschman catches against both hands. Compare the latest lineups with Contreras back at first, or with Wong catching lefties.',
		eventDate: '2026-09-25',
		rateLabel: '2026 season to date',
		date: 'September 25, 2026',
		retrospective: false,
		eventBasis:
			'Clinch date from NESN, September 22. Baseline lineups are Boston’s most recent against a left-hander (September 23) and a right-hander (September 24). This compares three lineups on shared assumptions; it is not a postseason optimization.',
		sourceLabel: SNAPSHOT_LABEL,
		json: octoberLineupJson,
		expected: [
			{
				scenarioId: 'base',
				offenseRuns: '43.255052',
				offenseDelta: '0',
				feasibility: 'feasible'
			},
			{
				scenarioId: 'cand-a',
				offenseRuns: '43.941312',
				offenseDelta: '0.68626',
				feasibility: 'feasible'
			},
			{
				scenarioId: 'cand-b',
				offenseRuns: '42.979536',
				offenseDelta: '-0.275516',
				feasibility: 'feasible'
			}
		]
	})
];

export function getStoryline(slug: string): Storyline | undefined {
	return storylineRegistry.find((storyline) => storyline.slug === slug);
}
