import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import { z } from 'zod';

export const DEFENSIVE_POSITIONS = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'] as const;
export const BATTING_ROLES = [...DEFENSIVE_POSITIONS, 'DH'] as const;
export const PITCHER_HANDS = ['L', 'R', 'unknown'] as const;

export const ISSUE_CODES = [
	'INVALID_SCHEMA',
	'UNSUPPORTED_VERSION',
	'UNKNOWN_REFERENCE',
	'DUPLICATE_ID',
	'DUPLICATE_ASSIGNMENT',
	'INELIGIBLE_POSITION',
	'MEMBERSHIP_MISMATCH',
	'CAP_EXCEEDED',
	'CAP_UNKNOWN',
	'UNASSIGNED_SLOT',
	'MISSING_RATE',
	'UNKNOWN_EXPOSURE',
	'METRIC_MISMATCH',
	'INCOMPATIBLE_COMPARISON',
	'CONSTRAINT_EXCEEDED',
	'CONSTRAINT_UNKNOWN',
	'REPLAY_UNAVAILABLE',
	'ACKNOWLEDGMENT_REQUIRED',
	'NUMERIC_OVERFLOW',
	'REPLAY_MISMATCH'
] as const;

export type IssueCode = (typeof ISSUE_CODES)[number] | (string & {});

const visibleId = z
	.string()
	.min(1)
	.regex(/^[\x21-\x7e]+$/, 'must contain visible ASCII characters without whitespace');
const nonEmptyText = z.string().trim().min(1);
const safeCount = z
	.number()
	.finite()
	.int()
	.nonnegative()
	.refine(Number.isSafeInteger, 'must be a safe integer');
const positiveCount = safeCount.refine((value) => value > 0, 'must be positive');
const decimal = z
	.string()
	.regex(/^-?(?:0|[1-9]\d*)(?:\.\d{1,6})?$/, 'must be a base-10 decimal with at most six digits');
const utcTimestamp = z
	.string()
	.regex(
		/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$/,
		'must be a UTC ISO-8601 timestamp ending in Z'
	)
	.refine((value) => !Number.isNaN(Date.parse(value)), 'must be a valid timestamp');
const currency = z.string().regex(/^[A-Z]{3}$/, 'must be a three-letter uppercase currency code');
const jsonPointerPath = z.string().refine((value) => {
	if (value === '' || !value.startsWith('/')) return value === '';
	for (const segment of value.slice(1).split('/')) {
		for (let index = 0; index < segment.length; index += 1) {
			if (segment[index] === '~' && segment[index + 1] !== '0' && segment[index + 1] !== '1')
				return false;
		}
	}
	return true;
}, 'must be an RFC 6901 JSON Pointer');

const sourceSchema = z
	.object({
		id: visibleId,
		title: nonEmptyText,
		kind: z.enum(['synthetic', 'projection', 'eligibility', 'manual']),
		effectiveAt: utcTimestamp,
		note: nonEmptyText
	})
	.strict();

const playerSchema = z
	.object({
		id: visibleId,
		name: nonEmptyText,
		bats: z.enum(['L', 'R', 'S', 'unknown']),
		eligiblePositions: z.array(z.enum(DEFENSIVE_POSITIONS)),
		sourceIds: z.array(visibleId).min(1)
	})
	.strict();

const metricDefinitionSchema = z
	.object({
		id: visibleId,
		unit: z.literal('runs_per_PA'),
		referenceBaseline: nonEmptyText,
		sourceId: visibleId,
		note: nonEmptyText
	})
	.strict();

const projectionSchema = z
	.object({
		playerId: visibleId,
		metricDefinitionId: visibleId,
		overall: decimal.nullable(),
		vsL: decimal.nullable(),
		vsR: decimal.nullable(),
		sourceId: visibleId
	})
	.strict();

const datasetSchema = z
	.object({
		id: visibleId,
		revision: positiveCount,
		sourceIds: z.array(visibleId).min(1),
		players: z.array(playerSchema),
		metricDefinitions: z.array(metricDefinitionSchema),
		projections: z.array(projectionSchema)
	})
	.strict();

const exposureSchema = z
	.object({
		L: safeCount,
		R: safeCount,
		unknown: safeCount
	})
	.strict();

const slotSchema = z
	.object({
		order: z.number().finite().int().refine(Number.isSafeInteger),
		role: z.enum(BATTING_ROLES),
		paByPitcherHand: exposureSchema
	})
	.strict();

