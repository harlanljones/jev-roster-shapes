// 2026 public storyline library (D-40). Five `public`-class v1 bundles built
// from observed 2026 MLB Stats API totals by spikes/mlb-2026/build.mjs. Each
// bundle is checked in, parsed once (an invalid bundle fails the build and
// tests instead of shipping a broken storyline), and opened only through the
// D-36 per-bundle public acknowledgment.
import catcherSplitJson from './catcher-split.json';
import infieldResetJson from './infield-reset.json';
import leftyHoleJson from './lefty-hole.json';
import outfieldLogjamJson from './outfield-logjam.json';
import powerVacuumJson from './power-vacuum.json';
import { computeInputDigest, parseBundle, type Bundle } from '../contracts';

export interface StorylineExpectation {
	scenarioId: string;
	offenseRuns: string | null;
	offenseDelta: string | null;
	feasibility: 'feasible';
}

export interface Storyline {
	slug: string;
	title: string;
	lede: string;
	timeline: string;
	description: string;
	date: string;
	retrospective: boolean;
	eventBasis: string;
	sourceLabel: string;
	bundle: Bundle;
	inputDigest: string;
	expected: readonly StorylineExpectation[];
}

function storyline(
	slug: string,
	title: string,
	lede: string,
	timeline: string,
	description: string,
	date: string,
	retrospective: boolean,
	eventBasis: string,
	sourceLabel: string,
	json: unknown,
	expected: readonly StorylineExpectation[]
): Storyline {
	const bundle = parseBundle(json);
	return {
		slug,
		title,
		lede,
		timeline,
		description,
		date,
		retrospective,
		eventBasis,
		sourceLabel,
		bundle,
		inputDigest: computeInputDigest(bundle),
		expected
	};
}

export const PINNED_STORYLINE_DIGESTS = {
	'power-vacuum': 'cdd73bd7367e414704d01a42adefb97b645090284841de84956045b1bab728c3',
	'outfield-logjam': 'f445656256fe106795fcd308b6520c53d5f797bda753f94410b28cdd06474bd8',
	'infield-reset': '4778b3ed597e56731d7f65757d1fbccacc7bacfebbefcac323cbf5ef75350c30',
	'catcher-split': '416b15b8de4e5e7ef5ebaeeedd7b66c8169f4fddab352bdb5e7e0ff79dab1738',
	'lefty-hole': '65c8ffd3f8ababb9f5a7ccbc327808ab91b6517f8bd1891580d7e309f6af41d6'
} as const;

