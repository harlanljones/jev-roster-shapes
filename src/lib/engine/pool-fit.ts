// Pool fit: the best lineup each scenario's own roster can produce, calculated
// by the engine (D-45). The search maximizes the bundle's dated metric in
// integer millionths under eligibility and one-player-per-slot, one lineup per
// template, then hands the discovered assignment to the unchanged scenario
// calculation path so feasibility, coverage, caps, PA reconciliation, and
// offense come from one implementation.
//
// This is an analysis artifact, not a bundle scenario: it never enters a
// bundle, a digest, or a saved result, and it never reads display-layer
// hindsight rates. The D-43 display fit (bin lid, slot bars) stays a display
// layer and is labeled hindsight wherever it is shown.
import type {
	Allocation,
	Bundle,
	CalculationResult,
	Issue,
	Scenario,
	Slot,
	Template
} from '../contracts';
import {
	CALCULATION_VERSION,
	calculateComparison,
	calculateOffenseDelta,
	decimalToMillionths,
	evaluateScenarioDraft,
	formatMillionths,
	type OffenseDelta,
	type ScenarioEvaluation
} from './calculation';

export const POOL_FIT_VERSION = 'pool-fit-analysis-v1';

/** One slot of a discovered lineup. `runs` is that slot's own contribution. */
export interface PoolFitSlot {
	templateId: string;
	order: number;
	role: Slot['role'];
	playerId: string | null;
	/** Total PA this slot carries across the template's games. */
	pa: number;
	paByPitcherHand: Slot['paByPitcherHand'];
	/** Contribution in millionths, or null when the slot is unfilled. */
	runs: string | null;
}

export interface PoolFitContext {
	templateId: string;
	templateLabel: string;
	starterHand: Template['starterHand'];
	games: number;
	slots: PoolFitSlot[];
	/** Sum of the slots above, or null when a slot is unfilled. */
	runs: string | null;
	/** True when this context has the same nine, in the same roles, as the reference. */
	matchesReference: boolean;
}

/** A member the search could not use, with the reason it was left out. */
export interface PoolFitExclusion {
	playerId: string;
	code: 'MISSING_RATE' | 'METRIC_MISMATCH' | 'UNKNOWN_REFERENCE';
	detail: string;
}

/** Plate appearances a player gains or loses against the reference scenario. */
export interface PoolFitTransfer {
	playerId: string;
	referencePA: number;
	fitPA: number;
	paDelta: number;
}

export interface PoolFitMove {
	playerId: string;
	templateId: string;
	from: string;
	to: string;
}

export interface PoolFitReference {
	scenarioId: string;
	label: string;
	runs: string | null;
	feasibility: CalculationResult['feasibility'];
}

export interface PoolFitScenarioFit {
	/** `pool-fit:<scenarioId>`, the id carried by the evaluated draft. */
	analysisId: string;
	scenarioId: string;
	label: string;
	feasibility: CalculationResult['feasibility'];
	/** Engine total for the discovered lineup, or null with `reasons` populated. */
	runs: string | null;
	/** Runs the reference scenario leaves on the table, holding roster and rates fixed. */
	deltaVsReference: OffenseDelta | null;
	/** Cross-scenario comparison against the bundle baseline, same digest rule. */
	deltaVsBaseline: OffenseDelta | null;
	contexts: PoolFitContext[];
	transfers: PoolFitTransfer[];
	/** Members the fit leaves on the bench, with the PA and runs they forgo. */
	bench: { playerId: string; pa: number; runs: string | null }[];
	excluded: PoolFitExclusion[];
	moves: PoolFitMove[];
	/** Coverage the fit still cannot cover, by template and position. */
	shortfalls: { templateId: string; position: string; shortfallOuts: number }[];
	/** Members whose allocated workload sits at or over a known cap. */
	capPressure: { playerId: string; field: string; allocated: number; limit: number }[];
	/** The engine's own result for the discovered assignment. */
	evaluation: ScenarioEvaluation;
	reasons: Issue[];
}

export interface PoolFitAnalysis {
	analysisVersion: typeof POOL_FIT_VERSION;
	calculationVersion: typeof CALCULATION_VERSION;
	inputDigest: string;
	metricDefinitionId: string;
	offenseMode: Bundle['assumptions']['offenseMode'];
	/** The scenarios this analysis ran against, with their pinned engine totals. */
	references: PoolFitReference[];
	fits: PoolFitScenarioFit[];
	/** Highest available fit total across scenarios, or null when none is available. */
	best: { scenarioId: string; runs: string } | null;
}

