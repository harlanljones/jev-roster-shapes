import {
	BATTING_ROLES,
	DEFENSIVE_POSITIONS,
	ResultSchema,
	compareIssues,
	computeInputDigest,
	validateBundle,
	type Allocation,
	type Bundle,
	type CalculationResult,
	type ConstraintResult,
	type Coverage,
	type Exposure,
	type Issue,
	type Offense,
	type Scenario,
	type Slot,
	type Template,
	type Workload
} from '../contracts';

export const CALCULATION_VERSION = 'deterministic-engine-v1';

const MAX_SAFE_BIGINT = BigInt(Number.MAX_SAFE_INTEGER);
const DECIMAL_SCALE = 1_000_000n;
const DECIMAL_SCALE_DIGITS = 6;

type ScenarioContext = {
	scenario: Scenario;
	scenarioPath: string;
	scenarioIndex: number;
	validationIssues: Issue[];
};

type AssignmentContext = {
	template: Template;
	templateIndex: number;
	allocation: Allocation;
	allocationIndex: number;
	slot: Slot;
	slotIndex: number;
	assignment: Allocation['assignments'][number];
	assignmentIndex: number;
	playerId: string | null;
	player: Bundle['dataset']['players'][number] | undefined;
	path: string;
};

type Audit = {
	issues: Issue[];
	invalid: boolean;
	incomplete: boolean;
	assignments: AssignmentContext[];
	byTemplateAndOrder: Map<string, AssignmentContext>;
	demandByTemplate: Map<string, number>;
	overflow: boolean;
};

export type TemplatePAReconciliation = {
	templateId: string;
	demandPA: number;
	allocatedPA: number | null;
	unallocatedPA: number | null;
};

export type PAReconciliation = {
	scenarioId: string;
	templates: readonly TemplatePAReconciliation[];
	totalDemandPA: number;
	allocatedPA: number | null;
	unallocatedPA: number | null;
	conserved: boolean | null;
};

export type OffenseDelta = {
	baselineScenarioId: string;
	scenarioId: string;
	status: Offense['status'];
	runs: string | null;
	reasons: Issue[];
};

export type ScenarioEvaluation = {
	result: CalculationResult;
	paReconciliation: PAReconciliation;
};

export type ComparisonCalculation = {
	calculationVersion: typeof CALCULATION_VERSION;
	inputDigest: string;
	results: readonly CalculationResult[];
	evaluations: readonly ScenarioEvaluation[];
	offenseDeltas: readonly OffenseDelta[];
};

export type ResultValidation = ReturnType<typeof ResultSchema.safeParse>;

function scenarioList(bundle: Bundle): Scenario[] {
	return [bundle.comparison.baseline, ...bundle.comparison.candidates];
}

function scenarioPath(bundle: Bundle, scenarioId: string): string {
	if (bundle.comparison.baseline.id === scenarioId) return '/comparison/baseline';
	const candidateIndex = bundle.comparison.candidates.findIndex(({ id }) => id === scenarioId);
	return `/comparison/candidates/${candidateIndex}`;
}

function getScenarioContext(
	bundle: Bundle,
	scenarioOrId: Scenario | string,
	validationIssues: Issue[]
): ScenarioContext {
	const scenarioId = typeof scenarioOrId === 'string' ? scenarioOrId : scenarioOrId.id;
	const scenarios = scenarioList(bundle);
	const scenarioIndex = scenarios.findIndex(({ id }) => id === scenarioId);
	const scenario = scenarios[scenarioIndex];
	if (!scenario) throw new Error(`scenario '${scenarioId}' does not exist in this bundle`);
	const path = scenarioPath(bundle, scenario.id);
	return {
		scenario,
		scenarioPath: path,
		scenarioIndex,
		validationIssues: validationIssues.filter((candidate) => {
			if (candidate.path.startsWith('/results/')) return false;
			if (!candidate.path.startsWith('/comparison/')) return true;
			return candidate.path === path || candidate.path.startsWith(`${path}/`);
		})
	};
}

function makeIssue(code: string, path: string, message: string, playerIds: string[] = []): Issue {
	return { code, path, message, playerIds: [...new Set(playerIds)].sort() };
}

