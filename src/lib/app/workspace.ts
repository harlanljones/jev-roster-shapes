import { CALCULATION_VERSION } from '$lib/engine';
import type { ComparisonCalculation } from '$lib/engine';
import type { Assignment, Bundle, CalculationResult, Scenario, Template } from '$lib/contracts';
import type {
	AssignmentView,
	AssumptionsView,
	ComparisonViewModel,
	ConstraintView,
	CoverageView,
	EvidenceView,
	MetricView,
	ScenarioView,
	TemplateView,
	UiIssue,
	UiPlayer,
	WorkloadView
} from '$lib/ui/types';

function issueView(issue: CalculationResult['issues'][number]): UiIssue {
	return {
		code: issue.code,
		message: issue.message,
		path: issue.path,
		playerIds: issue.playerIds
	};
}

function metricView(
	value: string | null,
	unit: string,
	reason: string | undefined,
	evidenceId: string
): MetricView {
	return {
		status: value === null ? 'unavailable' : 'available',
		value,
		unit,
		reason,
		evidenceId
	};
}

function playerViews(bundle: Bundle): UiPlayer[] {
	return bundle.dataset.players.map((player) => ({
		id: player.id,
		name: player.name,
		bats: player.bats,
		eligiblePositions: player.eligiblePositions
	})) satisfies UiPlayer[];
}

function assignmentView(
	slot: Template['slots'][number],
	assignment: Assignment | undefined,
	bundle: Bundle,
	result: CalculationResult,
	scenario: Scenario,
	templateId: string
): AssignmentView {
	const player = assignment?.playerId
		? bundle.dataset.players.find((candidate) => candidate.id === assignment.playerId)
		: undefined;
	const isEligible =
		assignment?.playerId !== null &&
		assignment?.playerId !== undefined &&
		player !== undefined &&
		scenario.memberIds.includes(player.id) &&
		(slot.role === 'DH' || player.eligiblePositions.includes(slot.role));
	const issue = result.issues.find(
		(candidate) =>
			candidate.path.includes(`/allocations/${templateId}`) &&
			candidate.path.includes(`/assignments/${slot.order}`)
	);

	return {
		order: slot.order,
		role: slot.role,
		pa: slot.paByPitcherHand.L + slot.paByPitcherHand.R + slot.paByPitcherHand.unknown,
		paByPitcherHand: slot.paByPitcherHand,
		playerId: assignment?.playerId ?? null,
		eligibility:
			assignment?.playerId === null || assignment?.playerId === undefined
				? 'unassigned'
				: isEligible
					? 'eligible'
					: 'ineligible',
		issue: issue ? issueView(issue) : undefined,
		evidenceId: `calculation:${result.scenarioId}`
	};
}

function templateView(
	template: Template,
	scenario: Scenario,
	result: CalculationResult,
	bundle: Bundle
): TemplateView {
	const allocation = scenario.allocations.find((candidate) => candidate.templateId === template.id);
	return {
		id: template.id,
		label: template.label,
		starterHand: template.starterHand,
		games: template.games,
		defensiveOutsPerGame: template.defensiveOutsPerGame,
		assignments: template.slots.map((slot) =>
			assignmentView(
				slot,
				allocation?.assignments.find((assignment) => assignment.order === slot.order),
				bundle,
				result,
				scenario,
				template.id
			)
		),
		evidenceId: `calculation:${result.scenarioId}`
	};
}

function workloadViews(
	bundle: Bundle,
	scenario: Scenario,
	result: CalculationResult
): WorkloadView[] {
	return scenario.memberIds.map((playerId) => {
		const workload = result.workload.find((candidate) => candidate.playerId === playerId);
		const cap = scenario.workloadCaps.find((candidate) => candidate.playerId === playerId);
		const issues = result.issues
			.filter(
				(issue) =>
					issue.playerIds.includes(playerId) || issue.path.includes(`/workloadCaps/${playerId}`)
			)
			.map(issueView);
		return {
			playerId,
			starts: workload?.starts ?? null,
			defensiveOuts: workload?.defensiveOuts ?? null,
			pa: workload?.PA ?? null,
			maxStarts: cap?.maxStarts ?? null,
			maxDefensiveOuts: cap?.maxDefensiveOuts ?? null,
			maxPa: cap?.maxPA ?? null,
			issues,
			evidenceId: `calculation:${result.scenarioId}`
		};
	});
}

function coverageViews(
	bundle: Bundle,
	scenario: Scenario,
	result: CalculationResult
): CoverageView[] {
	return result.coverage.map((row) => {
		const template = bundle.assumptions.templates.find(
			(candidate) => candidate.id === row.templateId
		);
		const issue = result.issues.find(
			(candidate) =>
				candidate.path.includes(`/templates/${row.templateId}`) &&
				(candidate.path.includes(row.position) || candidate.code.includes('COVERAGE'))
		);
		return {
			templateId: row.templateId,
			contextLabel: template?.label ?? row.templateId,
			position: row.position,
			demandOuts: row.demandOuts,
			allocatedOuts: row.allocatedOuts,
			shortfallOuts: row.shortfallOuts,
			status:
				row.demandOuts !== null && row.allocatedOuts !== null && row.shortfallOuts !== null
					? 'available'
					: 'unavailable',
			reason: issue?.message,
			evidenceId: `calculation:${result.scenarioId}`
		};
	});
}