const templateSchema = z
	.object({
		id: visibleId,
		label: nonEmptyText,
		starterHand: z.enum(['L', 'R', 'unknown', 'mixed']),
		games: safeCount,
		defensiveOutsPerGame: safeCount,
		slots: z.array(slotSchema).length(9)
	})
	.strict();

const assumptionsSchema = z
	.object({
		id: visibleId,
		revision: positiveCount,
		authorId: visibleId,
		horizonGames: safeCount,
		offenseMode: z.enum(['overall', 'split']),
		metricDefinitionId: visibleId,
		sourceId: visibleId,
		templates: z.array(templateSchema).min(1)
	})
	.strict();

const referenceSchema = z
	.object({
		id: visibleId,
		revision: positiveCount
	})
	.strict();

const assignmentSchema = z
	.object({
		order: z.number().finite().int().refine(Number.isSafeInteger),
		playerId: visibleId.nullable()
	})
	.strict();

const allocationSchema = z
	.object({
		templateId: visibleId,
		assignments: z.array(assignmentSchema).length(9)
	})
	.strict();

const workloadCapSchema = z
	.object({
		playerId: visibleId,
		maxStarts: safeCount.nullable(),
		maxDefensiveOuts: safeCount.nullable(),
		maxPA: safeCount.nullable(),
		sourceId: visibleId
	})
	.strict();

const costBudgetSchema = z
	.object({
		currency,
		period: nonEmptyText,
		maxMinorUnits: safeCount
	})
	.strict();

const costSchema = z
	.object({
		playerId: visibleId,
		currency,
		period: nonEmptyText,
		minorUnits: safeCount,
		sourceId: visibleId
	})
	.strict();

const constraintsSchema = z
	.object({
		rosterSizeMax: safeCount.nullable(),
		costBudget: costBudgetSchema.nullable(),
		costs: z.array(costSchema)
	})
	.strict();

const reviewSchema = z
	.object({
		scope: z.enum(['coverage', 'coverage_and_offense']),
		uncheckedTransactionRulesAcknowledgedAt: utcTimestamp.nullable(),
		acknowledgedScenarioRevision: positiveCount.nullable()
	})
	.strict();

const scenarioSchema = z
	.object({
		id: visibleId,
		revision: positiveCount,
		authorId: visibleId,
		label: nonEmptyText,
		memberIds: z.array(visibleId),
		incomingIds: z.array(visibleId),
		outgoingIds: z.array(visibleId),
		allocations: z.array(allocationSchema),
		workloadCaps: z.array(workloadCapSchema),
		constraints: constraintsSchema,
		review: reviewSchema
	})
	.strict();

const comparisonSchema = z
	.object({
		id: visibleId,
		revision: positiveCount,
		datasetRef: referenceSchema,
		assumptionRef: referenceSchema,
		baseline: scenarioSchema,
		candidates: z.array(scenarioSchema).max(2)
	})
	.strict();

const issueSchema = z
	.object({
		code: visibleId,
		path: jsonPointerPath,
		message: nonEmptyText,
		playerIds: z.array(visibleId)
	})
	.strict();

const workloadSchema = z
	.object({
		playerId: visibleId,
		starts: safeCount.nullable(),
		defensiveOuts: safeCount.nullable(),
		PA: safeCount.nullable(),
		paByPitcherHand: exposureSchema.nullable()
	})
	.strict();

const coverageSchema = z
	.object({
		templateId: visibleId,
		position: z.enum(DEFENSIVE_POSITIONS),
		demandOuts: safeCount.nullable(),
		allocatedOuts: safeCount.nullable(),
		shortfallOuts: safeCount.nullable()
	})
	.strict();

const offenseSchema = z
	.object({
		status: z.enum(['available', 'unavailable']),
		runs: decimal.nullable(),
		reasons: z.array(issueSchema)
	})
	.strict();

const constraintStatusSchema = z
	.object({
		status: z.enum(['passed', 'failed', 'unknown', 'unchecked']),
		reasons: z.array(issueSchema)
	})
	.strict();