function deduplicateIssues(issues: Issue[]): Issue[] {
	const unique = new Map<string, Issue>();
	for (const candidate of issues) {
		const key = `${candidate.path}\u0000${candidate.code}\u0000${candidate.playerIds.join(',')}`;
		if (!unique.has(key)) unique.set(key, candidate);
	}
	return [...unique.values()].sort(compareIssues);
}

function issueCodes(issues: readonly Issue[]): string[] {
	return [...new Set(issues.map(({ code }) => code))];
}

function addCheckedNumber(left: number, right: number, onOverflow: () => void): number {
	if (right > Number.MAX_SAFE_INTEGER - left) {
		onOverflow();
		return 0;
	}
	return left + right;
}

function multiplyChecked(left: number, right: number, onOverflow: () => void): number {
	if (left !== 0 && right > Math.floor(Number.MAX_SAFE_INTEGER / left)) {
		onOverflow();
		return 0;
	}
	return left * right;
}

function sumExposure(exposure: Exposure, onOverflow: () => void): number {
	return addCheckedNumber(
		addCheckedNumber(exposure.L, exposure.R, onOverflow),
		exposure.unknown,
		onOverflow
	);
}

function assignmentPath(
	scenarioPath: string,
	allocationIndex: number,
	assignmentIndex: number,
	field = 'playerId'
): string {
	return `${scenarioPath}/allocations/${allocationIndex}/assignments/${assignmentIndex}/${field}`;
}

function capPath(scenarioPath: string, capIndex: number, field: string): string {
	return `${scenarioPath}/workloadCaps/${capIndex}/${field}`;
}

function auditScenario(bundle: Bundle, context: ScenarioContext): Audit {
	const { scenario, scenarioPath: path } = context;
	const issues: Issue[] = [...context.validationIssues];
	let invalid = issues.some((candidate) => candidate.code === 'INVALID_SCHEMA');
	let incomplete = false;
	let overflow = false;
	const assignments: AssignmentContext[] = [];
	const byTemplateAndOrder = new Map<string, AssignmentContext>();
	const demandByTemplate = new Map<string, number>();
	const playerById = new Map(bundle.dataset.players.map((player) => [player.id, player]));
	const memberSet = new Set(scenario.memberIds);
	const baseline = bundle.comparison.baseline;
	const expectedMembers =
		scenario.id === baseline.id
			? baseline.memberIds
			: [
					...baseline.memberIds.filter((id) => !scenario.outgoingIds.includes(id)),
					...scenario.incomingIds
				];
	if (
		new Set(expectedMembers).size !== memberSet.size ||
		expectedMembers.some((id) => !memberSet.has(id)) ||
		scenario.memberIds.some((id) => !expectedMembers.includes(id)) ||
		(scenario.id === baseline.id &&
			(scenario.incomingIds.length > 0 || scenario.outgoingIds.length > 0))
	) {
		invalid = true;
		issues.push(
			makeIssue(
				'MEMBERSHIP_MISMATCH',
				`${path}/memberIds`,
				'scenario membership does not match its transaction lists'
			)
		);
	}

	for (const [templateIndex, template] of bundle.assumptions.templates.entries()) {
		const allocationIndex = scenario.allocations.findIndex(
			({ templateId }) => templateId === template.id
		);
		const allocation = scenario.allocations[allocationIndex];
		if (!allocation) {
			invalid = true;
			issues.push(
				makeIssue(
					'INVALID_SCHEMA',
					`${path}/allocations`,
					`allocation for template '${template.id}' is missing`
				)
			);
			continue;
		}
		const templateDemand = template.slots.reduce(
			(total, slot) =>
				addCheckedNumber(
					total,
					sumExposure(slot.paByPitcherHand, () => (overflow = true)),
					() => {
						overflow = true;
					}
				),
			0
		);
		multiplyChecked(template.games, template.defensiveOutsPerGame, () => (overflow = true));
		demandByTemplate.set(template.id, templateDemand);
		const seenPlayers = new Map<string, AssignmentContext>();
		for (const [slotIndex, slot] of template.slots.entries()) {
			const assignmentIndex = allocation.assignments.findIndex(({ order }) => order === slot.order);
			const assignment = allocation.assignments[assignmentIndex];
			if (!assignment) {
				invalid = true;
				issues.push(
					makeIssue(
						'INVALID_SCHEMA',
						`${path}/allocations/${allocationIndex}/assignments`,
						`assignment for order ${slot.order} is missing`
					)
				);
				continue;
			}
			const assignmentContext: AssignmentContext = {
				template,
				templateIndex,
				allocation,
				allocationIndex,
				slot,
				slotIndex,
				assignment,
				assignmentIndex,
				playerId: assignment.playerId,
				player: assignment.playerId ? playerById.get(assignment.playerId) : undefined,
				path: assignmentPath(path, allocationIndex, assignmentIndex)
			};
			assignments.push(assignmentContext);
			byTemplateAndOrder.set(`${template.id}\u0000${slot.order}`, assignmentContext);
			if (assignment.playerId === null) {
				incomplete = true;
				issues.push(
					makeIssue(
						'UNASSIGNED_SLOT',
						assignmentContext.path,
						`slot ${slot.order} in template '${template.id}' is unassigned`
					)
				);
				continue;
			}
			if (!memberSet.has(assignment.playerId)) {
				invalid = true;
				issues.push(
					makeIssue(
						'MEMBERSHIP_MISMATCH',
						assignmentContext.path,
						'assigned player is not a scenario member',
						[assignment.playerId]
					)
				);
			}
			const prior = seenPlayers.get(assignment.playerId);
			if (prior) {
				invalid = true;
				issues.push(
					makeIssue(
						'DUPLICATE_ASSIGNMENT',
						assignmentContext.path,
						`player is assigned to more than one simultaneous slot; first assignment at ${prior.path}`,
						[assignment.playerId]
					)
				);
			} else {
				seenPlayers.set(assignment.playerId, assignmentContext);
			}
			if (!assignmentContext.player) {
				invalid = true;
				issues.push(
					makeIssue(
						'UNKNOWN_REFERENCE',
						assignmentContext.path,
						'assigned player does not resolve in the dataset',
						[assignment.playerId]
					)
				);
			} else if (
				slot.role !== 'DH' &&
				!assignmentContext.player.eligiblePositions.includes(slot.role)
			) {
				invalid = true;
				issues.push(
					makeIssue(
						'INELIGIBLE_POSITION',
						assignmentContext.path,
						`player is not eligible for position '${slot.role}'`,
						[assignment.playerId]
					)
				);
			}
			if (!BATTING_ROLES.includes(slot.role)) {
				invalid = true;
				issues.push(
					makeIssue(
						'INVALID_SCHEMA',
						`${path}/allocations/${allocationIndex}/assignments/${assignmentIndex}/order`,
						`assignment role '${slot.role}' is not a supported batting role`
					)
				);
			}
		}
	}

	if (overflow) {
		issues.push(
			makeIssue(
				'NUMERIC_OVERFLOW',
				`${path}/allocations`,
				'input products or sums exceed the calculation safe-integer bound'
			)
		);
		invalid = true;
	}

	return {
		issues,
		invalid,
		incomplete,
		assignments,
		byTemplateAndOrder,
		demandByTemplate,
		overflow
	};
}

