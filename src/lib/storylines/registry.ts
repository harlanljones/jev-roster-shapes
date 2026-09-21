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
	'power-vacuum': '6224ab1a3c868185ade5bda1e2ccde2358f123a4650fb24275e8e101e3baa7d6',
	'outfield-logjam': '1271a0540fb9dcae9553060adb9c833410e71836afee6fc4f9e39154aebc9b8c',
	'infield-reset': 'f69d7434a620e3068620e010d7e8cdacb41996f1e05ffb5aa323a346f3e84b78',
	'catcher-split': '2a75308841e270fa35fa33820f1da85c2ce8483fef43d4b8128a73d256b43f37',
	'lefty-hole': '81a8fc38ea6fa86891967a04ca3b230875b20f02752bc7f91b153327c3851172'
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
			{ scenarioId: 'base', offenseRuns: '41.49604', offenseDelta: '0', feasibility: 'feasible' },
			{
				scenarioId: 'cand-a',
				offenseRuns: '40.68372',
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
			{ scenarioId: 'base', offenseRuns: '40.68372', offenseDelta: '0', feasibility: 'feasible' },
			{
				scenarioId: 'cand-a',
				offenseRuns: '41.49604',
				offenseDelta: '0.81232',
				feasibility: 'feasible'
			},
			{
				scenarioId: 'cand-b',
				offenseRuns: '39.826',
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
			{ scenarioId: 'base', offenseRuns: '40.68372', offenseDelta: '0', feasibility: 'feasible' },
			{
				scenarioId: 'cand-a',
				offenseRuns: '41.20968',
				offenseDelta: '0.52596',
				feasibility: 'feasible'
			},
			{
				scenarioId: 'cand-b',
				offenseRuns: '40.4946',
				offenseDelta: '-0.18912',
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
			{ scenarioId: 'base', offenseRuns: '40.68372', offenseDelta: '0', feasibility: 'feasible' },
			{
				scenarioId: 'cand-a',
				offenseRuns: '40.16388',
				offenseDelta: '-0.51984',
				feasibility: 'feasible'
			},
			{
				scenarioId: 'cand-b',
				offenseRuns: '40.69376',
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
			{ scenarioId: 'base', offenseRuns: '41.49604', offenseDelta: '0', feasibility: 'feasible' },
			{
				scenarioId: 'cand-a',
				offenseRuns: '42.022',
				offenseDelta: '0.52596',
				feasibility: 'feasible'
			},
			{
				scenarioId: 'cand-b',
				offenseRuns: '41.94184',
				offenseDelta: '0.4458',
				feasibility: 'feasible'
			}
		]
	)
];

export function getStoryline(slug: string): Storyline | undefined {
	return storylineRegistry.find((storyline) => storyline.slug === slug);
}