const resultSchema = z
	.object({
		calculationVersion: visibleId,
		inputDigest: z.string().regex(/^[0-9a-f]{64}$/),
		scenarioId: visibleId,
		scenarioRevision: positiveCount,
		feasibility: z.enum(['invalid', 'incomplete', 'feasible']),
		issues: z.array(issueSchema),
		workload: z.array(workloadSchema),
		coverage: z.array(coverageSchema),
		offense: offenseSchema,
		constraints: z
			.object({
				rosterSize: constraintStatusSchema,
				cost: constraintStatusSchema
			})
			.strict(),
		readiness: z
			.object({
				ready: z.boolean(),
				scope: z.enum(['coverage', 'coverage_and_offense']),
				blockingCodes: z.array(visibleId)
			})
			.strict()
	})
	.strict()
	.superRefine((result, context) => {
		if (result.offense.status === 'available' && result.offense.runs === null) {
			context.addIssue({
				code: 'custom',
				path: ['offense', 'runs'],
				message: 'available offense must include runs'
			});
		}
		if (result.offense.status === 'unavailable' && result.offense.runs !== null) {
			context.addIssue({
				code: 'custom',
				path: ['offense', 'runs'],
				message: 'unavailable offense must not include runs'
			});
		}
		if (result.readiness.ready && result.readiness.blockingCodes.length > 0) {
			context.addIssue({
				code: 'custom',
				path: ['readiness', 'blockingCodes'],
				message: 'ready results cannot have readiness blocking codes'
			});
		}
		if (result.feasibility === 'invalid') {
			for (const [index, workload] of result.workload.entries()) {
				if (
					workload.starts !== null ||
					workload.defensiveOuts !== null ||
					workload.PA !== null ||
					workload.paByPitcherHand !== null
				) {
					context.addIssue({
						code: 'custom',
						path: ['workload', index],
						message: 'invalid allocations require null workload totals'
					});
				}
			}
			for (const [index, coverage] of result.coverage.entries()) {
				if (
					coverage.demandOuts !== null ||
					coverage.allocatedOuts !== null ||
					coverage.shortfallOuts !== null
				) {
					context.addIssue({
						code: 'custom',
						path: ['coverage', index],
						message: 'invalid allocations require null coverage totals'
					});
				}
			}
		}
		for (const [index, coverage] of result.coverage.entries()) {
			if (
				coverage.demandOuts !== null &&
				coverage.allocatedOuts !== null &&
				coverage.shortfallOuts !== null &&
				(coverage.allocatedOuts > coverage.demandOuts ||
					coverage.shortfallOuts !== coverage.demandOuts - coverage.allocatedOuts)
			) {
				context.addIssue({
					code: 'custom',
					path: ['coverage', index],
					message: 'coverage totals do not reconcile'
				});
			}
		}
	});

const bundleSchema = z
	.object({
		schemaVersion: z.string(),
		bundleId: visibleId,
		createdAt: utcTimestamp,
		dataClass: z.enum(['synthetic', 'public', 'restricted']),
		sources: z.array(sourceSchema),
		dataset: datasetSchema,
		assumptions: assumptionsSchema,
		comparison: comparisonSchema,
		results: z.array(resultSchema)
	})
	.strict();

export type Source = z.infer<typeof sourceSchema>;
export type Player = z.infer<typeof playerSchema>;
export type MetricDefinition = z.infer<typeof metricDefinitionSchema>;
export type Projection = z.infer<typeof projectionSchema>;
export type Dataset = z.infer<typeof datasetSchema>;
export type Exposure = z.infer<typeof exposureSchema>;
export type Slot = z.infer<typeof slotSchema>;
export type Template = z.infer<typeof templateSchema>;
export type Assumptions = z.infer<typeof assumptionsSchema>;
export type Assignment = z.infer<typeof assignmentSchema>;
export type Allocation = z.infer<typeof allocationSchema>;
export type WorkloadCap = z.infer<typeof workloadCapSchema>;
export type Constraints = z.infer<typeof constraintsSchema>;
export type Review = z.infer<typeof reviewSchema>;
export type Scenario = z.infer<typeof scenarioSchema>;
export type Comparison = z.infer<typeof comparisonSchema>;
export type Issue = z.infer<typeof issueSchema>;
export type Workload = z.infer<typeof workloadSchema>;
export type Coverage = z.infer<typeof coverageSchema>;
export type Offense = z.infer<typeof offenseSchema>;
export type ConstraintResult = z.infer<typeof constraintStatusSchema>;
export type CalculationResult = z.infer<typeof resultSchema>;
export type Bundle = z.infer<typeof bundleSchema>;

export type BundleValidationIssue = Issue;

export type BundleValidationSuccess = {
	success: true;
	data: Bundle;
	issues: BundleValidationIssue[];
};

export type BundleValidationFailure = {
	success: false;
	issues: BundleValidationIssue[];
};

export type BundleValidationResult = BundleValidationSuccess | BundleValidationFailure;

export class BundleValidationError extends Error {
	readonly issues: BundleValidationIssue[];

	constructor(issues: BundleValidationIssue[]) {
		super(
			issues.map((issue) => `${issue.code} at ${issue.path || '/'}: ${issue.message}`).join('\n')
		);
		this.name = 'BundleValidationError';
		this.issues = issues;
	}
}