function checkedWorkload(
	bundle: Bundle,
	context: ScenarioContext,
	audit: Audit
): { workload: Workload[]; overflow: boolean } {
	const values = new Map<
		string,
		{ starts: number; defensiveOuts: number; PA: number; exposure: Exposure }
	>();
	let overflow = audit.overflow;
	for (const playerId of context.scenario.memberIds) {
		values.set(playerId, {
			starts: 0,
			defensiveOuts: 0,
			PA: 0,
			exposure: { L: 0, R: 0, unknown: 0 }
		});
	}
	for (const assignment of audit.assignments) {
		if (!assignment.playerId || !values.has(assignment.playerId)) continue;
		const value = values.get(assignment.playerId);
		if (!value) continue;
		value.starts = addCheckedNumber(
			value.starts,
			assignment.template.games,
			() => (overflow = true)
		);
		if (assignment.slot.role !== 'DH') {
			const outs = multiplyChecked(
				assignment.template.games,
				assignment.template.defensiveOutsPerGame,
				() => (overflow = true)
			);
			value.defensiveOuts = addCheckedNumber(value.defensiveOuts, outs, () => (overflow = true));
		}
		const exposure = assignment.slot.paByPitcherHand;
		value.exposure.L = addCheckedNumber(value.exposure.L, exposure.L, () => (overflow = true));
		value.exposure.R = addCheckedNumber(value.exposure.R, exposure.R, () => (overflow = true));
		value.exposure.unknown = addCheckedNumber(
			value.exposure.unknown,
			exposure.unknown,
			() => (overflow = true)
		);
		value.PA = sumExposure(value.exposure, () => (overflow = true));
	}
	const workload = [...values.entries()]
		.sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
		.map(([playerId, value]) => ({
			playerId,
			starts: value.starts,
			defensiveOuts: value.defensiveOuts,
			PA: value.PA,
			paByPitcherHand: value.exposure
		}));
	return { workload, overflow };
}