function evidenceViews(bundle: Bundle, scenarios: readonly Scenario[]): EvidenceView[] {
	const sources = bundle.sources.map((source) => ({
		id: `source:${source.id}`,
		layer: 'source' as const,
		title: source.title,
		description: source.note,
		sourceId: source.id,
		sourceTitle: source.title,
		snapshot: source.effectiveAt,
		inputReferences: [source.id],
		limitation: bundle.dataClass === 'synthetic' ? 'Synthetic fixture; not team data.' : undefined
	}));
	const assumptions: EvidenceView = {
		id: `assumption:${bundle.assumptions.id}`,
		layer: 'assumption',
		title: 'Shared assumptions',
		description: 'The assumptions applied to the baseline and both candidates.',
		sourceId: bundle.assumptions.sourceId,
		sourceTitle: bundle.sources.find((source) => source.id === bundle.assumptions.sourceId)?.title,
		formula: bundle.dataset.metricDefinitions.find(
			(definition) => definition.id === bundle.assumptions.metricDefinitionId
		)?.id,
		inputReferences: [bundle.assumptions.id]
	};
	const calculations = scenarios.map<EvidenceView>((scenario) => ({
		id: `calculation:${scenario.id}`,
		layer: 'calculation',
		title: `${scenario.label} calculation`,
		description: 'Deterministic workload, coverage, feasibility, and offense calculation.',
		formula: CALCULATION_VERSION,
		inputReferences: [scenario.id, bundle.comparison.id],
		limitation: 'Synthetic demonstration; not a pilot outcome.'
	}));
	return [...sources, assumptions, ...calculations];
}

function scenarioView(
	bundle: Bundle,
	scenario: Scenario,
	result: CalculationResult,
	calculation: ComparisonCalculation,
	savedAt: string | null,
	unsaved: boolean
): ScenarioView {
	const evidenceId = `calculation:${scenario.id}`;
	const delta = calculation.offenseDeltas.find((candidate) => candidate.scenarioId === scenario.id);
	const constraints: ConstraintView[] = [
		{
			status: result.constraints.rosterSize.status,
			label: 'Roster size',
			reasons: result.constraints.rosterSize.reasons.map((reason) => reason.message),
			evidenceId
		},
		{
			status: result.constraints.cost.status,
			label: 'Cost budget',
			reasons: result.constraints.cost.reasons.map((reason) => reason.message),
			evidenceId
		}
	];
	return {
		id: scenario.id,
		label: scenario.label,
		revision: scenario.revision,
		memberIds: scenario.memberIds,
		incomingIds: scenario.incomingIds,
		outgoingIds: scenario.outgoingIds,
		feasibility: result.feasibility,
		calculationState: 'current',
		unsaved,
		savedAt,
		issues: result.issues.map(issueView),
		templates: bundle.assumptions.templates.map((template) =>
			templateView(template, scenario, result, bundle)
		),
		workload: workloadViews(bundle, scenario, result),
		coverage: coverageViews(bundle, scenario, result),
		offense: metricView(
			result.offense.runs,
			'runs',
			result.offense.reasons[0]?.message,
			evidenceId
		),
		offenseDelta: delta
			? metricView(delta.runs, 'runs', delta.reasons[0]?.message, evidenceId)
			: metricView(null, 'runs', 'No baseline comparison is available.', evidenceId),
		constraints,
		readiness: {
			ready: result.readiness.ready,
			scope: result.readiness.scope,
			blockingCodes: result.readiness.blockingCodes,
			acknowledgmentRequired: result.readiness.blockingCodes.includes('ACKNOWLEDGMENT_REQUIRED')
		},
		classification: undefined
	};
}

export function buildComparisonViewModel(
	bundle: Bundle,
	calculation: ComparisonCalculation,
	activeScenarioId: string,
	storageState: ComparisonViewModel['storageState'],
	storageMessage: string | undefined,
	savedAt: string | null,
	unsaved: boolean
): ComparisonViewModel {
	const scenarios = [bundle.comparison.baseline, ...bundle.comparison.candidates];
	const results = new Map(calculation.results.map((result) => [result.scenarioId, result]));
	const activeId = scenarios.some((scenario) => scenario.id === activeScenarioId)
		? activeScenarioId
		: bundle.comparison.baseline.id;
	const assumptions: AssumptionsView = {
		id: bundle.assumptions.id,
		revision: bundle.assumptions.revision,
		authorId: bundle.assumptions.authorId,
		horizonGames: bundle.assumptions.horizonGames,
		offenseMode: bundle.assumptions.offenseMode,
		metricDefinitionId: bundle.assumptions.metricDefinitionId,
		metricUnit:
			bundle.dataset.metricDefinitions.find(
				(definition) => definition.id === bundle.assumptions.metricDefinitionId
			)?.unit ?? 'runs_per_PA',
		sourceId: bundle.assumptions.sourceId,
		templates: bundle.assumptions.templates.map((template) => ({
			id: template.id,
			label: template.label,
			starterHand: template.starterHand,
			games: template.games,
			defensiveOutsPerGame: template.defensiveOutsPerGame
		})),
		evidenceId: `assumption:${bundle.assumptions.id}`
	};

	return {
		name: bundle.bundleId,
		dataClass: bundle.dataClass,
		schemaVersion: bundle.schemaVersion,
		calculationVersion: CALCULATION_VERSION,
		inputDigest: calculation.inputDigest,
		comparisonRevision: bundle.comparison.revision,
		snapshotLabel: bundle.sources[0]?.effectiveAt ?? 'Synthetic snapshot',
		activeScenarioId: activeId,
		calculationState: 'current',
		storageState,
		storageMessage,
		canSaveDraft: true,
		canExport: true,
		assumptions,
		players: playerViews(bundle),
		scenarios: scenarios.map((scenario) =>
			scenarioView(bundle, scenario, results.get(scenario.id)!, calculation, savedAt, unsaved)
		),
		evidence: evidenceViews(bundle, scenarios),
		globalIssues: []
	};
}