function jsonPointer(path: PropertyKey[]): string {
	return path.length === 0
		? ''
		: `/${path.map((part) => String(part).replaceAll('~', '~0').replaceAll('/', '~1')).join('/')}`;
}

function issue(
	code: IssueCode,
	path: string,
	message: string,
	playerIds: string[] = []
): BundleValidationIssue {
	return { code, path, message, playerIds };
}

function zodIssueToContractIssues(zodIssue: z.core.$ZodIssue): BundleValidationIssue[] {
	if (zodIssue.code === 'unrecognized_keys') {
		return zodIssue.keys.map((key) =>
			issue(
				'INVALID_SCHEMA',
				jsonPointer([...zodIssue.path, key]),
				`unrecognized field '${key}'`,
				[]
			)
		);
	}
	return [issue('INVALID_SCHEMA', jsonPointer(zodIssue.path), zodIssue.message, [])];
}

function duplicateIssues<T>(
	values: T[],
	key: (value: T) => string,
	path: string,
	message: string
): BundleValidationIssue[] {
	const seen = new Map<string, number>();
	const issues: BundleValidationIssue[] = [];
	values.forEach((value, index) => {
		const valueKey = key(value);
		const firstIndex = seen.get(valueKey);
		if (firstIndex === undefined) {
			seen.set(valueKey, index);
		} else {
			issues.push(
				issue('DUPLICATE_ID', `${path}/${index}`, `${message}; first seen at ${path}/${firstIndex}`)
			);
		}
	});
	return issues;
}

function setDifference(left: string[], right: string[]): string[] {
	const rightSet = new Set(right);
	return left.filter((value) => !rightSet.has(value));
}

function sameMembers(left: string[], right: string[]): boolean {
	return setDifference(left, right).length === 0 && setDifference(right, left).length === 0;
}

function addUnknownReference(
	issues: BundleValidationIssue[],
	path: string,
	value: string,
	kind: string
): void {
	issues.push(
		issue('UNKNOWN_REFERENCE', path, `${kind} '${value}' does not resolve in this bundle`)
	);
}