function calculateCoverage(bundle: Bundle, audit: Audit, invalid: boolean): Coverage[] {
	return bundle.assumptions.templates.flatMap((template) =>
		DEFENSIVE_POSITIONS.map((position) => {
			const demand = audit.demandByTemplate.get(template.id);
			const positionDemand = multiplyChecked(
				template.games,
				template.defensiveOutsPerGame,
				() => undefined
			);
			if (invalid || demand === undefined) {
				return {
					templateId: template.id,
					position,
					demandOuts: null,
					allocatedOuts: null,
					shortfallOuts: null
				};
			}
			const slot = template.slots.find(({ role }) => role === position);
			const assignment = slot
				? audit.byTemplateAndOrder.get(`${template.id}\u0000${slot.order}`)
				: undefined;
			const allocatedOuts = assignment?.playerId ? positionDemand : 0;
			return {
				templateId: template.id,
				position,
				demandOuts: positionDemand,
				allocatedOuts,
				shortfallOuts: positionDemand - allocatedOuts
			};
		})
	);
}

function buildPAReconciliation(
	bundle: Bundle,
	scenario: Scenario,
	audit: Audit,
	invalid: boolean
): PAReconciliation {
	const templates = bundle.assumptions.templates.map((template) => {
		const demandPA = audit.demandByTemplate.get(template.id) ?? 0;
		if (invalid)
			return { templateId: template.id, demandPA, allocatedPA: null, unallocatedPA: null };
		let allocatedPA = 0;
		for (const slot of template.slots) {
			const assignment = audit.byTemplateAndOrder.get(`${template.id}\u0000${slot.order}`);
			if (assignment?.playerId) {
				allocatedPA = addCheckedNumber(
					allocatedPA,
					sumExposure(slot.paByPitcherHand, () => undefined),
					() => undefined
				);
			}
		}
		return {
			templateId: template.id,
			demandPA,
			allocatedPA,
			unallocatedPA: demandPA - allocatedPA
		};
	});
	const totalDemandPA = templates.reduce((total, template) => total + template.demandPA, 0);
	if (invalid) {
		return {
			scenarioId: scenario.id,
			templates,
			totalDemandPA,
			allocatedPA: null,
			unallocatedPA: null,
			conserved: null
		};
	}
	const allocatedPA = templates.reduce((total, template) => total + (template.allocatedPA ?? 0), 0);
	return {
		scenarioId: scenario.id,
		templates,
		totalDemandPA,
		allocatedPA,
		unallocatedPA: totalDemandPA - allocatedPA,
		conserved: allocatedPA + (totalDemandPA - allocatedPA) === totalDemandPA
	};
}

function projectionPath(bundle: Bundle, playerId: string, field?: string): string {
	const index = bundle.dataset.projections.findIndex(
		(projection) =>
			projection.playerId === playerId &&
			projection.metricDefinitionId === bundle.assumptions.metricDefinitionId
	);
	return index === -1
		? '/dataset/projections'
		: `/dataset/projections/${index}${field ? `/${field}` : ''}`;
}

function parseMillionths(value: string): bigint {
	const negative = value.startsWith('-');
	const unsigned = negative ? value.slice(1) : value;
	const [whole = '0', fraction = ''] = unsigned.split('.');
	const scaled = BigInt(whole) * DECIMAL_SCALE + BigInt(fraction.padEnd(DECIMAL_SCALE_DIGITS, '0'));
	return negative ? -scaled : scaled;
}

export function formatMillionths(value: bigint): string {
	if (value === 0n) return '0';
	const negative = value < 0n;
	const absolute = negative ? -value : value;
	const whole = absolute / DECIMAL_SCALE;
	const fraction = (absolute % DECIMAL_SCALE)
		.toString()
		.padStart(DECIMAL_SCALE_DIGITS, '0')
		.replace(/0+$/, '');
	return `${negative ? '-' : ''}${whole.toString()}${fraction ? `.${fraction}` : ''}`;
}

