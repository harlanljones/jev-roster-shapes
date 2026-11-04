<script lang="ts">
	import { acknowledgePublic, hasAcknowledgedPublic } from './public-ack';
	import { onMount } from 'svelte';

	import type { Bundle, Scenario } from '$lib/contracts';
	import {
		calculateComparison,
		calculatePoolFit,
		calculateScenario,
		poolFitFor,
		type ComparisonCalculation
	} from '$lib/engine';
	import {
		createMemoryPersistenceRepository,
		createPersistenceRepository,
		MemoryPersistenceStorage,
		PersistenceImportError,
		type LoadedComparison,
		type PersistenceRepository
	} from '$lib/persistence';
	import AllocationPanel from '$lib/ui/AllocationPanel.svelte';
	import AssumptionsPanel from '$lib/ui/AssumptionsPanel.svelte';
	import CoveragePanel from '$lib/ui/CoveragePanel.svelte';
	import ReviewPanel from '$lib/ui/ReviewPanel.svelte';
	import ScenarioTabs from '$lib/ui/ScenarioTabs.svelte';
	import WorkloadPanel from '$lib/ui/WorkloadPanel.svelte';
	import { formatMetric, formatSavedAt } from '$lib/ui/format';
	import type {
		AssumptionChange,
		AssignmentChange,
		AssignmentMove,
		AssignmentSwap,
		ComparisonViewModel,
		ReviewScope
	} from '$lib/ui/types';
	import { buildComparisonViewModel } from './workspace';
	import { storylineRegistry } from '$lib/storylines/registry';
	import CapacityBin from './diagrams/CapacityBin.svelte';
	import CaseKey from './diagrams/CaseKey.svelte';
	import PieceDetail from './diagrams/PieceDetail.svelte';
	import ShapeCase from './diagrams/ShapeCase.svelte';
	import {
		buildPool,
		caseView,
		lineupBin,
		lineupIds,
		locksOf,
		scenarioLineup,
		type BinResult,
		type Lineup
	} from './shape-case';

	// Library-first workspace (D-40): the library collects the D-36 public
	// acknowledgment before opening, so the initial bundle arrives acknowledged.
	let {
		initialBundle,
		onBack
	}: {
		initialBundle: Bundle;
		onBack: () => void;
	} = $props();

	// The initial bundle is a one-time seed: the workspace owns its draft from
	// here on (edits replace it via commitMutation; opening another storyline
	// remounts this component). Read inside a closure so intent is explicit.
	function startState(): { bundle: Bundle; calculation: ComparisonCalculation } {
		// $state.snapshot unwraps the reactive proxy; structuredClone on the
		// proxy itself throws DataCloneError in real browsers.
		const start = structuredClone($state.snapshot(initialBundle));
		return { bundle: start, calculation: calculateComparison(start) };
	}
	const start = startState();
	let bundle = $state<Bundle>(start.bundle);
	let calculation = $state<ComparisonCalculation>(start.calculation);
	let activeScenarioId = $state(start.bundle.comparison.baseline.id);
	let storageState = $state<ComparisonViewModel['storageState']>('unsaved');
	let storageMessage = $state<string | undefined>(
		`Opened ${start.bundle.bundleId} for local review — observed public values, not team approved projections. Edits stay local until saved.`
	);
	let savedAt = $state<string | null>(null);
	let unsaved = $state(true);
	let selectedEvidenceId = $state<string | null>(null);
	let evidenceTrigger: HTMLElement | null = null;
	let repository = $state<PersistenceRepository>(
		createMemoryPersistenceRepository(new MemoryPersistenceStorage())
	);
	let busy = $state(false);

	const model = $derived(
		buildComparisonViewModel(
			bundle,
			calculation,
			activeScenarioId,
			storageState,
			storageMessage,
			savedAt,
			unsaved
		)
	);
	const storylineContext = $derived(
		storylineRegistry.find((storyline) => storyline.bundle.bundleId === bundle.bundleId)
	);
	const activeScenario = $derived(
		model.scenarios.find((scenario) => scenario.id === model.activeScenarioId)
	);
	const selectedEvidence = $derived(
		model.evidence.find((evidence) => evidence.id === selectedEvidenceId)
	);

	// Shape Case display layer (D-43): each scenario's lineup in its busiest
	// pitcher-hand template, packed into the pool's bin and drawn as the case.
	// Recomputed from the edited draft; never feeds the engine or the digest.
	const pool = $derived(buildPool(bundle));
	const bundleScenarios = $derived([bundle.comparison.baseline, ...bundle.comparison.candidates]);
	const baseLineup = $derived(scenarioLineup(bundle, bundle.comparison.baseline));
	const activeBundleScenario = $derived(
		bundleScenarios.find((s) => s.id === model.activeScenarioId) ?? bundle.comparison.baseline
	);
	// One bin scale per page: the viewed scenario's projected starters set the
	// lid every bin is packed against.
	const pageLocks = $derived(locksOf(activeBundleScenario));
	const scenarioBins = $derived(
		new Map(
			bundleScenarios.map((s) => [s.id, lineupBin(pool, scenarioLineup(bundle, s), pageLocks)])
		)
	);
	// The engine's pool fit (D-45): the best nine this scenario's own roster can
	// field, searched per context and judged by the engine. Its lineup is drawn
	// in the same bin as the scenarios, but its numbers are engine numbers.
	const analysis = $derived(calculatePoolFit(bundle));
	const activeFit = $derived(poolFitFor(analysis, model.activeScenarioId));
	const fitLineup = $derived.by((): Lineup => {
		const contexts = activeFit?.contexts ?? [];
		const busiest = contexts.reduce((a, b) => (b.games > a.games ? b : a));
		const lineup: Lineup = {};
		for (const slot of busiest?.slots ?? []) lineup[slot.role] = slot.playerId;
		return lineup;
	});
	const fitBin = $derived(lineupBin(pool, fitLineup, pageLocks));
	const engineDelta = (value: string | null | undefined) =>
		value == null
			? 'unavailable'
			: `${Number(value) >= 0 ? '+' : '−'}${Math.abs(Number(value)).toFixed(3)} runs`;
	const activeView = $derived(
		caseView(pool, scenarioLineup(bundle, activeBundleScenario), baseLineup)
	);
	let selectedPieceId = $state<string | null>(null);
	const selectedPiece = $derived(
		selectedPieceId && pool.has(selectedPieceId)
			? selectedPieceId
			: (activeView.lineup['3B'] ?? lineupIds(activeView.lineup)[0] ?? null)
	);
	const actualRuns = (b: BinResult | undefined) =>
		b?.runs == null ? 'unavailable' : `${b.runs.toFixed(1)} R`;
	const binStats = (b: BinResult) =>
		`${Math.round(b.fill)}% filled · ${Math.round(b.gaps)}% gaps · ${Math.round(b.headroom)}% headroom`;

	onMount(() => {
		try {
			repository = createPersistenceRepository({
				replay: ({ bundle: replayBundle, scenarioId }) =>
					calculateScenario(replayBundle, scenarioId)
			});
		} catch {
			storageState = 'failed';
			storageMessage = 'Browser storage is unavailable; this draft is held in memory only.';
			return;
		}
		void (async () => {
			// Restore a previously saved draft for this bundle so a reload
			// replays the saved comparison instead of resetting to the file.
			try {
				const stored = await repository.load(start.bundle.bundleId);
				if (!stored) return;
				const loaded = stored;
				bundle = loaded.current.bundle;
				calculation = calculateComparison(bundle);
				savedAt = loaded.current.savedAt;
				unsaved = false;
				storageState = 'saved';
				storageMessage = `Restored saved revision ${loaded.current.storedRevision} at ${formatSavedAt(savedAt)}.`;
				if (loaded.current.bundle.dataClass === 'public') {
					acknowledgePublic(loaded.current.bundle.bundleId);
				}
				pendingPublic = null;
			} catch {
				storageState = 'failed';
				storageMessage = 'The saved draft could not be restored; showing the fixture.';
			}
		})();
	});

	function bump(value: number): number {
		return value + 1;
	}

	function clearReview(scenario: Scenario): void {
		scenario.review = {
			scope: scenario.review.scope,
			uncheckedTransactionRulesAcknowledgedAt: null,
			acknowledgedScenarioRevision: null
		};
	}

	function commitMutation(mutate: (next: Bundle) => void): void {
		// $state.snapshot unwraps the reactive proxy; structuredClone on the
		// proxy itself throws DataCloneError in real browsers.
		const next = $state.snapshot(bundle);
		mutate(next);
		try {
			const nextCalculation = calculateComparison(next);
			next.results = [...nextCalculation.results];
			bundle = next;
			calculation = nextCalculation;
			unsaved = true;
			storageState = 'unsaved';
			storageMessage = 'Draft changed locally; save to create a reproducible snapshot.';
		} catch (error) {
			storageState = 'failed';
			storageMessage =
				error instanceof Error ? error.message : 'The change could not be calculated.';
		}
	}

	function touchScenario(next: Bundle, scenario: Scenario): void {
		scenario.revision = bump(scenario.revision);
		next.comparison.revision = bump(next.comparison.revision);
		clearReview(scenario);
	}

	function handleAssignmentChange(change: AssignmentChange): void {
		commitMutation((next) => {
			const scenario = [next.comparison.baseline, ...next.comparison.candidates].find(
				(candidate) => candidate.id === change.scenarioId
			);
			const allocation = scenario?.allocations.find(
				(candidate) => candidate.templateId === change.templateId
			);
			const assignment = allocation?.assignments.find(
				(candidate) => candidate.order === change.order
			);
			if (!scenario || !assignment) return;
			assignment.playerId = change.playerId;
			touchScenario(next, scenario);
		});
	}

	function handleAssignmentSwap(swap: AssignmentSwap): void {
		commitMutation((next) => {
			const scenario = [next.comparison.baseline, ...next.comparison.candidates].find(
				(candidate) => candidate.id === swap.scenarioId
			);
			const assignments = scenario?.allocations.find(
				(candidate) => candidate.templateId === swap.templateId
			)?.assignments;
			const a = assignments?.find((candidate) => candidate.order === swap.orderA);
			const b = assignments?.find((candidate) => candidate.order === swap.orderB);
			if (!scenario || !a || !b) return;
			[a.playerId, b.playerId] = [b.playerId, a.playerId];
			touchScenario(next, scenario);
		});
	}

	function handleAssignmentMove(move: AssignmentMove): void {
		// Re-validate against the current bundle so a blocked Move (empty source
		// or occupied destination) never flips the draft to a false "changed".
		const scenario = [bundle.comparison.baseline, ...bundle.comparison.candidates].find(
			(candidate) => candidate.id === move.scenarioId
		);
		const assignments = scenario?.allocations.find(
			(candidate) => candidate.templateId === move.templateId
		)?.assignments;
		const from = assignments?.find((candidate) => candidate.order === move.fromOrder);
		const to = assignments?.find((candidate) => candidate.order === move.toOrder);
		if (!scenario || !from || !to) return;
		if (from.playerId === null || to.playerId !== null) return;
		commitMutation((next) => {
			const target = [next.comparison.baseline, ...next.comparison.candidates].find(
				(candidate) => candidate.id === move.scenarioId
			);
			const targetAssignments = target?.allocations.find(
				(candidate) => candidate.templateId === move.templateId
			)?.assignments;
			const targetFrom = targetAssignments?.find((candidate) => candidate.order === move.fromOrder);
			const targetTo = targetAssignments?.find((candidate) => candidate.order === move.toOrder);
			if (!target || !targetFrom || !targetTo) return;
			targetTo.playerId = targetFrom.playerId;
			targetFrom.playerId = null;
			touchScenario(next, target);
		});
	}

	function handleAssumptionChange(change: AssumptionChange): void {
		if (!Number.isFinite(change.value)) return;
		commitMutation((next) => {
			const assumptions = next.assumptions;
			if (change.kind === 'horizonGames') {
				assumptions.horizonGames = Math.max(0, Math.round(change.value));
			} else if (change.kind === 'offenseMode') {
				assumptions.offenseMode = change.value;
			} else {
				const template = assumptions.templates.find(
					(candidate) => candidate.id === change.templateId
				);
				if (!template) return;
				if (change.kind === 'templateGames') template.games = Math.max(0, Math.round(change.value));
				if (change.kind === 'defensiveOutsPerGame') {
					template.defensiveOutsPerGame = Math.max(0, Math.round(change.value));
				}
			}
			assumptions.revision = bump(assumptions.revision);
			next.comparison.assumptionRef.revision = assumptions.revision;
			next.comparison.revision = bump(next.comparison.revision);
			for (const scenario of [next.comparison.baseline, ...next.comparison.candidates]) {
				scenario.revision = bump(scenario.revision);
				clearReview(scenario);
			}
		});
	}

	function handleReviewScopeChange(scope: ReviewScope): void {
		if (!activeScenario) return;
		commitMutation((next) => {
			const scenario = [next.comparison.baseline, ...next.comparison.candidates].find(
				(candidate) => candidate.id === activeScenario?.id
			);
			if (!scenario) return;
			scenario.review.scope = scope;
			touchScenario(next, scenario);
		});
	}

	function acknowledgeRules(): void {
		if (!activeScenario) return;
		const now = new Date().toISOString();
		commitMutation((next) => {
			const scenario = [next.comparison.baseline, ...next.comparison.candidates].find(
				(candidate) => candidate.id === activeScenario?.id
			);
			if (!scenario) return;
			scenario.review.uncheckedTransactionRulesAcknowledgedAt = now;
			scenario.review.acknowledgedScenarioRevision = scenario.revision;
		});
	}

	async function saveDraft(): Promise<void> {
		if (busy) return;
		busy = true;
		try {
			const result = await repository.save(bundle);
			savedAt = result.current.savedAt;
			unsaved = false;
			storageState = 'saved';
			storageMessage = `Saved revision ${result.current.bundle.comparison.revision} at ${formatSavedAt(savedAt)}.`;
		} catch (error) {
			storageState = 'failed';
			storageMessage = error instanceof Error ? error.message : 'The draft could not be saved.';
		} finally {
			busy = false;
		}
	}

	function exportDraft(): void {
		const exportBundle = $state.snapshot(bundle);
		exportBundle.results = [...calculation.results];
		if (typeof document === 'undefined') return;
		const link = document.createElement('a');
		link.href = URL.createObjectURL(
			new Blob([JSON.stringify(exportBundle, null, 2)], { type: 'application/json' })
		);
		link.download = `${bundle.bundleId}.json`;
		link.click();
		URL.revokeObjectURL(link.href);
		storageMessage = 'Export prepared with the current calculation results and input digest.';
	}

	let pendingConflict = $state<{ text: string; bundleId: string } | null>(null);
	// The library collects the D-36 acknowledgment before opening, so no
	// startup prompt is needed. File imports of other public bundles still go
	// through the per-bundle acknowledgment below.
	let pendingPublic = $state<{ text: string; replace: boolean; bundleId: string } | null>(null);
	// Bundles acknowledged as public this session (D-36) live in the one shared record the
	// workspace gate writes (public-ack.ts); the opening bundle came through that gate.
	acknowledgePublic(start.bundle.bundleId);

	function classGate(
		text: string
	):
		| { verdict: 'ok' }
		| { verdict: 'confirm-public'; bundleId: string }
		| { verdict: 'blocked-restricted' } {
		// Pre-read dataClass before touching storage; malformed input falls
		// through to the repository validator, which rejects it as today.
		let probe: unknown;
		try {
			probe = JSON.parse(text);
		} catch {
			return { verdict: 'ok' };
		}
		if (typeof probe !== 'object' || probe === null) return { verdict: 'ok' };
		const record = probe as { dataClass?: unknown; bundleId?: unknown };
		if (record.dataClass === 'restricted') return { verdict: 'blocked-restricted' };
		if (
			record.dataClass === 'public' &&
			typeof record.bundleId === 'string' &&
			!hasAcknowledgedPublic(record.bundleId)
		) {
			return { verdict: 'confirm-public', bundleId: record.bundleId };
		}
		return { verdict: 'ok' };
	}

	function activateImported(loaded: LoadedComparison, verb: string): void {
		bundle = loaded.current.bundle;
		calculation = calculateComparison(bundle);
		activeScenarioId = bundle.comparison.baseline.id;
		savedAt = loaded.current.savedAt;
		unsaved = false;
		storageState = 'saved';
		selectedEvidenceId = null;
		pendingConflict = null;
		const replay =
			loaded.replay.status === 'verified'
				? 'Replay verified.'
				: `Replay status: ${loaded.replay.status}.`;
		storageMessage = `${verb} “${model.name}” (${model.snapshotLabel}). ${replay}`;
	}

	async function runImport(text: string, replace: boolean, publicAck = false): Promise<void> {
		if (!publicAck) {
			const gate = classGate(text);
			if (gate.verdict === 'blocked-restricted') {
				storageState = 'failed';
				storageMessage =
					'Import blocked: this bundle is marked restricted. Restricted data needs an RS-08 data-owner permission record before it can be opened here; the open comparison is unchanged.';
				return;
			}
			if (gate.verdict === 'confirm-public') {
				pendingPublic = { text, replace, bundleId: gate.bundleId };
				storageMessage = `This bundle (${gate.bundleId}) uses public data — observed public values, not team approved projections. Open it for local review?`;
				return;
			}
		}
		busy = true;
		try {
			const result = await repository.importJson(text, { replaceAsNewRevision: replace });
			if (result.status === 'conflict') {
				pendingConflict = { text, bundleId: result.bundleId };
				storageMessage = `A saved comparison with ID ${result.bundleId} already exists. The open comparison is unchanged.`;
				return;
			}
			activateImported(result, 'Imported');
		} catch (error) {
			// Validation failures keep the currently open comparison intact.
			storageState = 'failed';
			storageMessage =
				error instanceof PersistenceImportError
					? `Import rejected; the open comparison is unchanged.\n${error.message}`
					: `Import failed: ${error instanceof Error ? error.message : 'unknown error'}`;
		} finally {
			busy = false;
		}
	}

	function confirmPublicImport(): void {
		const pending = pendingPublic;
		pendingPublic = null;
		if (!pending || busy) return;
		acknowledgePublic(pending.bundleId);
		void runImport(pending.text, pending.replace, true);
	}

	function declinePublicImport(): void {
		pendingPublic = null;
		storageMessage = 'Public import declined; the open comparison is unchanged.';
	}

	async function importFile(event: Event): Promise<void> {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file || busy) return;
		await runImport(await file.text(), false);
	}

	function openEvidence(evidenceId: string): void {
		// Remember the trigger so closing the drawer returns keyboard focus to
		// it (WORKFLOWS §8). The drawer itself is not a modal dialog.
		if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
			evidenceTrigger = document.activeElement;
		}
		selectedEvidenceId = evidenceId;
	}

	function closeEvidence(): void {
		selectedEvidenceId = null;
		evidenceTrigger?.focus?.();
		evidenceTrigger = null;
	}

	function selectScenario(scenarioId: string): void {
		activeScenarioId = scenarioId;
	}