function validateSemanticBundle(bundle: Bundle): BundleValidationIssue[] {
	const rejecting: BundleValidationIssue[] = [];
	const draft: BundleValidationIssue[] = [];
	const sourceIds = new Set(bundle.sources.map((source) => source.id));
	const playerIds = new Set(bundle.dataset.players.map((player) => player.id));
	const metricIds = new Set(bundle.dataset.metricDefinitions.map((metric) => metric.id));
	const templateIds = new Set(bundle.assumptions.templates.map((template) => template.id));
	rejecting.push(
		...duplicateIssues(bundle.sources, (source) => source.id, '/sources', 'source ID is repeated')
	);
	rejecting.push(
		...duplicateIssues(
			bundle.dataset.players,
			(player) => player.id,
			'/dataset/players',
			'player ID is repeated'
		)
	);
	rejecting.push(
		...duplicateIssues(
			bundle.dataset.metricDefinitions,
			(metric) => metric.id,
			'/dataset/metricDefinitions',
			'metric definition ID is repeated'
		)
	);
	rejecting.push(
		...duplicateIssues(
			bundle.assumptions.templates,
			(template) => template.id,
			'/assumptions/templates',
			'template ID is repeated'
		)
	);
	rejecting.push(
		...duplicateIssues(
			bundle.comparison.candidates,
			(scenario) => scenario.id,
			'/comparison/candidates',
			'scenario ID is repeated'
		)
	);
	if (
		bundle.comparison.candidates.some((scenario) => scenario.id === bundle.comparison.baseline.id)
	) {
		rejecting.push(
			issue(
				'DUPLICATE_ID',
				'/comparison/candidates',
				'candidate scenario ID repeats the baseline ID'
			)
		);
	}

	if (bundle.schemaVersion !== '1.0') {
		rejecting.push(
			issue(
				'UNSUPPORTED_VERSION',
				'/schemaVersion',
				`unsupported schema version '${bundle.schemaVersion}'`
			)
		);
	}

	for (const [index, source] of bundle.sources.entries()) {
		if (source.kind === 'synthetic' && !/invent|synthetic|demo|fiction/i.test(source.note)) {
			draft.push(
				issue(
					'INVALID_SCHEMA',
					`/sources/${index}/note`,
					'synthetic source notes must identify invented or demo data'
				)
			);
		}
	}

	for (const [index, sourceId] of bundle.dataset.sourceIds.entries()) {
		if (!sourceIds.has(sourceId))
			addUnknownReference(rejecting, `/dataset/sourceIds/${index}`, sourceId, 'dataset source');
	}
	if (new Set(bundle.dataset.sourceIds).size !== bundle.dataset.sourceIds.length) {
		rejecting.push(
			issue('DUPLICATE_ID', '/dataset/sourceIds', 'dataset source IDs must be unique')
		);
	}
	for (const [index, player] of bundle.dataset.players.entries()) {
		const positions = new Set(player.eligiblePositions);
		if (positions.size !== player.eligiblePositions.length) {
			rejecting.push(
				issue(
					'DUPLICATE_ID',
					`/dataset/players/${index}/eligiblePositions`,
					'eligible positions must be unique'
				)
			);
		}
		for (const [sourceIndex, sourceId] of player.sourceIds.entries()) {
			if (!sourceIds.has(sourceId)) {
				addUnknownReference(
					rejecting,
					`/dataset/players/${index}/sourceIds/${sourceIndex}`,
					sourceId,
					'player source'
				);
			}
		}
		if (new Set(player.sourceIds).size !== player.sourceIds.length) {
			rejecting.push(
				issue(
					'DUPLICATE_ID',
					`/dataset/players/${index}/sourceIds`,
					'player source IDs must be unique'
				)
			);
		}
	}
	for (const [index, metric] of bundle.dataset.metricDefinitions.entries()) {
		if (!sourceIds.has(metric.sourceId)) {
			addUnknownReference(
				rejecting,
				`/dataset/metricDefinitions/${index}/sourceId`,
				metric.sourceId,
				'metric source'
			);
		}
	}
	const projectionKeys = new Set<string>();
	for (const [index, projection] of bundle.dataset.projections.entries()) {
		if (!playerIds.has(projection.playerId)) {
			addUnknownReference(
				rejecting,
				`/dataset/projections/${index}/playerId`,
				projection.playerId,
				'projection player'
			);
		}
		const metric = bundle.dataset.metricDefinitions.find(
			({ id }) => id === projection.metricDefinitionId
		);
		if (!metric) {
			addUnknownReference(
				rejecting,
				`/dataset/projections/${index}/metricDefinitionId`,
				projection.metricDefinitionId,
				'projection metric'
			);
		} else if (projection.sourceId !== metric.sourceId) {
			draft.push(
				issue(
					'METRIC_MISMATCH',
					`/dataset/projections/${index}/sourceId`,
					'projection source does not match its metric definition source',
					[projection.playerId]
				)
			);
		}
		if (!sourceIds.has(projection.sourceId)) {
			addUnknownReference(
				rejecting,
				`/dataset/projections/${index}/sourceId`,
				projection.sourceId,
				'projection source'
			);
		}
		const key = `${projection.playerId}\u0000${projection.metricDefinitionId}`;
		if (projectionKeys.has(key)) {
			rejecting.push(
				issue(
					'DUPLICATE_ID',
					`/dataset/projections/${index}`,
					'player and metric projection key is repeated'
				)
			);
		}
		projectionKeys.add(key);
	}

	if (!metricIds.has(bundle.assumptions.metricDefinitionId)) {
		addUnknownReference(
			rejecting,
			'/assumptions/metricDefinitionId',
			bundle.assumptions.metricDefinitionId,
			'assumption metric'
		);
	}
	if (!sourceIds.has(bundle.assumptions.sourceId)) {
		addUnknownReference(
			rejecting,
			'/assumptions/sourceId',
			bundle.assumptions.sourceId,
			'assumption source'
		);
	}
	const gamesTotal = bundle.assumptions.templates.reduce(
		(total, template) => total + template.games,
		0
	);
	if (gamesTotal !== bundle.assumptions.horizonGames) {
		rejecting.push(
			issue(
				'INVALID_SCHEMA',
				'/assumptions/templates',
				'template game counts must sum to horizonGames'
			)
		);
	}
	for (const [templateIndex, template] of bundle.assumptions.templates.entries()) {
		const orders = template.slots.map((slot) => slot.order);
		const roles = template.slots.map((slot) => slot.role);
		if (
			new Set(orders).size !== 9 ||
			!orders.every((order) => order >= 1 && order <= 9) ||
			new Set(roles).size !== 9 ||
			!BATTING_ROLES.every((role) => roles.includes(role))
		) {
			rejecting.push(
				issue(
					'INVALID_SCHEMA',
					`/assumptions/templates/${templateIndex}/slots`,
					'slots must contain orders 1–9 and every batting role exactly once'
				)
			);
		}
		if (template.games > 0 && template.defensiveOutsPerGame === 0) {
			rejecting.push(
				issue(
					'INVALID_SCHEMA',
					`/assumptions/templates/${templateIndex}/defensiveOutsPerGame`,
					'positive-game templates require defensive outs'
				)
			);
		}
		for (const [slotIndex, slot] of template.slots.entries()) {
			const pa = slot.paByPitcherHand.L + slot.paByPitcherHand.R + slot.paByPitcherHand.unknown;
			if (template.games === 0 && pa !== 0) {
				rejecting.push(
					issue(
						'INVALID_SCHEMA',
						`/assumptions/templates/${templateIndex}/slots/${slotIndex}/paByPitcherHand`,
						'zero-game templates must have zero PA demand'
					)
				);
			}
		}
	}

	const baseline = bundle.comparison.baseline;
	if (
		bundle.comparison.datasetRef.id !== bundle.dataset.id ||
		bundle.comparison.datasetRef.revision !== bundle.dataset.revision
	) {
		rejecting.push(
			issue(
				'UNKNOWN_REFERENCE',
				'/comparison/datasetRef',
				'comparison dataset reference does not match the embedded dataset'
			)
		);
	}
	if (
		bundle.comparison.assumptionRef.id !== bundle.assumptions.id ||
		bundle.comparison.assumptionRef.revision !== bundle.assumptions.revision
	) {
		rejecting.push(
			issue(
				'UNKNOWN_REFERENCE',
				'/comparison/assumptionRef',
				'comparison assumption reference does not match the embedded assumptions'
			)
		);
	}
	for (const [scenarioIndex, scenario] of [baseline, ...bundle.comparison.candidates].entries()) {
		const scenarioPath =
			scenarioIndex === 0 ? '/comparison/baseline' : `/comparison/candidates/${scenarioIndex - 1}`;
		const memberSet = new Set(scenario.memberIds);
		if (memberSet.size !== scenario.memberIds.length) {
			rejecting.push(
				issue('DUPLICATE_ID', `${scenarioPath}/memberIds`, 'scenario members must be unique')
			);
		}
		if (
			new Set(scenario.incomingIds).size !== scenario.incomingIds.length ||
			new Set(scenario.outgoingIds).size !== scenario.outgoingIds.length
		) {
			rejecting.push(
				issue('DUPLICATE_ID', scenarioPath, 'incoming and outgoing IDs must be unique')
			);
		}
		const incomingSet = new Set(scenario.incomingIds);
		if (scenario.outgoingIds.some((id) => incomingSet.has(id))) {
			rejecting.push(
				issue('DUPLICATE_ID', scenarioPath, 'incoming and outgoing IDs cannot overlap')
			);
		}
		for (const [memberIndex, memberId] of scenario.memberIds.entries()) {
			if (!playerIds.has(memberId))
				addUnknownReference(
					rejecting,
					`${scenarioPath}/memberIds/${memberIndex}`,
					memberId,
					'scenario member'
				);
		}
		for (const [listName, values] of [
			['incomingIds', scenario.incomingIds],
			['outgoingIds', scenario.outgoingIds]
		] as const) {
			for (const [valueIndex, value] of values.entries()) {
				if (!playerIds.has(value))
					addUnknownReference(
						rejecting,
						`${scenarioPath}/${listName}/${valueIndex}`,
						value,
						'scenario transaction player'
					);
			}
		}
		const expectedMembers =
			scenarioIndex === 0
				? baseline.memberIds
				: [...setDifference(baseline.memberIds, scenario.outgoingIds), ...scenario.incomingIds];
		if (
			!sameMembers(scenario.memberIds, expectedMembers) ||
			(scenarioIndex === 0 && (scenario.incomingIds.length > 0 || scenario.outgoingIds.length > 0))
		) {
			draft.push(
				issue(
					'MEMBERSHIP_MISMATCH',
					`${scenarioPath}/memberIds`,
					'scenario membership does not match its transaction lists'
				)
			);
		}
		const allocationTemplateIds = scenario.allocations.map((allocation) => allocation.templateId);
		if (
			allocationTemplateIds.length !== templateIds.size ||
			new Set(allocationTemplateIds).size !== allocationTemplateIds.length ||
			allocationTemplateIds.some((id) => !templateIds.has(id))
		) {
			rejecting.push(
				issue(
					'INVALID_SCHEMA',
					`${scenarioPath}/allocations`,
					'allocations must contain each shared template exactly once'
				)
			);
		}
		for (const [allocationIndex, allocation] of scenario.allocations.entries()) {
			const template = bundle.assumptions.templates.find(({ id }) => id === allocation.templateId);
			if (!template) continue;
			const orders = allocation.assignments.map((assignment) => assignment.order);
			if (
				new Set(orders).size !== 9 ||
				!template.slots.every((slot) => orders.includes(slot.order))
			) {
				rejecting.push(
					issue(
						'INVALID_SCHEMA',
						`${scenarioPath}/allocations/${allocationIndex}/assignments`,
						'assignments must contain every template slot exactly once'
					)
				);
			}
			for (const [assignmentIndex, assignment] of allocation.assignments.entries()) {
				if (assignment.playerId !== null && !playerIds.has(assignment.playerId)) {
					addUnknownReference(
						rejecting,
						`${scenarioPath}/allocations/${allocationIndex}/assignments/${assignmentIndex}/playerId`,
						assignment.playerId,
						'assignment player'
					);
				}
			}
		}
		const capKeys = scenario.workloadCaps.map((cap) => cap.playerId);
		const capCounts = new Map<string, number>();
		capKeys.forEach((playerId) => capCounts.set(playerId, (capCounts.get(playerId) ?? 0) + 1));
		for (const [capIndex, cap] of scenario.workloadCaps.entries()) {
			if (!memberSet.has(cap.playerId)) {
				rejecting.push(
					issue(
						'UNKNOWN_REFERENCE',
						`${scenarioPath}/workloadCaps/${capIndex}/playerId`,
						'workload cap must belong to a scenario member',
						[cap.playerId]
					)
				);
			}
			if (!sourceIds.has(cap.sourceId))
				addUnknownReference(
					rejecting,
					`${scenarioPath}/workloadCaps/${capIndex}/sourceId`,
					cap.sourceId,
					'workload cap source'
				);
		}
		if (
			capKeys.length !== scenario.memberIds.length ||
			scenario.memberIds.some((playerId) => capCounts.get(playerId) !== 1)
		) {
			rejecting.push(
				issue(
					'INVALID_SCHEMA',
					`${scenarioPath}/workloadCaps`,
					'exactly one workload cap is required for each scenario member'
				)
			);
		}
		const costKeys = scenario.constraints.costs.map((cost) => cost.playerId);
		const costCounts = new Map<string, number>();
		costKeys.forEach((playerId) => costCounts.set(playerId, (costCounts.get(playerId) ?? 0) + 1));
		for (const [costIndex, cost] of scenario.constraints.costs.entries()) {
			if (!memberSet.has(cost.playerId)) {
				rejecting.push(
					issue(
						'UNKNOWN_REFERENCE',
						`${scenarioPath}/constraints/costs/${costIndex}/playerId`,
						'cost must belong to a scenario member',
						[cost.playerId]
					)
				);
			}
			if (!sourceIds.has(cost.sourceId))
				addUnknownReference(
					rejecting,
					`${scenarioPath}/constraints/costs/${costIndex}/sourceId`,
					cost.sourceId,
					'cost source'
				);
			if (costCounts.get(cost.playerId) !== 1) {
				rejecting.push(
					issue(
						'DUPLICATE_ID',
						`${scenarioPath}/constraints/costs/${costIndex}/playerId`,
						'cost record is repeated'
					)
				);
			}
		}
		if (scenario.constraints.costBudget) {
			const { currency: budgetCurrency, period: budgetPeriod } = scenario.constraints.costBudget;
			for (const [costIndex, cost] of scenario.constraints.costs.entries()) {
				if (cost.currency !== budgetCurrency || cost.period !== budgetPeriod) {
					draft.push(
						issue(
							'CONSTRAINT_UNKNOWN',
							`${scenarioPath}/constraints/costs/${costIndex}`,
							'cost currency or period does not match the enabled budget',
							[cost.playerId]
						)
					);
				}
			}
		}
		const ackAt = scenario.review.uncheckedTransactionRulesAcknowledgedAt;
		const ackRevision = scenario.review.acknowledgedScenarioRevision;
		if (
			(ackAt === null) !== (ackRevision === null) ||
			(ackRevision !== null && ackRevision !== scenario.revision)
		) {
			rejecting.push(
				issue(
					'ACKNOWLEDGMENT_REQUIRED',
					`${scenarioPath}/review`,
					'acknowledgment timestamp and revision must be paired and match scenario revision'
				)
			);
		}
	}

	const digest = computeInputDigest(bundle);
	const resultKeys = new Set<string>();
	for (const [resultIndex, result] of bundle.results.entries()) {
		const resultPath = `/results/${resultIndex}`;
		const scenario = [baseline, ...bundle.comparison.candidates].find(
			({ id }) => id === result.scenarioId
		);
		if (!scenario) {
			rejecting.push(
				issue('UNKNOWN_REFERENCE', `${resultPath}/scenarioId`, 'result scenario does not exist')
			);
		} else {
			if (result.scenarioRevision !== scenario.revision) {
				draft.push(
					issue(
						'REPLAY_MISMATCH',
						`${resultPath}/scenarioRevision`,
						'cached result revision does not match scenario revision'
					)
				);
			}
		}
		if (result.inputDigest !== digest) {
			draft.push(
				issue(
					'REPLAY_MISMATCH',
					`${resultPath}/inputDigest`,
					'cached result input digest does not match bundle inputs'
				)
			);
		}
		const key = `${result.scenarioId}\u0000${result.calculationVersion}`;
		if (resultKeys.has(key))
			rejecting.push(
				issue('DUPLICATE_ID', resultPath, 'result scenario and calculation version key is repeated')
			);
		resultKeys.add(key);
	}

	return [...rejecting, ...draft].sort(compareIssues);
}