export function decimalToMillionths(value: string): bigint {
	return parseMillionths(value);
}

function addMillionthsChecked(left: bigint, right: bigint, onOverflow: () => void): bigint {
	const sum = left + right;
	if (sum > MAX_SAFE_BIGINT || sum < -MAX_SAFE_BIGINT) onOverflow();
	return sum;
}

function multiplyMillionthsChecked(left: number, right: string, onOverflow: () => void): bigint {
	const product = BigInt(left) * parseMillionths(right);
	if (product > MAX_SAFE_BIGINT || product < -MAX_SAFE_BIGINT) onOverflow();
	return product;
}

function rateIssue(
	bundle: Bundle,
	context: ScenarioContext,
	code: 'MISSING_RATE' | 'UNKNOWN_EXPOSURE' | 'METRIC_MISMATCH' | 'NUMERIC_OVERFLOW',
	path: string,
	message: string,
	playerIds: string[] = []
): Issue {
	return makeIssue(code, path, message, playerIds);
}

function calculateOffense(
	bundle: Bundle,
	context: ScenarioContext,
	audit: Audit,
	workload: Workload[],
	feasibility: CalculationResult['feasibility'],
	issues: Issue[]
): Offense {
	const reasons: Issue[] = [];
	if (feasibility !== 'feasible') {
		return {
			status: 'unavailable',
			runs: null,
			reasons: deduplicateIssues(
				issues.filter(
					(candidate) =>
						candidate.code !== 'ACKNOWLEDGMENT_REQUIRED' &&
						candidate.code !== 'CONSTRAINT_EXCEEDED' &&
						candidate.code !== 'CONSTRAINT_UNKNOWN'
				)
			)
		};
	}

	const metric = bundle.dataset.metricDefinitions.find(
		({ id }) => id === bundle.assumptions.metricDefinitionId
	);
	if (!metric || metric.unit !== 'runs_per_PA') {
		return {
			status: 'unavailable',
			runs: null,
			reasons: [
				rateIssue(
					bundle,
					context,
					'METRIC_MISMATCH',
					'/assumptions/metricDefinitionId',
					'selected metric definition is not compatible with runs per PA'
				)
			]
		};
	}

	const projections = new Map(
		bundle.dataset.projections
			.filter(
				({ metricDefinitionId }) => metricDefinitionId === bundle.assumptions.metricDefinitionId
			)
			.map((projection) => [projection.playerId, projection])
	);
	let total = 0n;
	let overflow = false;
	for (const workloadValue of workload) {
		if (workloadValue.PA === null || workloadValue.PA === 0) continue;
		const projection = projections.get(workloadValue.playerId);
		if (!projection) {
			const missing = rateIssue(
				bundle,
				context,
				'MISSING_RATE',
				projectionPath(bundle, workloadValue.playerId),
				'positive plate appearances have no projection row',
				[workloadValue.playerId]
			);
			reasons.push(missing);
			continue;
		}
		if (projection.sourceId !== metric.sourceId) {
			reasons.push(
				rateIssue(
					bundle,
					context,
					'METRIC_MISMATCH',
					projectionPath(bundle, workloadValue.playerId, 'sourceId'),
					'projection source does not match the selected metric source',
					[workloadValue.playerId]
				)
			);
			continue;
		}
		if (bundle.assumptions.offenseMode === 'overall') {
			const overall = projection.overall;
			if (overall === null) {
				reasons.push(
					rateIssue(
						bundle,
						context,
						'MISSING_RATE',
						projectionPath(bundle, workloadValue.playerId, 'overall'),
						'positive plate appearances have no overall rate',
						[workloadValue.playerId]
					)
				);
				continue;
			}
			total = addMillionthsChecked(
				total,
				multiplyMillionthsChecked(workloadValue.PA, overall, () => (overflow = true)),
				() => (overflow = true)
			);
			continue;
		}
		if (workloadValue.paByPitcherHand?.unknown && workloadValue.paByPitcherHand.unknown > 0) {
			reasons.push(
				rateIssue(
					bundle,
					context,
					'UNKNOWN_EXPOSURE',
					`${context.scenarioPath}/allocations`,
					'positive unknown pitcher-hand exposure prevents split contribution',
					[workloadValue.playerId]
				)
			);
			continue;
		}
		const exposure = workloadValue.paByPitcherHand;
		if (!exposure) continue;
		for (const [hand, rate, rateField] of [
			['L', projection.vsL, 'vsL'],
			['R', projection.vsR, 'vsR']
		] as const) {
			const count = exposure[hand];
			if (count === 0) continue;
			if (rate === null) {
				reasons.push(
					rateIssue(
						bundle,
						context,
						'MISSING_RATE',
						projectionPath(bundle, workloadValue.playerId, rateField),
						`positive ${hand} pitcher-hand exposure has no split rate`,
						[workloadValue.playerId]
					)
				);
				continue;
			}
			total = addMillionthsChecked(
				total,
				multiplyMillionthsChecked(count, rate, () => (overflow = true)),
				() => (overflow = true)
			);
		}
	}
	if (overflow) {
		reasons.push(
			rateIssue(
				bundle,
				context,
				'NUMERIC_OVERFLOW',
				`${context.scenarioPath}/allocations`,
				'offensive products exceed the calculation safe-integer bound'
			)
		);
	}
	if (reasons.length > 0)
		return { status: 'unavailable', runs: null, reasons: deduplicateIssues(reasons) };
	return { status: 'available', runs: formatMillionths(total), reasons: [] };
}