// ---------- scoring inputs ----------

interface ScoredPlayer {
	id: string;
	eligible: readonly string[];
	/** Overall-mode rate in millionths, or null when the mode cannot score them. */
	rate: bigint | null;
	/** Split-mode rates in millionths, or null when the mode cannot score them. */
	split: { L: bigint; R: bigint; unknown: bigint } | null;
	exclusion: PoolFitExclusion | null;
}

function slotHandPA(slot: Slot): { L: number; R: number; unknown: number } {
	return {
		L: slot.paByPitcherHand.L,
		R: slot.paByPitcherHand.R,
		unknown: slot.paByPitcherHand.unknown
	};
}

function slotTotalPA(slot: Slot): number {
	const { L, R, unknown } = slotHandPA(slot);
	return L + R + unknown;
}

function unscored(playerId: string, code: PoolFitExclusion['code'], detail: string): ScoredPlayer {
	return {
		id: playerId,
		eligible: [],
		rate: null,
		split: null,
		exclusion: { playerId, code, detail }
	};
}

/**
 * Score one member under the comparison's offense mode, or record why it cannot
 * be scored. A member with no usable rate is excluded rather than treated as
 * zero, so the search never optimizes on an invented contribution.
 */
function scorePlayer(bundle: Bundle, playerId: string): ScoredPlayer {
	const player = bundle.dataset.players.find(({ id }) => id === playerId);
	if (!player) {
		return unscored(playerId, 'UNKNOWN_REFERENCE', 'scenario member is absent from the dataset');
	}
	const base = { id: playerId, eligible: player.eligiblePositions };
	const metricId = bundle.assumptions.metricDefinitionId;
	const metric = bundle.dataset.metricDefinitions.find(({ id }) => id === metricId);
	if (!metric || metric.unit !== 'runs_per_PA') {
		return {
			...base,
			rate: null,
			split: null,
			exclusion: {
				playerId,
				code: 'METRIC_MISMATCH',
				detail: `metric '${metricId}' is not additive runs per PA`
			}
		};
	}
	const projection = bundle.dataset.projections.find(
		(candidate) => candidate.playerId === playerId && candidate.metricDefinitionId === metricId
	);
	if (!projection) {
		return {
			...base,
			rate: null,
			split: null,
			exclusion: { playerId, code: 'MISSING_RATE', detail: `no ${metricId} row in this bundle` }
		};
	}
	if (projection.sourceId !== metric.sourceId) {
		return {
			...base,
			rate: null,
			split: null,
			exclusion: {
				playerId,
				code: 'METRIC_MISMATCH',
				detail: 'projection source does not match the selected metric source'
			}
		};
	}
	if (bundle.assumptions.offenseMode === 'overall') {
		if (projection.overall === null) {
			return {
				...base,
				rate: null,
				split: null,
				exclusion: { playerId, code: 'MISSING_RATE', detail: 'no overall rate in this bundle' }
			};
		}
		const rate = decimalToMillionths(projection.overall);
		return { ...base, rate, split: null, exclusion: null };
	}
	if (projection.vsL === null || projection.vsR === null) {
		return {
			...base,
			rate: null,
			split: null,
			exclusion: {
				playerId,
				code: 'MISSING_RATE',
				detail: 'split mode is selected but the bundle has no vs-left / vs-right rates'
			}
		};
	}
	return {
		...base,
		rate: null,
		split: {
			L: decimalToMillionths(projection.vsL),
			R: decimalToMillionths(projection.vsR),
			unknown: 0n
		},
		exclusion: null
	};
}

/** Contribution of putting one scored player in one slot, in millionths. */
function slotValue(
	slot: Slot,
	player: ScoredPlayer,
	mode: Bundle['assumptions']['offenseMode']
): bigint | null {
	if (mode === 'overall') {
		return player.rate == null ? null : player.rate * BigInt(slotTotalPA(slot));
	}
	if (!player.split) return null;
	const pa = slotHandPA(slot);
	return (
		player.split.L * BigInt(pa.L) +
		player.split.R * BigInt(pa.R) +
		player.split.unknown * BigInt(pa.unknown)
	);
}

// ---------- the search ----------