export const storylineRegistry: readonly Storyline[] = [
	storyline(
		'power-vacuum',
		'Who carries the lineup without Devers and Bregman?',
		'Devers was traded, Bregman signed with the Cubs, and no Red Sox hitter was projected for 20 home runs. Is the 21-year-old ready to carry the lineup — or does the veteran cleanup bat, or the injured slugger’s hoped-for return?',
		'Retrospective roster question · power and DH succession',
		'Who absorbs the missing middle-of-the-order power?',
		'June 15, 2025 → January 14, 2026',
		true,
		'Devers traded to San Francisco on June 15, 2025; Bregman signed with Chicago on January 14, 2026.',
		'Event records: MLB Stats API transactions · data snapshot: September 20–21, 2026',
		powerVacuumJson,
		[
			{ scenarioId: 'base', offenseRuns: '44.95712', offenseDelta: '0', feasibility: 'feasible' },
			{
				scenarioId: 'cand-a',
				offenseRuns: '44.1448',
				offenseDelta: '-0.81232',
				feasibility: 'feasible'
			},
			{ scenarioId: 'cand-b', offenseRuns: null, offenseDelta: null, feasibility: 'feasible' }
		]
	),
	storyline(
		'outfield-logjam',
		'Four gloves, three spots, one DH',
		'Anthony, Duran, Abreu, Rafaela: four quality outfielders and only three starting spots. Duran slides to DH while Yoshida — the most expensive pinch hitter in the game — waits for at-bats.',
		'Retrospective roster question · outfield/DH congestion',
		'Four outfield profiles compete for three defensive spots and one DH lane.',
		'August 15, 2025 → spring training 2026',
		true,
		'Refsnyder’s August 15, 2025 injured-list episode and the 2026 spring roster construction create the dated roster question.',
		'Event records: MLB Stats API transactions + public depth chart · data snapshot: September 20–21, 2026',
		outfieldLogjamJson,
		[
			{ scenarioId: 'base', offenseRuns: '44.1448', offenseDelta: '0', feasibility: 'feasible' },
			{
				scenarioId: 'cand-a',
				offenseRuns: '44.95712',
				offenseDelta: '0.81232',
				feasibility: 'feasible'
			},
			{
				scenarioId: 'cand-b',
				offenseRuns: '43.28708',
				offenseDelta: '-0.85772',
				feasibility: 'feasible'
			}
		]
	),
	storyline(
		'infield-reset',
		'From the worst infield to steady',
		'116 errors and the worst infield defense in baseball since 2020. Contreras at first, Durbin at third, current-roster Sogard at second — with versatile veteran IKF and utility Monasterio behind him.',
		'Retrospective roster question · infield reset',
		'Choose the second baseman without hiding defensive coverage tradeoffs.',
		'February 9–10, 2026',
		true,
		'Durbin, Monasterio, and Seigler arrived in the February 9 trade; Kiner-Falefa signed February 10.',
		'Event records: MLB Stats API transactions · data snapshot: September 20–21, 2026',
		infieldResetJson,
		[
			{ scenarioId: 'base', offenseRuns: '44.1448', offenseDelta: '0', feasibility: 'feasible' },
			{
				scenarioId: 'cand-a',
				offenseRuns: '44.80225',
				offenseDelta: '0.65745',
				feasibility: 'feasible'
			},
			{
				scenarioId: 'cand-b',
				offenseRuns: '43.9084',
				offenseDelta: '-0.2364',
				feasibility: 'feasible'
			}
		]
	),
	storyline(
		'catcher-split',
		'Rutschman’s middle ground vs Wong’s rebound',
		'Rutschman is the current catching anchor while Wong remains the alternate bat. Who catches the win-now staff — or do they carry both and sit a rookie outfielder?',
		'Retrospective roster question · catcher workload',
		'Compare catcher workload, bat, and the cost of carrying both.',
		'2025 second half → September 20, 2026',
		true,
		'Historical catcher workload is reviewed against the September 20, 2026 observed lineup; no single transaction date is claimed.',
		'Event record: MLB Stats API game 822922 + public depth chart · data snapshot: September 20–21, 2026',
		catcherSplitJson,
		[
			{ scenarioId: 'base', offenseRuns: '44.1448', offenseDelta: '0', feasibility: 'feasible' },
			{
				scenarioId: 'cand-a',
				offenseRuns: '43.495',
				offenseDelta: '-0.6498',
				feasibility: 'feasible'
			},
			{
				scenarioId: 'cand-b',
				offenseRuns: '44.15484',
				offenseDelta: '0.01004',
				feasibility: 'feasible'
			}
		]
	),
	storyline(
		'lefty-hole',
		'No Refsnyder, no Romy: who faces lefties?',
		'Refsnyder left for Seattle, Gonzalez opened on the 60-day IL, and Devers and Bregman took their lefty-mashing with them. Splits are unavailable — so the righty bench bats audition on overall observed rates only.',
		'Retrospective roster question · lefty coverage',
		'Test right-handed depth against a lefty question without inventing splits.',
		'November 2, 2025 → March 25, 2026',
		true,
		'Refsnyder elected free agency November 2, 2025; Gonzalez went to the 60-day IL March 12 and Casas was placed on the IL March 25.',
		'Event records: MLB Stats API transactions · data snapshot: September 20–21, 2026',
		leftyHoleJson,
		[
			{ scenarioId: 'base', offenseRuns: '44.95712', offenseDelta: '0', feasibility: 'feasible' },
			{
				scenarioId: 'cand-a',
				offenseRuns: '45.61457',
				offenseDelta: '0.65745',
				feasibility: 'feasible'
			},
			{
				scenarioId: 'cand-b',
				offenseRuns: '45.40292',
				offenseDelta: '0.4458',
				feasibility: 'feasible'
			}
		]
	)
];

export function getStoryline(slug: string): Storyline | undefined {
	return storylineRegistry.find((storyline) => storyline.slug === slug);
}
