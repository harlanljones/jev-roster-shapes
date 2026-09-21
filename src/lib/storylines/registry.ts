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
		sourceLabel,
		bundle,
		inputDigest: computeInputDigest(bundle),
		expected
	};
}

export const PINNED_STORYLINE_DIGESTS = {
	'power-vacuum': '9009a570f529d416bb61adddae8106515a70da9a462f3996cba7fba097b235dd',
	'outfield-logjam': 'e9050613a50da3bb89cf25030b41cf2230a171e2b37678f247a9eff3eecb0e83',
	'infield-reset': 'd9443ee8e6a1851956cd7e36af99bc1e2e3bb8ae8d6e12b67190f753af5ef4e7',
	'catcher-split': 'cc70c80c5399441b9ea9f0bbb42f8d63669835e3a64b8e5c24306321c1a94767',
	'lefty-hole': '310e320bad881d0669ccc2a0812c03dcf4e4b07c1a56439483f785f41878953f'
} as const;

export const storylineRegistry: readonly Storyline[] = [
	storyline(
		'power-vacuum',
		'Who carries the lineup without Devers and Bregman?',
		'Devers was traded, Bregman signed with the Cubs, and no Red Sox hitter was projected for 20 home runs. Is the 21-year-old ready to carry the lineup — or does the veteran cleanup bat, or the injured slugger’s hoped-for return?',
		'2026 season snapshot · baseline, Anthony, or Casas at DH/left field',
		'Who absorbs the missing middle-of-the-order power?',
		'September 20, 2026',
		'MLB Stats API game 822922 + MLB.com depth chart snapshot',
		powerVacuumJson,
		[
			{ scenarioId: 'base', offenseRuns: '39.13172', offenseDelta: '0', feasibility: 'feasible' },
			{
				scenarioId: 'cand-a',
				offenseRuns: '38.3194',
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
		'2026 season snapshot · outfield/DH allocation as of the roster snapshot',
		'Four outfield profiles compete for three defensive spots and one DH lane.',
		'September 21, 2026',
		'MLB.com depth chart snapshot · MLB Stats API observed totals',
		outfieldLogjamJson,
		[
			{ scenarioId: 'base', offenseRuns: '38.3194', offenseDelta: '0', feasibility: 'feasible' },
			{
				scenarioId: 'cand-a',
				offenseRuns: '39.13172',
				offenseDelta: '0.81232',
				feasibility: 'feasible'
			},
			{
				scenarioId: 'cand-b',
				offenseRuns: '37.46168',
				offenseDelta: '-0.85772',
				feasibility: 'feasible'
			}
		]
	),
	storyline(
		'infield-reset',
		'From the worst infield to steady',
		'116 errors and the worst infield defense in baseball since 2020. Contreras at first, Durbin at third, rookie Mayer at second — with versatile veteran IKF and utility Monasterio behind him.',
		'2026 season snapshot · second-base choice against the current infield',
		'Choose the second baseman without hiding defensive coverage tradeoffs.',
		'September 21, 2026',
		'MLB.com depth chart snapshot · MLB Stats API observed totals',
		infieldResetJson,
		[
			{ scenarioId: 'base', offenseRuns: '38.3194', offenseDelta: '0', feasibility: 'feasible' },
			{
				scenarioId: 'cand-a',
				offenseRuns: '39.95648',
				offenseDelta: '1.63708',
				feasibility: 'feasible'
			},
			{
				scenarioId: 'cand-b',
				offenseRuns: '39.2414',
				offenseDelta: '0.922',
				feasibility: 'feasible'
			}
		]
	),
	storyline(
		'catcher-split',
		'Narváez’s middle ground vs Wong’s rebound',
		'Narváez played the second half of 2025 on a bad left knee that needed surgery. Wong lost the starter job and the bat. Who catches the win-now staff — or do they carry both and sit a rookie outfielder?',
		'2026 season snapshot · catcher role and DH spillover',
		'Compare catcher workload, bat, and the cost of carrying both.',
		'September 21, 2026',
		'MLB.com depth chart snapshot · MLB Stats API observed totals',
		catcherSplitJson,
		[
			{ scenarioId: 'base', offenseRuns: '38.3194', offenseDelta: '0', feasibility: 'feasible' },
			{
				scenarioId: 'cand-a',
				offenseRuns: '39.05276',
				offenseDelta: '0.73336',
				feasibility: 'feasible'
			},
			{
				scenarioId: 'cand-b',
				offenseRuns: '38.32944',
				offenseDelta: '0.01004',
				feasibility: 'feasible'
			}
		]
	),
	storyline(
		'lefty-hole',
		'No Refsnyder, no Romy: who faces lefties?',
		'Refsnyder left for Seattle, Gonzalez opened on the 60-day IL, and Devers and Bregman took their lefty-mashing with them. Splits are unavailable — so the righty bench bats audition on overall observed rates only.',
		'2026 season snapshot · left-handed-starter question, no split claim',
		'Test right-handed depth against a lefty question without inventing splits.',
		'September 21, 2026',
		'MLB.com depth chart snapshot · MLB Stats API observed totals',
		leftyHoleJson,
		[
			{ scenarioId: 'base', offenseRuns: '39.13172', offenseDelta: '0', feasibility: 'feasible' },
			{
				scenarioId: 'cand-a',
				offenseRuns: '40.7688',
				offenseDelta: '1.63708',
				feasibility: 'feasible'
			},
			{
				scenarioId: 'cand-b',
				offenseRuns: '39.57752',
				offenseDelta: '0.4458',
				feasibility: 'feasible'
			}
		]
	)
];

export function getStoryline(slug: string): Storyline | undefined {
	return storylineRegistry.find((storyline) => storyline.slug === slug);
}