function evaluateConstraints(
	context: ScenarioContext,
	workload: Workload[],
	issues: Issue[]
): { rosterSize: ConstraintResult; cost: ConstraintResult } {
	const { scenario, scenarioPath: path } = context;
	const rosterSizeReasons: Issue[] = [];
	if (scenario.constraints.rosterSizeMax === null) {
		// Disabled is an explicit state and does not block readiness.
	} else if (scenario.memberIds.length > scenario.constraints.rosterSizeMax) {
		rosterSizeReasons.push(
			makeIssue(
				'CONSTRAINT_EXCEEDED',
				`${path}/constraints/rosterSizeMax`,
				`roster size ${scenario.memberIds.length} exceeds maximum ${scenario.constraints.rosterSizeMax}`
			)
		);
	}
	const rosterSize: ConstraintResult =
		scenario.constraints.rosterSizeMax === null
			? { status: 'unchecked', reasons: [] }
			: rosterSizeReasons.length > 0
				? { status: 'failed', reasons: rosterSizeReasons }
				: { status: 'passed', reasons: [] };

	if (!scenario.constraints.costBudget)
		return { rosterSize, cost: { status: 'unchecked', reasons: [] } };
	const budget = scenario.constraints.costBudget;
	const costsByPlayer = new Map<string, (typeof scenario.constraints.costs)[number]>();
	for (const cost of scenario.constraints.costs) {
		if (!scenario.memberIds.includes(cost.playerId)) continue;
		if (cost.currency !== budget.currency || cost.period !== budget.period) {
			issues.push(
				makeIssue(
					'CONSTRAINT_UNKNOWN',
					`${path}/constraints/costs/${scenario.constraints.costs.indexOf(cost)}`,
					'cost currency or period does not match the enabled budget',
					[cost.playerId]
				)
			);
			continue;
		}
		if (costsByPlayer.has(cost.playerId)) {
			issues.push(
				makeIssue(
					'CONSTRAINT_UNKNOWN',
					`${path}/constraints/costs`,
					'multiple costs prevent a deterministic budget check',
					[cost.playerId]
				)
			);
			continue;
		}
		costsByPlayer.set(cost.playerId, cost);
	}
	const missing = scenario.memberIds.filter((playerId) => !costsByPlayer.has(playerId));
	if (missing.length > 0) {
		return {
			rosterSize,
			cost: {
				status: 'unknown',
				reasons: [
					makeIssue(
						'CONSTRAINT_UNKNOWN',
						`${path}/constraints/costs`,
						'enabled cost budget is missing a matching cost for one or more members',
						missing
					)
				]
			}
		};
	}
	let total = 0;
	let overflow = false;
	for (const cost of costsByPlayer.values()) {
		total = addCheckedNumber(total, cost.minorUnits, () => (overflow = true));
	}
	if (overflow) {
		return {
			rosterSize,
			cost: {
				status: 'unknown',
				reasons: [
					makeIssue(
						'NUMERIC_OVERFLOW',
						`${path}/constraints/costs`,
						'cost total exceeds the calculation safe-integer bound'
					)
				]
			}
		};
	}
	if (total > budget.maxMinorUnits) {
		return {
			rosterSize,
			cost: {
				status: 'failed',
				reasons: [
					makeIssue(
						'CONSTRAINT_EXCEEDED',
						`${path}/constraints/costBudget/maxMinorUnits`,
						`cost total ${total} exceeds budget ${budget.maxMinorUnits}`
					)
				]
			}
		};
	}
	void workload;
	return { rosterSize, cost: { status: 'passed', reasons: [] } };
}