function comparePathSegments(left: string, right: string): number {
	const leftSegments = left.split('/').slice(1);
	const rightSegments = right.split('/').slice(1);
	for (let index = 0; index < Math.max(leftSegments.length, rightSegments.length); index += 1) {
		const leftSegment = leftSegments[index];
		const rightSegment = rightSegments[index];
		if (leftSegment === undefined) return -1;
		if (rightSegment === undefined) return 1;
		const leftNumber = /^\d+$/.test(leftSegment) ? Number(leftSegment) : null;
		const rightNumber = /^\d+$/.test(rightSegment) ? Number(rightSegment) : null;
		if (leftNumber !== null && rightNumber !== null && leftNumber !== rightNumber)
			return leftNumber - rightNumber;
		if (leftSegment !== rightSegment) return leftSegment < rightSegment ? -1 : 1;
	}
	return 0;
}

export function compareIssues(left: BundleValidationIssue, right: BundleValidationIssue): number {
	return (
		comparePathSegments(left.path, right.path) ||
		(left.code < right.code ? -1 : left.code > right.code ? 1 : 0)
	);
}

export function validateBundle(input: unknown): BundleValidationResult {
	const parsed = bundleSchema.safeParse(input);
	if (!parsed.success) {
		return {
			success: false,
			issues: parsed.error.issues.flatMap(zodIssueToContractIssues).sort(compareIssues)
		};
	}
	const issues = validateSemanticBundle(parsed.data);
	const rejectingCodes = new Set([
		'INVALID_SCHEMA',
		'UNSUPPORTED_VERSION',
		'UNKNOWN_REFERENCE',
		'DUPLICATE_ID',
		'ACKNOWLEDGMENT_REQUIRED'
	]);
	const hasRejectingIssue = issues.some((candidate) => rejectingCodes.has(candidate.code));
	return hasRejectingIssue
		? { success: false, issues }
		: { success: true, data: parsed.data, issues };
}