interface LineupFit {
	/** Player ID per slot, or null where the pool cannot cover the slot. */
	pick: (string | null)[];
	/** Slot contribution per slot, aligned with `pick`; null where unfilled. */
	values: (bigint | null)[];
	total: bigint;
	covered: number;
}

function unfilledLineup(slotCount: number): LineupFit {
	return {
		pick: new Array<string | null>(slotCount).fill(null),
		values: new Array<bigint | null>(slotCount).fill(null),
		total: 0n,
		covered: 0
	};
}

/** Lexicographic tie-break over the slot-by-slot ID vector, so ties are stable. */
function pickIsSmaller(candidate: (string | null)[], incumbent: (string | null)[]): boolean {
	for (let i = 0; i < candidate.length; i++) {
		const a = candidate[i] ?? '￿';
		const b = incumbent[i] ?? '￿';
		if (a !== b) return a < b;
	}
	return false;
}

/** Field as many slots as the roster allows, then maximize runs, then tie-break. */
function isBetter(candidate: LineupFit, incumbent: LineupFit): boolean {
	if (candidate.covered !== incumbent.covered) return candidate.covered > incumbent.covered;
	if (candidate.total !== incumbent.total) return candidate.total > incumbent.total;
	return pickIsSmaller(candidate.pick, incumbent.pick);
}

/**
 * Exact maximum-weight assignment over one template's slots by bitmask dynamic
 * programming: each scored member is either benched or placed in one free
 * eligible slot. Because the two contexts are different games, each template is
 * searched on its own and a member may start both. All arithmetic is in the
 * engine's millionths, so the optimum is exact, not sampled.
 */
function bestLineup(
	template: Template,
	players: readonly ScoredPlayer[],
	mode: Bundle['assumptions']['offenseMode']
): LineupFit {
	const slots = template.slots;
	const full = (1 << slots.length) - 1;
	const scored = players.filter((player) => player.exclusion === null);
	const state = new Map<number, LineupFit>([[0, unfilledLineup(slots.length)]]);
	for (const player of scored) {
		const options = slots
			.map((slot, index) => ({ slot, index, value: slotValue(slot, player, mode) }))
			.filter(
				({ slot, value }) =>
					value !== null && (slot.role === 'DH' || player.eligible.includes(slot.role))
			);
		if (!options.length) continue;
		const next = new Map(state);
		for (const [mask, fit] of state) {
			for (const { index, value } of options) {
				if (mask & (1 << index)) continue;
				const mask2 = mask | (1 << index);
				const candidate: LineupFit = {
					pick: fit.pick.slice(),
					values: fit.values.slice(),
					total: fit.total + (value as bigint),
					covered: fit.covered + 1
				};
				candidate.pick[index] = player.id;
				candidate.values[index] = value;
				const incumbent = next.get(mask2);
				if (!incumbent || isBetter(candidate, incumbent)) next.set(mask2, candidate);
			}
		}
		state.clear();
		for (const [mask, fit] of next) state.set(mask, fit);
	}
	const complete = state.get(full);
	if (complete) return complete;
	// The roster cannot field every slot: report the best partial lineup so the
	// uncovered positions stay visible instead of silently scoring a partial nine.
	let best: LineupFit | null = null;
	for (const fit of state.values()) if (!best || isBetter(fit, best)) best = fit;
	return best ?? unfilledLineup(slots.length);
}

// ---------- assembling the analysis ----------

function scenarioOf(bundle: Bundle, scenarioId: string): Scenario {
	const scenario = [bundle.comparison.baseline, ...bundle.comparison.candidates].find(
		({ id }) => id === scenarioId
	);
	if (!scenario) throw new Error(`scenario '${scenarioId}' does not exist in this bundle`);
	return scenario;
}

function rolesByPlayer(scenario: Scenario, template: Template): Map<string, string> {
	const roles = new Map<string, string>();
	const allocation = scenario.allocations.find(({ templateId }) => templateId === template.id);
	for (const slot of template.slots) {
		const playerId = allocation?.assignments.find(({ order }) => order === slot.order)?.playerId;
		if (playerId) roles.set(playerId, slot.role);
	}
	return roles;
}

function paByPlayer(scenario: Scenario, templates: readonly Template[]): Map<string, number> {
	const totals = new Map<string, number>();
	for (const playerId of scenario.memberIds) totals.set(playerId, 0);
	for (const template of templates) {
		const allocation = scenario.allocations.find(({ templateId }) => templateId === template.id);
		for (const slot of template.slots) {
			const playerId = allocation?.assignments.find(({ order }) => order === slot.order)?.playerId;
			if (playerId) totals.set(playerId, (totals.get(playerId) ?? 0) + slotTotalPA(slot));
		}
	}
	return totals;
}