function calculateScenarioWithValidation(
	bundle: Bundle,
	context: ScenarioContext,
	inputDigest: string
): ScenarioEvaluation {
	const audit = auditScenario(bundle, context);
	const workloadState = checkedWorkload(bundle, context, audit);
	if (workloadState.overflow) {
		audit.invalid = true;
		audit.issues.push(
			makeIssue(
				'NUMERIC_OVERFLOW',
				`${context.scenarioPath}/allocations`,
				'workload products or sums exceed the calculation safe-integer bound'
			)
		);
	}
	const constraints = evaluateConstraints(context, workloadState.workload, audit.issues);
	const capByPlayer = new Map(
		context.scenario.workloadCaps.map((cap, index) => [cap.playerId, { cap, index }])
	);
	for (const workload of workloadState.workload) {
		const capEntry = capByPlayer.get(workload.playerId);
		if (!capEntry) continue;
		const { cap, index } = capEntry;
		for (const [field, actual, codeLabel] of [
			['maxStarts', workload.starts, 'starts'],
			['maxDefensiveOuts', workload.defensiveOuts, 'defensive outs'],
			['maxPA', workload.PA, 'PA']
		] as const) {
			if (actual === null) continue;
			const hasAllocation = actual > 0;
			const limit = cap[field];
			if (limit === null && hasAllocation) {
				audit.incomplete = true;
				audit.issues.push(
					makeIssue(
						'CAP_UNKNOWN',
						capPath(context.scenarioPath, index, field),
						`allocated ${codeLabel} has no known capacity limit`,
						[workload.playerId]
					)
				);
			} else if (limit !== null && actual > limit) {
				audit.invalid = true;
				audit.issues.push(
					makeIssue(
						'CAP_EXCEEDED',
						capPath(context.scenarioPath, index, field),
						`allocated ${codeLabel} ${actual} exceeds limit ${limit}`,
						[workload.playerId]
					)
				);
			}
		}
	}
	const feasibility: CalculationResult['feasibility'] = audit.invalid
		? 'invalid'
		: audit.incomplete
			? 'incomplete'
			: 'feasible';
	const issues = deduplicateIssues(audit.issues);
	const coverage = calculateCoverage(bundle, audit, feasibility === 'invalid');
	const workload =
		feasibility === 'invalid'
			? [...context.scenario.memberIds].sort().map((playerId) => ({
					playerId,
					starts: null,
					defensiveOuts: null,
					PA: null,
					paByPitcherHand: null
				}))
			: workloadState.workload;
	const offense = calculateOffense(
		bundle,
		context,
		audit,
		workloadState.workload,
		feasibility,
		issues
	);
	const readinessIssues: Issue[] = [];
	if (
		context.scenario.review.uncheckedTransactionRulesAcknowledgedAt === null ||
		context.scenario.review.acknowledgedScenarioRevision !== context.scenario.revision
	) {
		readinessIssues.push(
			makeIssue(
				'ACKNOWLEDGMENT_REQUIRED',
				`${context.scenarioPath}/review`,
				'acknowledgment of unchecked transaction rules is required for this scenario revision'
			)
		);
	}
	if (constraints.rosterSize.status === 'failed')
		readinessIssues.push(...constraints.rosterSize.reasons);
	if (constraints.cost.status === 'failed' || constraints.cost.status === 'unknown') {
		readinessIssues.push(...constraints.cost.reasons);
	}
	if (feasibility !== 'feasible') {
		readinessIssues.push(...issues);
	}
	if (
		context.scenario.review.scope === 'coverage_and_offense' &&
		offense.status === 'unavailable'
	) {
		readinessIssues.push(...offense.reasons);
	}
	const finalIssues = deduplicateIssues([...issues, ...readinessIssues]);
	const result: CalculationResult = {
		calculationVersion: CALCULATION_VERSION,
		inputDigest,
		scenarioId: context.scenario.id,
		scenarioRevision: context.scenario.revision,
		feasibility,
		issues: finalIssues,
		workload,
		coverage,
		offense,
		constraints,
		readiness: {
			ready: readinessIssues.length === 0,
			scope: context.scenario.review.scope,
			blockingCodes: issueCodes(deduplicateIssues(readinessIssues))
		}
	};
	const validation = ResultSchema.safeParse(result);
	if (!validation.success) {
		throw new Error(
			`engine produced an invalid calculation result for '${context.scenario.id}': ${validation.error.message}`
		);
	}
	return {
		result: validation.data,
		paReconciliation: buildPAReconciliation(
			bundle,
			context.scenario,
			audit,
			feasibility === 'invalid'
		)
	};
}

