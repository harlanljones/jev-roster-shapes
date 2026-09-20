import goldenJson from './comparison-v1.json';
import {
	computeInputDigest,
	parseBundle,
	type Bundle,
	type CalculationResult,
	validateBundle
} from '../contracts';

export type FixtureImportExpectation = 'accepted' | 'rejected';

export type HandDerivedScenarioExpectation = {
	scenarioId: string;
	rosterMembers: number;
	allocatedPA: number;
	unallocatedPA: number;
	defensiveOutsPerFieldingPosition: number;
	totalPositionOuts: number;
	defensiveShortfallOuts: number;
	offensiveRuns: string;
	offensiveDelta: string;
	feasibility: 'feasible';
	ready: false;
	readinessBlockingCode: 'ACKNOWLEDGMENT_REQUIRED';
};

export type SyntheticFixture = {
	id: string;
	acceptanceCase: string;
	expectedImport: FixtureImportExpectation;
	bundle: Bundle;
	inputDigest: string | null;
	expectedIssueCodes: string[];
	expected?: readonly HandDerivedScenarioExpectation[];
	calculationVersion?: 'hand-derived-acceptance-v1';
};

export const goldenBundle = parseBundle(goldenJson);

const PINNED_INPUT_DIGESTS = {
	golden: '2f5d4e55813dce6c29acc1e691e97b6a3ea0c055003de4801434657578b447a4',
	'incomplete-rf': 'f2fed8218a766ee614f9869893c3f8732e42c71a8017bfd5fd4cdad137b2f810',
	'duplicate-position-draft': 'a3f2fea3226e2df47cded6dd735e57623c7c8325d015d4509f03a5c1de2880af',
	'missing-positive-rate': '39defa5487cf308d1a019a3ec34ce7e74927f78cee5d42a0ebbc84441e3b1d02',
	'over-capacity-draft': 'f223cb20303da4af639431257f1a397be2ac7f26fa96830d74988e65a7683b46'
} as const;

export const GOLDEN_INPUT_DIGEST = PINNED_INPUT_DIGESTS.golden;

export const goldenExpected: readonly HandDerivedScenarioExpectation[] = [
	{
		scenarioId: 'baseline',
		rosterMembers: 10,
		allocatedPA: 360,
		unallocatedPA: 0,
		defensiveOutsPerFieldingPosition: 270,
		totalPositionOuts: 2160,
		defensiveShortfallOuts: 0,
		offensiveRuns: '6.4',
		offensiveDelta: '0',
		feasibility: 'feasible',
		ready: false,
		readinessBlockingCode: 'ACKNOWLEDGMENT_REQUIRED'
	},
	{
		scenarioId: 'candidate-a',
		rosterMembers: 10,
		allocatedPA: 360,
		unallocatedPA: 0,
		defensiveOutsPerFieldingPosition: 270,
		totalPositionOuts: 2160,
		defensiveShortfallOuts: 0,
		offensiveRuns: '8.4',
		offensiveDelta: '2',
		feasibility: 'feasible',
		ready: false,
		readinessBlockingCode: 'ACKNOWLEDGMENT_REQUIRED'
	},
	{
		scenarioId: 'candidate-b',
		rosterMembers: 10,
		allocatedPA: 360,
		unallocatedPA: 0,
		defensiveOutsPerFieldingPosition: 270,
		totalPositionOuts: 2160,
		defensiveShortfallOuts: 0,
		offensiveRuns: '7.6',
		offensiveDelta: '1.2',
		feasibility: 'feasible',
		ready: false,
		readinessBlockingCode: 'ACKNOWLEDGMENT_REQUIRED'
	}
];

function cloneGolden(): Bundle {
	return structuredClone(goldenBundle);
}

type RevisionTarget = 'none' | 'baseline' | 'candidate-a' | 'all-scenarios' | 'shared';

function applyFixtureIdentityAndRevision(bundle: Bundle, id: string, target: RevisionTarget): void {
	bundle.bundleId = id === 'golden' ? goldenBundle.bundleId : `synthetic-comparison-${id}`;
	if (target === 'shared') {
		bundle.dataset.revision += 1;
		bundle.comparison.revision += 1;
		bundle.comparison.datasetRef.revision = bundle.dataset.revision;
		for (const scenario of [bundle.comparison.baseline, ...bundle.comparison.candidates]) {
			scenario.revision += 1;
			scenario.review.uncheckedTransactionRulesAcknowledgedAt = null;
			scenario.review.acknowledgedScenarioRevision = null;
		}
		return;
	}
	const scenarios =
		target === 'all-scenarios'
			? [bundle.comparison.baseline, ...bundle.comparison.candidates]
			: target === 'baseline'
				? [bundle.comparison.baseline]
				: target === 'candidate-a'
					? [bundle.comparison.candidates[0]]
					: [];
	for (const scenario of scenarios) {
		if (!scenario) continue;
		scenario.revision += 1;
		scenario.review.uncheckedTransactionRulesAcknowledgedAt = null;
		scenario.review.acknowledgedScenarioRevision = null;
	}
}