export function parseBundle(input: unknown): Bundle {
	const result = validateBundle(input);
	if (!result.success) throw new BundleValidationError(result.issues);
	return result.data;
}

export function canonicalize(value: unknown): string {
	if (value === null || typeof value !== 'object') return JSON.stringify(value);
	if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
	const entries = Object.entries(value).sort(([left], [right]) =>
		left < right ? -1 : left > right ? 1 : 0
	);
	return `{${entries.map(([key, entryValue]) => `${JSON.stringify(key)}:${canonicalize(entryValue)}`).join(',')}}`;
}

export function inputForDigest(
	bundle: Pick<
		Bundle,
		'schemaVersion' | 'dataClass' | 'sources' | 'dataset' | 'assumptions' | 'comparison'
	>
): object {
	return {
		schemaVersion: bundle.schemaVersion,
		dataClass: bundle.dataClass,
		sources: bundle.sources,
		dataset: bundle.dataset,
		assumptions: bundle.assumptions,
		comparison: bundle.comparison
	};
}

export function computeInputDigest(
	bundle: Pick<
		Bundle,
		'schemaVersion' | 'dataClass' | 'sources' | 'dataset' | 'assumptions' | 'comparison'
	>
): string {
	return bytesToHex(sha256(new TextEncoder().encode(canonicalize(inputForDigest(bundle)))));
}

export const BundleSchema = bundleSchema;
export const ResultSchema = resultSchema;