function prepareBundle(bundle: Bundle): { inputDigest: string; validationIssues: Issue[] } {
	const validation = validateBundle(bundle);
	if (!validation.success) {
		throw new Error(
			`cannot calculate a rejected bundle: ${validation.issues
				.map((issue) => `${issue.code} at ${issue.path || '/'}`)
				.join(', ')}`
		);
	}
	return { inputDigest: computeInputDigest(validation.data), validationIssues: validation.issues };
}

export function calculateScenario(
	bundle: Bundle,
	scenarioOrId: Scenario | string
): CalculationResult {
	const prepared = prepareBundle(bundle);
	const context = getScenarioContext(bundle, scenarioOrId, prepared.validationIssues);
	return calculateScenarioWithValidation(bundle, context, prepared.inputDigest).result;
}

export const calculateScenarioResult = calculateScenario;

export function calculateOffenseDelta(
	baseline: CalculationResult,
	candidate: CalculationResult
): OffenseDelta {
	const reasons: Issue[] = [];
	if (baseline.inputDigest !== candidate.inputDigest) {
		reasons.push(
			makeIssue(
				'INCOMPATIBLE_COMPARISON',
				'/comparison',
				'comparison inputs use different dataset, assumptions, or scenario revisions'
			)
		);
	}
	if (baseline.offense.status !== 'available') reasons.push(...baseline.offense.reasons);
	if (candidate.offense.status !== 'available') reasons.push(...candidate.offense.reasons);
	if (reasons.length > 0) {
		return {
			baselineScenarioId: baseline.scenarioId,
			scenarioId: candidate.scenarioId,
			status: 'unavailable',
			runs: null,
			reasons: deduplicateIssues(reasons)
		};
	}
	const delta =
		parseMillionths(candidate.offense.runs ?? '0') - parseMillionths(baseline.offense.runs ?? '0');
	if (delta > MAX_SAFE_BIGINT || delta < -MAX_SAFE_BIGINT) {
		return {
			baselineScenarioId: baseline.scenarioId,
			scenarioId: candidate.scenarioId,
			status: 'unavailable',
			runs: null,
			reasons: [
				makeIssue(
					'NUMERIC_OVERFLOW',
					'/comparison',
					'offensive delta exceeds the calculation safe-integer bound'
				)
			]
		};
	}
	return {
		baselineScenarioId: baseline.scenarioId,
		scenarioId: candidate.scenarioId,
		status: 'available',
		runs: formatMillionths(delta),
		reasons: []
	};
}

export function calculateComparison(bundle: Bundle): ComparisonCalculation {
	const prepared = prepareBundle(bundle);
	const evaluations = scenarioList(bundle).map((scenario) => {
		const context = getScenarioContext(bundle, scenario, prepared.validationIssues);
		return calculateScenarioWithValidation(bundle, context, prepared.inputDigest);
	});
	const baseline = evaluations[0]?.result;
	if (!baseline) throw new Error('comparison is missing its baseline scenario');
	const offenseDeltas = evaluations.map(({ result }) => calculateOffenseDelta(baseline, result));
	return {
		calculationVersion: CALCULATION_VERSION,
		inputDigest: prepared.inputDigest,
		results: evaluations.map(({ result }) => result),
		evaluations,
		offenseDeltas
	};
}

export const calculateBundle = calculateComparison;

export function validateCalculationResult(input: unknown): ResultValidation {
	return ResultSchema.safeParse(input);
}

export const validateResult = validateCalculationResult;