function allocationFor(template: Template, fit: LineupFit): Allocation {
	return {
		templateId: template.id,
		assignments: template.slots.map((slot, index) => ({
			order: slot.order,
			playerId: fit.pick[index] ?? null
		}))
	};
}

/**
 * The discovered lineups as one scenario record. Membership, transaction lists,
 * caps, constraints, and review state are copied from the reference scenario so
 * the v1 membership equation and the capacity rules apply unchanged: the fit
 * cannot gain a player the comparison does not have, and it claims no review of
 * its own.
 */
function draftScenario(
	reference: Scenario,
	templates: readonly Template[],
	fits: ReadonlyMap<string, LineupFit>
): Scenario {
	return {
		...reference,
		id: `pool-fit:${reference.id}`,
		authorId: POOL_FIT_VERSION,
		label: `Pool fit · ${reference.label}`,
		allocations: templates.map((template) => allocationFor(template, fits.get(template.id)!))
	};
}

function contextOf(
	template: Template,
	fit: LineupFit,
	referenceRoles: ReadonlyMap<string, string>
): PoolFitContext {
	const slots: PoolFitSlot[] = template.slots.map((slot, index) => {
		const playerId = fit.pick[index] ?? null;
		const value = fit.values[index] ?? null;
		return {
			templateId: template.id,
			order: slot.order,
			role: slot.role,
			playerId,
			pa: slotTotalPA(slot),
			paByPitcherHand: slot.paByPitcherHand,
			runs: value === null ? null : formatMillionths(value)
		};
	});
	const unfilled = slots.filter(({ playerId }) => playerId === null);
	return {
		templateId: template.id,
		templateLabel: template.label,
		starterHand: template.starterHand,
		games: template.games,
		slots,
		runs: unfilled.length === 0 ? formatMillionths(fit.total) : null,
		matchesReference:
			unfilled.length === 0 &&
			slots.every(
				({ playerId, role }) => playerId !== null && referenceRoles.get(playerId) === role
			)
	};
}

function shortfallsOf(evaluation: ScenarioEvaluation) {
	return evaluation.result.coverage
		.filter(({ shortfallOuts }) => typeof shortfallOuts === 'number' && shortfallOuts > 0)
		.map(({ templateId, position, shortfallOuts }) => ({
			templateId,
			position,
			shortfallOuts: shortfallOuts as number
		}));
}

function capPressureOf(scenario: Scenario, evaluation: ScenarioEvaluation) {
	const caps = new Map(scenario.workloadCaps.map((cap) => [cap.playerId, cap]));
	const pressure: { playerId: string; field: string; allocated: number; limit: number }[] = [];
	for (const workload of evaluation.result.workload) {
		const cap = caps.get(workload.playerId);
		if (!cap) continue;
		for (const [field, allocated, limit] of [
			['maxStarts', workload.starts, cap.maxStarts],
			['maxDefensiveOuts', workload.defensiveOuts, cap.maxDefensiveOuts],
			['maxPA', workload.PA, cap.maxPA]
		] as const) {
			if (allocated == null || limit == null) continue;
			if (allocated >= limit)
				pressure.push({ playerId: workload.playerId, field, allocated, limit });
		}
	}
	return pressure;
}

