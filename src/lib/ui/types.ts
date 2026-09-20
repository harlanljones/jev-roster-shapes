export const UI_POSITIONS = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'] as const;

export type UiPosition = (typeof UI_POSITIONS)[number];
export type UiScenarioId = string;
export type ReviewScope = 'coverage' | 'coverage_and_offense';
export type ScenarioFeasibility = 'feasible' | 'incomplete' | 'invalid';
export type CalculationState = 'current' | 'updating' | 'unavailable';
export type StorageState = 'saved' | 'unsaved' | 'failed';
export type EvidenceLayer = 'source' | 'assumption' | 'calculation';

export interface UiPlayer {
	id: string;
	name: string;
	bats: 'L' | 'R' | 'S' | 'unknown';
	eligiblePositions: readonly string[];
}

export interface ExposureView {
	L: number;
	R: number;
	unknown: number;
}

export interface AssignmentView {
	order: number;
	role: string;
	pa: number;
	paByPitcherHand: ExposureView;
	playerId: string | null;
	eligibility: 'eligible' | 'ineligible' | 'unassigned';
	issue?: UiIssue;
	evidenceId?: string;
}

export interface TemplateView {
	id: string;
	label: string;
	starterHand: 'L' | 'R' | 'unknown' | 'mixed';
	games: number;
	defensiveOutsPerGame: number;
	assignments: readonly AssignmentView[];
	evidenceId?: string;
}

export interface UiIssue {
	code: string;
	message: string;
	path?: string;
	playerIds?: readonly string[];
}

export interface WorkloadView {
	playerId: string;
	starts: number | null;
	defensiveOuts: number | null;
	pa: number | null;
	maxStarts: number | null;
	maxDefensiveOuts: number | null;
	maxPa: number | null;
	issues: readonly UiIssue[];
	evidenceId?: string;
}

export interface CoverageView {
	templateId: string;
	contextLabel: string;
	position: UiPosition;
	demandOuts: number | null;
	allocatedOuts: number | null;
	shortfallOuts: number | null;
	status: 'available' | 'unavailable';
	reason?: string;
	evidenceId?: string;
}

export interface MetricView {
	status: 'available' | 'unavailable';
	value: string | null;
	unit: string;
	reason?: string;
	evidenceId?: string;
}

export interface ConstraintView {
	status: 'passed' | 'failed' | 'unknown' | 'unchecked';
	label: string;
	reasons: readonly string[];
	evidenceId?: string;
}

export interface ReadinessView {
	ready: boolean;
	scope: ReviewScope;
	blockingCodes: readonly string[];
	acknowledgmentRequired: boolean;
}

export interface ClassificationView {
	status: 'unclassified' | 'current' | 'pending' | 'stale' | 'unavailable' | 'overridden';
	label?: string;
	detail?: string;
}

export interface ScenarioView {
	id: UiScenarioId;
	label: string;
	revision: number;
	memberIds: readonly string[];
	incomingIds: readonly string[];
	outgoingIds: readonly string[];
	feasibility: ScenarioFeasibility;
	calculationState: CalculationState;
	unsaved: boolean;
	savedAt: string | null;
	issues: readonly UiIssue[];
	templates: readonly TemplateView[];
	workload: readonly WorkloadView[];
	coverage: readonly CoverageView[];
	offense: MetricView;
	offenseDelta: MetricView;
	constraints: readonly ConstraintView[];
	readiness: ReadinessView;
	classification?: ClassificationView;
}

export interface AssumptionsView {
	id: string;
	revision: number;
	authorId: string;
	horizonGames: number;
	offenseMode: 'overall' | 'split';
	metricDefinitionId: string;
	metricUnit: string;
	sourceId: string;
	templates: readonly Pick<
		TemplateView,
		'id' | 'label' | 'starterHand' | 'games' | 'defensiveOutsPerGame'
	>[];
	evidenceId?: string;
}

export interface EvidenceView {
	id: string;
	layer: EvidenceLayer;
	title: string;
	description: string;
	sourceId?: string;
	sourceTitle?: string;
	snapshot?: string;
	value?: string;
	unit?: string;
	formula?: string;
	inputReferences: readonly string[];
	limitation?: string;
}

export interface ComparisonViewModel {
	name: string;
	dataClass: 'synthetic' | 'public' | 'restricted';
	schemaVersion: string;
	calculationVersion: string;
	inputDigest: string;
	comparisonRevision: number;
	snapshotLabel: string;
	activeScenarioId: UiScenarioId;
	calculationState: CalculationState;
	storageState: StorageState;
	storageMessage?: string;
	canSaveDraft: boolean;
	canExport: boolean;
	assumptions: AssumptionsView;
	players: readonly UiPlayer[];
	scenarios: readonly ScenarioView[];
	evidence: readonly EvidenceView[];
	globalIssues: readonly UiIssue[];
}

export type AssignmentChange = {
	scenarioId: UiScenarioId;
	templateId: string;
	order: number;
	playerId: string | null;
};

export type AssignmentSwap = {
	scenarioId: UiScenarioId;
	templateId: string;
	orderA: number;
	orderB: number;
};

export type AssumptionChange =
	| { kind: 'horizonGames'; value: number }
	| { kind: 'offenseMode'; value: AssumptionsView['offenseMode'] }
	| { kind: 'templateGames'; templateId: string; value: number }
	| { kind: 'defensiveOutsPerGame'; templateId: string; value: number };

export interface ComparisonWorkspaceProps {
	model: ComparisonViewModel;
	onScenarioChange?: (scenarioId: UiScenarioId) => void;
	onAssignmentChange?: (change: AssignmentChange) => void;
	onAssumptionChange?: (change: AssumptionChange) => void;
	onSaveDraft?: () => void;
	onExport?: () => void;
	onRetry?: () => void;
	onOpenEvidence?: (evidenceId: string) => void;
	onReviewScopeChange?: (scenarioId: UiScenarioId, scope: ReviewScope) => void;
	onAcknowledgeRules?: (scenarioId: UiScenarioId) => void;
}