</script>

<svelte:head>
	<title
		>Roster Shapes · {model.dataClass === 'synthetic' ? 'Synthetic' : 'Public-data'} comparison</title
	>
	<meta
		name="description"
		content={model.dataClass === 'synthetic'
			? 'A reproducible position-player acquisition comparison using synthetic data.'
			: 'A reproducible position-player acquisition comparison using cited public data.'}
	/>
</svelte:head>

<div class="workspace">
	<header class="hero">
		<div class="hero-copy">
			<h1 class="page-title">{model.name}</h1>
			<p class="lede">
				{#if storylineContext}<strong>{storylineContext.title}</strong>{/if}
				Compare one baseline and two candidates under the same explicit assumptions.
				{#if model.dataClass === 'synthetic'}
					Every number is synthetic, versioned, and traceable to a source or calculation.
				{:else}
					Every engine number is drawn from the cited public sources, versioned, and traceable to a
					source or calculation, not a team approved projection.
				{/if}
			</p>
			<p class="data-class-banner" data-class={model.dataClass}>
				{#if model.dataClass === 'synthetic'}
					<strong>Synthetic demo data</strong> · invented values, not team data
				{:else}
					<strong>Public data</strong> · observed public values, not team approved projections
				{/if}
			</p>
			{#if storylineContext?.retrospective}
				<p class="retrospective-banner">
					<strong>Retrospective analysis</strong> · event window: {storylineContext.date} ·
					{storylineContext.eventBasis}
				</p>
			{/if}
		</div>
		<div class="hero-actions" aria-label="Draft actions">
			<span class="storage-pill" data-state={model.storageState}>{model.storageState}</span>
			<button class="button button-secondary" type="button" onclick={onBack}>← Storylines</button>
			<label class="button button-secondary file-button">
				Import JSON
				<input
					class="visually-hidden"
					type="file"
					accept="application/json,.json"
					onchange={importFile}
					disabled={busy}
				/>
			</label>
			<button class="button button-secondary" type="button" onclick={exportDraft}
				>Export JSON</button
			>
			<button class="button button-primary" type="button" onclick={saveDraft} disabled={busy}>
				{busy ? 'Saving…' : 'Save draft'}
			</button>
		</div>
	</header>

	<div class="notice" aria-live="polite">
		<span class="notice-text">{model.storageMessage}</span>
		{#if pendingPublic}
			<button
				class="button button-secondary"
				type="button"
				disabled={busy}
				onclick={confirmPublicImport}
			>
				Open public bundle
			</button>
			<button class="button button-secondary" type="button" onclick={declinePublicImport}>
				Keep current comparison
			</button>
		{/if}
		{#if pendingConflict}
			<button
				class="button button-secondary"
				type="button"
				disabled={busy}
				onclick={() => pendingConflict && runImport(pendingConflict.text, true)}
			>
				Replace as new revision
			</button>
			<button
				class="button button-secondary"
				type="button"
				onclick={() => (pendingConflict = null)}
			>
				Cancel import
			</button>
		{/if}
		<span class="notice-meta">{model.schemaVersion} · {model.calculationVersion}</span>
	</div>

	<section class="workspace-section" aria-labelledby="comparison-heading">
		<div class="section-heading">
			<h2 id="comparison-heading">Comparison snapshot</h2>
			<span class="snapshot"
				>Source snapshot {model.snapshotLabel} · revision {model.comparisonRevision}</span
			>
		</div>
		<p class="section-intro">
			The large number is the engine's pinned estimate for the horizon. Under it, each lineup is
			packed into the same bin as the engine's best nine for that roster, sized by actual 2026 runs,
			so the headroom you can see is the value that lineup leaves off. The bins are a display layer
			and never change an engine number; the fit's total and delta are engine numbers.
		</p>
		<div class="bins-grid">
			{#each model.scenarios as scenario (scenario.id)}
				{@const bin = scenarioBins.get(scenario.id)}
				<article class:active-card={scenario.id === model.activeScenarioId} class="summary-card">
					<div class="card-topline">
						<h3 class="scenario-label">{scenario.label}</h3>
						<span class="status-dot">{scenario.feasibility}</span>
					</div>
					<p class="summary-metric">{formatMetric(scenario.offense, { withUnit: true })}</p>
					<dl class="mini-stats">
						<div>
							<dt>Offense delta</dt>
							<dd>{formatMetric(scenario.offenseDelta, { withUnit: true })}</dd>
						</div>
						<div>
							<dt>Review</dt>
							<dd>{scenario.readiness.ready ? 'Ready' : 'Needs review'}</dd>
						</div>
					</dl>
					{#if bin}
						<div class="bin-block">
							<p class="bin-meta">Actual 2026 {actualRuns(bin)} · {binStats(bin)}</p>
							<CapacityBin
								{pool}
								{bin}
								label="{scenario.label} packed into the bin: {binStats(bin)}"
							/>
						</div>
					{/if}
					<button class="card-link" type="button" onclick={() => (activeScenarioId = scenario.id)}>
						Inspect {scenario.label} <span aria-hidden="true">→</span>
					</button>
				</article>
			{/each}
			<article class="summary-card best-card">
				<div class="card-topline">
					<h3 class="scenario-label">Pool's tightest fit · engine</h3>
					{#if activeFit}<span class="status-dot">{activeFit.feasibility}</span>{/if}
				</div>
				<p class="summary-metric">
					{activeFit?.runs ?? 'unavailable'}
					<span class="unit">runs</span>
				</p>
				<dl class="mini-stats">
					<div>
						<dt>Left on the table</dt>
						<dd>{engineDelta(activeFit?.deltaVsReference?.runs)}</dd>
					</div>
					<div>
						<dt>Transfers · benched</dt>
						<dd>{activeFit?.transfers.length ?? 0} · {activeFit?.bench.length ?? 0}</dd>
					</div>
				</dl>
				<p class="summary-caption">
					The best nine this scenario's roster can field, searched per pitcher hand context from the
					bundle's dated rates and checked by the engine. Piece sizes below are still actual 2026
					runs, so this bin is a display layer over an engine lineup.
				</p>
				{#if fitBin}
					<div class="bin-block">
						<p class="bin-meta">Actual 2026 {actualRuns(fitBin)} · {binStats(fitBin)}</p>
						<CapacityBin
							{pool}
							bin={fitBin}
							label="The engine's best nine for this roster packed into the bin: {binStats(fitBin)}"
						/>
					</div>
				{/if}
			</article>
		</div>
	</section>

	<section class="workspace-section" aria-labelledby="assumptions-heading">
		<div class="section-heading compact">
			<h2 id="assumptions-heading">Assumptions</h2>
			<span class="section-note">Applied to baseline and candidates</span>
		</div>
		<AssumptionsPanel
			assumptions={model.assumptions}
			evidence={model.evidence}
			onAssumptionChange={handleAssumptionChange}
			onOpenEvidence={openEvidence}
		/>
	</section>

	<section class="workspace-section" aria-labelledby="scenario-heading">
		<div class="section-heading compact">
			<h2 id="scenario-heading">Allocation and feasibility</h2>
			<span class="section-note">Edit a draft, then save a reproducible snapshot</span>
		</div>
		<ScenarioTabs
			scenarios={model.scenarios}
			activeScenarioId={model.activeScenarioId}
			onScenarioChange={selectScenario}
		/>
		<div class="case-row">
			<ShapeCase
				{pool}
				view={activeView}
				selected={selectedPiece}
				onSelect={(id: string) => (selectedPieceId = id)}
				label="Roster case for {activeScenario?.label ??
					'the active scenario'}: nine position cutouts and a bench tray"
			/>
			<aside class="case-side" aria-label="Selected piece">
				{#if selectedPiece}
					<PieceDetail
						{pool}
						playerId={selectedPiece}
						role={activeView.roleOf.get(selectedPiece)}
					/>
				{/if}
				<CaseKey compact />
			</aside>
		</div>

		{#if activeScenario}
			<div class="scenario-grid">
				<div class="scenario-main">
					<AllocationPanel
						scenario={activeScenario}
						players={model.players}
						evidence={model.evidence}
						onAssignmentChange={handleAssignmentChange}
						onAssignmentSwap={handleAssignmentSwap}
						onAssignmentMove={handleAssignmentMove}
						onOpenEvidence={openEvidence}
					/>
					<CoveragePanel
						coverage={activeScenario.coverage}
						evidence={model.evidence}
						onOpenEvidence={openEvidence}
					/>
				</div>
				<aside class="scenario-side">
					<WorkloadPanel
						scenario={activeScenario}
						players={model.players}
						evidence={model.evidence}
						onOpenEvidence={openEvidence}
					/>
					<ReviewPanel
						scenario={activeScenario}
						evidence={model.evidence}
						onReviewScopeChange={handleReviewScopeChange}
						onAcknowledgeRules={acknowledgeRules}
						onOpenEvidence={openEvidence}
					/>
				</aside>
			</div>
		{/if}
	</section>

	{#if selectedEvidence}
		<aside class="evidence-drawer" aria-label="Evidence detail">
			<div>
				<h2>{selectedEvidence.title}</h2>
				<p class="drawer-layer">{selectedEvidence.layer} evidence</p>
				<p>{selectedEvidence.description}</p>
				{#if selectedEvidence.sourceTitle}<p class="drawer-meta">
						Source: {selectedEvidence.sourceTitle}
					</p>{/if}
				{#if selectedEvidence.formula}<p class="drawer-meta">
						Formula/version: {selectedEvidence.formula}
					</p>{/if}
				{#if selectedEvidence.limitation}<p class="drawer-meta">
						Limitation: {selectedEvidence.limitation}
					</p>{/if}
			</div>
			<button class="button button-secondary" type="button" onclick={closeEvidence}>
				Close evidence
			</button>
		</aside>
	{/if}
</div>

<style>
	.workspace {
		display: grid;
		gap: var(--spacing-600);
		max-width: 88rem;
		margin: 0 auto;
		padding: var(--spacing-400) var(--spacing-300) var(--spacing-800);
		color: var(--ink);
	}

	.hero,
	.section-heading,
	.card-topline,
	.hero-actions,
	.notice,
	.mini-stats,
	.evidence-drawer {
		display: flex;
	}

	.hero,
	.section-heading,
	.card-topline,
	.notice,
	.evidence-drawer {
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--spacing-200);
	}

	h2,
	p {
		margin-top: 0;
	}
	.hero-copy {
		display: grid;
		gap: var(--spacing-100);
	}
	.hero h1 {
		margin: 0;
		overflow-wrap: anywhere;
	}
	.lede {
		max-width: 66ch;
		margin: 0;
		color: var(--ink-muted);
		font-size: var(--text-base);
		line-height: var(--text-base--lh);
	}
	.lede strong {
		color: var(--ink);
		font-weight: 600;
	}
	.data-class-banner,
	.retrospective-banner {
		max-width: 66ch;
		margin: 0;
		border: 1px solid var(--case-300);
		border-radius: var(--radius-md);
		padding: var(--spacing-75) var(--spacing-100);
		color: var(--ink-muted);
		background: var(--case-100);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
	}
	.data-class-banner strong,
	.retrospective-banner strong {
		color: var(--ink);
	}
	.data-class-banner[data-class='public'] {
		border-color: var(--turf);
	}
	.retrospective-banner {
		border-color: var(--turf);
	}
	.hero-actions {
		align-items: center;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: var(--spacing-75);
	}
	button:disabled {
		cursor: not-allowed;
		opacity: 0.55;
	}
	.file-button {
		position: relative;
		white-space: nowrap;
	}
	.file-button:focus-within {
		outline: 2px solid var(--focus);
		outline-offset: 3px;
	}
	.notice-text {
		white-space: pre-line;
	}
	.storage-pill,
	.snapshot,
	.section-note {
		color: var(--ink-muted);
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
	}
	.storage-pill {
		border: 1px solid var(--case-300);
		border-radius: var(--radius-sm);
		padding: var(--spacing-75) var(--spacing-100);
		background: var(--case-100);
		text-transform: capitalize;
	}
	.storage-pill[data-state='saved'] {
		color: var(--grade-snug);
	}
	.storage-pill[data-state='failed'] {
		color: var(--grade-loose);
	}
	.notice {
		align-items: center;
		flex-wrap: wrap;
		border: 1px solid var(--case-300);
		border-radius: var(--radius-md);
		padding: var(--spacing-100) var(--spacing-200);
		color: var(--ink-muted);
		background: var(--case-100);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
	}
	.notice-meta {
		margin-left: auto;
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
	}
	.workspace-section {
		display: grid;
		gap: var(--spacing-200);
	}
	.section-heading {
		align-items: baseline;
		flex-wrap: wrap;
	}
	.section-heading h2 {
		margin: 0;
		font-size: var(--text-xl);
		line-height: var(--text-xl--lh);
		font-weight: 600;
	}
	.section-intro {
		max-width: 72ch;
		margin: 0;
		color: var(--ink-muted);
		font-size: var(--text-sm);
		line-height: var(--text-sm--lh);
	}
	.bins-grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: var(--spacing-200);
		align-items: start;
	}
	.summary-card {
		display: grid;
		gap: var(--spacing-100);
		border: 1px solid var(--case-300);
		border-radius: var(--radius-md);
		padding: var(--spacing-200);
		background: var(--case-100);
	}
	.summary-card.active-card {
		border: 2px solid var(--ink);
	}
	.best-card {
		border: 2px dashed var(--turf);
		background: transparent;
		box-shadow: none;
	}
	.card-topline {
		align-items: baseline;
	}
	.scenario-label {
		margin: 0;
		font-size: var(--text-sm);
		line-height: var(--text-sm--lh);
		font-weight: 600;
	}
	.status-dot {
		color: var(--grade-snug);
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
	}
	.summary-metric {
		margin: 0;
		font-family: var(--font-mono);
		font-size: var(--text-2xl);
		line-height: var(--text-2xl--lh);
		font-weight: 600;
		letter-spacing: -0.02em;
		font-variant-numeric: tabular-nums;
	}
	.summary-caption {
		margin: 0;
		color: var(--ink-muted);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
	}
	.mini-stats {
		flex-wrap: wrap;
		gap: var(--spacing-75) var(--spacing-200);
		margin: 0;
	}
	.mini-stats div {
		display: grid;
		gap: var(--spacing-25);
	}
	dt {
		color: var(--ink-muted);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
	}
	dd {
		margin: 0;
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
		font-weight: 600;
	}
	.bin-block {
		display: grid;
		gap: var(--spacing-75);
	}
	.bin-meta {
		margin: 0;
		color: var(--ink-muted);
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
	}
	.card-link {
		justify-self: start;
		min-height: 2.75rem;
		border: 0;
		padding: 0;
		color: var(--turf);
		background: transparent;
		cursor: pointer;
		font: inherit;
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
		font-weight: 600;
	}
	.case-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 22rem;
		gap: var(--spacing-300);
		align-items: start;
	}
	.case-side {
		display: grid;
		gap: var(--spacing-200);
	}
	.scenario-grid {
		display: grid;
		grid-template-columns: minmax(0, 1.45fr) minmax(18rem, 0.75fr);
		gap: var(--spacing-200);
		align-items: start;
	}
	.scenario-main,
	.scenario-side {
		display: grid;
		min-width: 0;
		gap: var(--spacing-200);
	}
	.workspace > *,
	.case-row > *,
	.summary-card,
	.scenario-main > :global(*),
	.scenario-side > :global(*) {
		min-width: 0;
	}
	.evidence-drawer {
		position: fixed;
		right: 1rem;
		bottom: 1rem;
		z-index: 5;
		width: min(28rem, calc(100vw - 2rem));
		align-items: flex-end;
		border: 1px solid var(--case-300);
		border-radius: var(--radius-md);
		padding: var(--spacing-200);
		background: var(--case-100);
		box-shadow: var(--shadow-pop);
	}
	.evidence-drawer h2 {
		margin-bottom: var(--spacing-50);
		font-size: var(--text-xl);
		line-height: var(--text-xl--lh);
		font-weight: 600;
	}
	.evidence-drawer p {
		color: var(--ink-muted);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
	}
	.drawer-layer {
		font-family: var(--font-mono);
	}
	.drawer-meta {
		margin-bottom: var(--spacing-50);
	}
	@media (max-width: 1100px) {
		.bins-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.case-row {
			grid-template-columns: 1fr;
		}
	}
	@media (max-width: 850px) {
		.hero,
		.notice {
			align-items: flex-start;
			flex-direction: column;
		}
		.hero-actions {
			justify-content: flex-start;
		}
		.notice-meta {
			margin-left: 0;
		}
		.scenario-grid {
			grid-template-columns: 1fr;
		}
	}
	@media (max-width: 560px) {
		.bins-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