function fitFor(
	bundle: Bundle,
	reference: Scenario,
	referenceResult: CalculationResult,
	baselineResult: CalculationResult
): PoolFitScenarioFit {
	const templates = bundle.assumptions.templates;
	const scored = new Map(
		reference.memberIds.map((playerId) => [playerId, scorePlayer(bundle, playerId)] as const)
	);
	const usable = reference.memberIds
		.map((playerId) => scored.get(playerId)!)
		.filter((player) => player.exclusion === null)
		.sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0));
	const excluded = reference.memberIds
		.map((playerId) => scored.get(playerId)!.exclusion)
		.filter((exclusion): exclusion is PoolFitExclusion => exclusion !== null);

	const fits = new Map(
		templates.map((template) => [
			template.id,
			bestLineup(template, usable, bundle.assumptions.offenseMode)
		])
	);
	const scenario = draftScenario(reference, templates, fits);
	const evaluation = evaluateScenarioDraft(bundle, scenario, {
		path: `/analysis/${scenario.id.replace(':', '/')}`
	});
	const result = evaluation.result;
	const available = result.offense.status === 'available' ? result.offense.runs : null;
	const fitPA = paByPlayer(scenario, templates);
	const referencePA = paByPlayer(reference, templates);
	const started = new Set<string>();
	for (const allocation of scenario.allocations) {
		for (const { playerId } of allocation.assignments) if (playerId) started.add(playerId);
	}
	const scoredRate = (playerId: string, pa: number) => {
		const rate = scored.get(playerId)?.rate ?? null;
		return rate === null ? null : formatMillionths(rate * BigInt(pa));
	};
	const moves: PoolFitMove[] = [];
	for (const template of templates) {
		const before = rolesByPlayer(reference, template);
		for (const [playerId, to] of rolesByPlayer(scenario, template)) {
			const from = before.get(playerId);
			if (from !== undefined && from !== to) {
				moves.push({ playerId, templateId: template.id, from, to });
			}
		}
	}
	return {
		analysisId: scenario.id,
		scenarioId: reference.id,
		label: reference.label,
		feasibility: result.feasibility,
		runs: available,
		deltaVsReference:
			available !== null &&
			referenceResult.offense.status === 'available' &&
			result.inputDigest === referenceResult.inputDigest
				? calculateOffenseDelta(referenceResult, result)
				: null,
		deltaVsBaseline:
			available !== null && result.inputDigest === baselineResult.inputDigest
				? calculateOffenseDelta(baselineResult, result)
				: null,
		contexts: templates.map((template) =>
			contextOf(template, fits.get(template.id)!, rolesByPlayer(reference, template))
		),
		transfers: [...reference.memberIds]
			.sort()
			.map((playerId) => ({
				playerId,
				referencePA: referencePA.get(playerId) ?? 0,
				fitPA: fitPA.get(playerId) ?? 0,
				paDelta: (fitPA.get(playerId) ?? 0) - (referencePA.get(playerId) ?? 0)
			}))
			.filter(({ paDelta }) => paDelta !== 0),
		bench: reference.memberIds
			.filter((playerId) => !started.has(playerId))
			.map((playerId) => {
				const pa = referencePA.get(playerId) ?? 0;
				return { playerId, pa, runs: scoredRate(playerId, pa) };
			}),
		excluded,
		moves,
		shortfalls: shortfallsOf(evaluation),
		capPressure: capPressureOf(scenario, evaluation),
		evaluation,
		reasons: result.issues
	};
}

/**
 * The pool fit for every scenario in the bundle: each scenario's own roster,
 * searched per template, evaluated by the engine, and compared with the scenario
 * it came from and with the bundle baseline.
 */
export function calculatePoolFit(bundle: Bundle): PoolFitAnalysis {
	const comparison = calculateComparison(bundle);
	const baselineResult = comparison.results[0];
	if (!baselineResult) throw new Error('comparison is missing its baseline scenario');
	const fits = comparison.results.map((result) =>
		fitFor(bundle, scenarioOf(bundle, result.scenarioId), result, baselineResult)
	);
	const best = fits
		.filter((fit) => fit.runs !== null)
		.reduce<{ scenarioId: string; runs: string } | null>((bestFit, fit) => {
			if (!bestFit) return { scenarioId: fit.scenarioId, runs: fit.runs! };
			return decimalToMillionths(fit.runs!) > decimalToMillionths(bestFit.runs)
				? { scenarioId: fit.scenarioId, runs: fit.runs! }
				: bestFit;
		}, null);
	return {
		analysisVersion: POOL_FIT_VERSION,
		calculationVersion: CALCULATION_VERSION,
		inputDigest: comparison.inputDigest,
		metricDefinitionId: bundle.assumptions.metricDefinitionId,
		offenseMode: bundle.assumptions.offenseMode,
		references: comparison.results.map((result) => ({
			scenarioId: result.scenarioId,
			label: scenarioOf(bundle, result.scenarioId).label,
			runs: result.offense.status === 'available' ? result.offense.runs : null,
			feasibility: result.feasibility
		})),
		fits,
		best
	};
}

/** The fit for one scenario id, or undefined when the bundle has no such scenario. */
export function poolFitFor(
	analysis: PoolFitAnalysis,
	scenarioId: string
): PoolFitScenarioFit | undefined {
	return analysis.fits.find((fit) => fit.scenarioId === scenarioId);
}