function acceptedFixture(
	id: string,
	acceptanceCase: string,
	mutate: (bundle: Bundle) => void,
	revisionTarget: RevisionTarget = 'none',
	expectedIssueCodes: string[] = []
): SyntheticFixture {
	const bundle = cloneGolden();
	applyFixtureIdentityAndRevision(bundle, id, revisionTarget);
	mutate(bundle);
	const validation = validateBundle(bundle);
	if (!validation.success) throw new Error(`fixture ${id} unexpectedly rejected`);
	const inputDigest = computeInputDigest(validation.data);
	if (
		id in PINNED_INPUT_DIGESTS &&
		inputDigest !== PINNED_INPUT_DIGESTS[id as keyof typeof PINNED_INPUT_DIGESTS]
	) {
		throw new Error(`fixture ${id} digest is not pinned to its current input`);
	}
	return {
		id,
		acceptanceCase,
		expectedImport: 'accepted',
		bundle: validation.data,
		inputDigest:
			id in PINNED_INPUT_DIGESTS
				? PINNED_INPUT_DIGESTS[id as keyof typeof PINNED_INPUT_DIGESTS]
				: inputDigest,
		expectedIssueCodes,
		...(id === 'golden'
			? { expected: goldenExpected, calculationVersion: 'hand-derived-acceptance-v1' as const }
			: {})
	};
}

function rejectedFixture(
	id: string,
	acceptanceCase: string,
	mutate: (bundle: Bundle) => void,
	revisionTarget: RevisionTarget = 'none'
): SyntheticFixture {
	const bundle = cloneGolden();
	applyFixtureIdentityAndRevision(bundle, id, revisionTarget);
	mutate(bundle);
	const validation = validateBundle(bundle);
	if (validation.success) throw new Error(`fixture ${id} unexpectedly accepted`);
	return {
		id,
		acceptanceCase,
		expectedImport: 'rejected',
		bundle,
		inputDigest: null,
		expectedIssueCodes: validation.issues.map((candidate) => candidate.code)
	};
}

export const fixtureRegistry: readonly SyntheticFixture[] = [
	acceptedFixture('golden', 'C-01', () => []),
	acceptedFixture(
		'incomplete-rf',
		'C-02',
		(bundle) => {
			for (const scenario of [bundle.comparison.baseline, ...bundle.comparison.candidates]) {
				for (const allocation of scenario.allocations) {
					const assignment = allocation.assignments.find((candidate) => candidate.order === 8);
					if (assignment) assignment.playerId = null;
				}
			}
		},
		'all-scenarios'
	),
	acceptedFixture(
		'duplicate-position-draft',
		'C-03',
		(bundle) => {
			const assignment = bundle.comparison.baseline.allocations[0]?.assignments.find(
				({ order }) => order === 3
			);
			if (assignment) assignment.playerId = 'p-ss';
		},
		'baseline'
	),
	acceptedFixture(
		'missing-positive-rate',
		'C-14',
		(bundle) => {
			const projection = bundle.dataset.projections.find(({ playerId }) => playerId === 'p-a');
			if (projection) projection.overall = null;
		},
		'shared'
	),
	acceptedFixture(
		'over-capacity-draft',
		'C-06',
		(bundle) => {
			const cap = bundle.comparison.candidates[0]?.workloadCaps.find(
				({ playerId }) => playerId === 'p-a'
			);
			if (cap) cap.maxPA = 39;
		},
		'candidate-a'
	),
	rejectedFixture('unknown-field', 'C-18', (bundle) => {
		(bundle as Bundle & { typo?: string }).typo = 'must reject';
	}),
	rejectedFixture('unsupported-version', 'C-18', (bundle) => {
		bundle.schemaVersion = '2.0';
	}),
	rejectedFixture(
		'duplicate-projection-key',
		'C-18',
		(bundle) => {
			const first = bundle.dataset.projections[0];
			if (first) bundle.dataset.projections.push(structuredClone(first));
		},
		'shared'
	),
	rejectedFixture('half-filled-acknowledgment', 'C-18', (bundle) => {
		bundle.comparison.baseline.review.uncheckedTransactionRulesAcknowledgedAt =
			'2026-09-19T00:00:00Z';
	}),
	rejectedFixture(
		'nonmember-cost',
		'C-26',
		(bundle) => {
			bundle.comparison.baseline.constraints.costs.push({
				playerId: 'p-a',
				currency: 'XTS',
				period: 'pilot-horizon',
				minorUnits: 1,
				sourceId: 'synthetic-source'
			});
		},
		'baseline'
	)
];

export function getFixture(id: string): SyntheticFixture | undefined {
	return fixtureRegistry.find((fixture) => fixture.id === id);
}

export type FixtureCalculationStub = Pick<
	CalculationResult,
	'calculationVersion' | 'scenarioId' | 'scenarioRevision'
>;
