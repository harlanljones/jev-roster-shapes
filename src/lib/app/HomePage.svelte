<script lang="ts">
	import { onMount } from 'svelte';

	import type { Bundle, Scenario } from '$lib/contracts';
	import { calculateComparison, calculateScenario, type ComparisonCalculation } from '$lib/engine';
	import { goldenBundle } from '$lib/fixtures';
	import {
		createMemoryPersistenceRepository,
		createPersistenceRepository,
		MemoryPersistenceStorage,
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
		ComparisonViewModel,
		ReviewScope
	} from '$lib/ui/types';
	import { buildComparisonViewModel } from './workspace';

	const initialBundle = structuredClone(goldenBundle);
	const initialCalculation = calculateComparison(initialBundle);
	let bundle = $state<Bundle>(initialBundle);
	let calculation = $state<ComparisonCalculation>(initialCalculation);
	let activeScenarioId = $state(initialBundle.comparison.baseline.id);
	let storageState = $state<ComparisonViewModel['storageState']>('unsaved');
	let storageMessage = $state<string | undefined>('Demo loaded from the synthetic fixture.');
	let savedAt = $state<string | null>(null);
	let unsaved = $state(true);
	let selectedEvidenceId = $state<string | null>(null);
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
	const activeScenario = $derived(
		model.scenarios.find((scenario) => scenario.id === model.activeScenarioId)
	);
	const selectedEvidence = $derived(
		model.evidence.find((evidence) => evidence.id === selectedEvidenceId)
	);

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
			// Restore a previously saved draft so a reload replays the saved
			// comparison instead of silently resetting to the fixture.
			try {
				const loaded = await repository.load(initialBundle.bundleId);
				if (!loaded) return;
				bundle = loaded.current.bundle;
				calculation = calculateComparison(bundle);
				savedAt = loaded.current.savedAt;
				unsaved = false;
				storageState = 'saved';
				storageMessage = `Restored saved revision ${loaded.current.storedRevision} at ${formatSavedAt(savedAt)}.`;
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

	function openEvidence(evidenceId: string): void {
		selectedEvidenceId = evidenceId;
	}

	function selectScenario(scenarioId: string): void {
		activeScenarioId = scenarioId;
	}
</script>

<svelte:head>
	<title>Roster Shapes · Synthetic comparison</title>
	<meta
		name="description"
		content="A reproducible position-player acquisition comparison using synthetic data."
	/>
</svelte:head>

<div class="workspace">
	<header class="hero">
		<div>
			<p class="eyebrow">Roster Shapes / synthetic workspace</p>
			<h1>{model.name}</h1>
			<p class="lede">
				Compare one baseline and two candidates under the same explicit assumptions. Every number is
				synthetic, versioned, and traceable to a source or calculation.
			</p>
		</div>
		<div class="hero-actions" aria-label="Draft actions">
			<span class="storage-pill" data-state={model.storageState}>{model.storageState}</span>
			<button class="secondary-button" type="button" onclick={exportDraft}>Export JSON</button>
			<button class="primary-button" type="button" onclick={saveDraft} disabled={busy}>
				{busy ? 'Saving…' : 'Save draft'}
			</button>
		</div>
	</header>

	<div class="notice" aria-live="polite">
		<span class="notice-mark" aria-hidden="true">i</span>
		<span>{model.storageMessage}</span>
		<span class="notice-meta">{model.schemaVersion} · {model.calculationVersion}</span>
	</div>

	<section class="workspace-section" aria-labelledby="comparison-heading">
		<div class="section-heading">
			<div>
				<p class="eyebrow">Decision surface</p>
				<h2 id="comparison-heading">Comparison snapshot</h2>
			</div>
			<span class="snapshot">{model.snapshotLabel} · revision {model.comparisonRevision}</span>
		</div>
		<div class="comparison-grid">
			{#each model.scenarios as scenario (scenario.id)}
				<article class:active-card={scenario.id === model.activeScenarioId} class="summary-card">
					<div class="card-topline">
						<span class="scenario-label">{scenario.label}</span>
						<span class="status-dot">{scenario.feasibility}</span>
					</div>
					<p class="summary-metric">{formatMetric(scenario.offense, { withUnit: true })}</p>
					<p class="summary-caption">Estimated runs · {scenario.offense.reason ?? 'Available'}</p>
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
					<button class="card-link" type="button" onclick={() => (activeScenarioId = scenario.id)}>
						Inspect {scenario.label} <span aria-hidden="true">→</span>
					</button>
				</article>
			{/each}
		</div>
	</section>

	<section class="workspace-section" aria-labelledby="assumptions-heading">
		<div class="section-heading compact">
			<div>
				<p class="eyebrow">Shared inputs</p>
				<h2 id="assumptions-heading">Assumptions</h2>
			</div>
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
			<div>
				<p class="eyebrow">Scenario workspace</p>
				<h2 id="scenario-heading">Allocation and feasibility</h2>
			</div>
			<span class="section-note">Edit a draft, then save a reproducible snapshot</span>
		</div>
		<ScenarioTabs
			scenarios={model.scenarios}
			activeScenarioId={model.activeScenarioId}
			onScenarioChange={selectScenario}
		/>

		{#if activeScenario}
			<div class="scenario-grid">
				<div class="scenario-main">
					<AllocationPanel
						scenario={activeScenario}
						players={model.players}
						evidence={model.evidence}
						onAssignmentChange={handleAssignmentChange}
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
				<p class="eyebrow">{selectedEvidence.layer} evidence</p>
				<h2>{selectedEvidence.title}</h2>
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
			<button class="secondary-button" type="button" onclick={() => (selectedEvidenceId = null)}>
				Close evidence
			</button>
		</aside>
	{/if}
</div>

<style>
	:global(:root) {
		--ink: #252522;
		--muted: #716f67;
		--line: #dedbd1;
		--line-strong: #c8c4b8;
		--paper: #f6f4ee;
		--paper-light: #fffef9;
		--paper-deep: #ebe8df;
		--panel: #fffef9;
		--rust: #a84f32;
		--rust-dark: #813a27;
		--rust-soft: #e6b8a8;
		--sage: #596f58;
		--navy: #2d4555;
	}

	:global(body) {
		background: var(--paper);
	}

	.workspace {
		min-height: 100vh;
		padding: 3rem clamp(1rem, 4vw, 4rem) 5rem;
		color: var(--ink);
		background:
			radial-gradient(circle at 90% 0%, rgb(168 79 50 / 8%), transparent 30rem), var(--paper);
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
		gap: 1rem;
	}

	.hero,
	.notice,
	.workspace-section {
		max-width: 78rem;
		margin-inline: auto;
	}

	.hero {
		margin-bottom: 2rem;
	}
	.hero h1,
	h2,
	p {
		margin-top: 0;
	}
	.hero h1 {
		max-width: 42rem;
		margin-bottom: 0.7rem;
		font-family: Georgia, serif;
		font-size: clamp(2.25rem, 5vw, 4.75rem);
		font-weight: 500;
		letter-spacing: -0.055em;
		line-height: 0.98;
	}
	.lede {
		max-width: 43rem;
		margin-bottom: 0;
		color: var(--muted);
		font-size: 1.04rem;
		line-height: 1.55;
	}
	.eyebrow {
		margin-bottom: 0.5rem;
		color: var(--rust);
		font-size: 0.7rem;
		font-weight: 750;
		letter-spacing: 0.13em;
		text-transform: uppercase;
	}
	.hero-actions {
		align-items: center;
		flex-wrap: wrap;
		justify-content: flex-end;
	}
	.primary-button,
	.secondary-button {
		border: 1px solid var(--line);
		border-radius: 999px;
		padding: 0.72rem 1rem;
		cursor: pointer;
		font: inherit;
		font-size: 0.85rem;
		font-weight: 700;
	}
	.primary-button {
		border-color: var(--rust-dark);
		color: #fffaf2;
		background: var(--rust);
	}
	.secondary-button {
		color: var(--ink);
		background: transparent;
	}
	button:focus-visible,
	:global(select:focus-visible),
	:global(input:focus-visible) {
		outline: 3px solid rgb(168 79 50 / 30%);
		outline-offset: 3px;
	}
	button:disabled {
		cursor: not-allowed;
		opacity: 0.55;
	}
	.storage-pill,
	.snapshot,
	.section-note {
		color: var(--muted);
		font-size: 0.75rem;
	}
	.storage-pill {
		border: 1px solid var(--line);
		border-radius: 999px;
		padding: 0.55rem 0.75rem;
		background: rgb(255 254 249 / 70%);
		text-transform: capitalize;
	}
	.storage-pill[data-state='saved'] {
		color: var(--sage);
	}
	.storage-pill[data-state='failed'] {
		color: var(--rust-dark);
	}
	.notice {
		align-items: center;
		margin-bottom: 3rem;
		border: 1px solid var(--line);
		border-radius: 0.75rem;
		padding: 0.85rem 1rem;
		color: var(--muted);
		background: rgb(255 254 249 / 70%);
		font-size: 0.82rem;
	}
	.notice-mark {
		display: grid;
		width: 1.5rem;
		height: 1.5rem;
		flex: 0 0 auto;
		place-items: center;
		border-radius: 50%;
		color: #fff;
		background: var(--sage);
		font-weight: 800;
	}
	.notice-meta {
		margin-left: auto;
		color: #8c897e;
		font-size: 0.72rem;
	}
	.workspace-section {
		margin-bottom: 3.2rem;
	}
	.section-heading {
		align-items: end;
		margin-bottom: 1.1rem;
	}
	.section-heading.compact {
		margin-bottom: 0.85rem;
	}
	.section-heading h2 {
		margin-bottom: 0;
		font-family: Georgia, serif;
		font-size: clamp(1.65rem, 3vw, 2.45rem);
		font-weight: 500;
		letter-spacing: -0.04em;
	}
	.comparison-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 1rem;
	}
	.summary-card {
		min-height: 16.5rem;
		border: 1px solid var(--line);
		border-radius: 1rem;
		padding: 1.25rem;
		background: var(--panel);
		box-shadow: 0 14px 34px rgb(56 46 31 / 8%);
	}
	.summary-card.active-card {
		border-color: rgb(168 79 50 / 55%);
		box-shadow: 0 18px 42px rgb(168 79 50 / 12%);
	}
	.scenario-label {
		font-size: 0.95rem;
		font-weight: 750;
	}
	.status-dot {
		color: var(--sage);
		font-size: 0.68rem;
		font-weight: 750;
		text-transform: uppercase;
	}
	.summary-metric {
		margin: 2rem 0 0.15rem;
		font-family: Georgia, serif;
		font-size: 2.5rem;
		letter-spacing: -0.05em;
	}
	.summary-caption {
		min-height: 2.5rem;
		color: var(--muted);
		font-size: 0.78rem;
		line-height: 1.45;
	}
	.mini-stats {
		gap: 1.25rem;
		margin: 1.35rem 0;
	}
	.mini-stats div {
		display: grid;
		gap: 0.2rem;
	}
	dt {
		color: var(--muted);
		font-size: 0.68rem;
		text-transform: uppercase;
	}
	dd {
		margin: 0;
		font-weight: 700;
	}
	.card-link {
		border: 0;
		padding: 0;
		color: var(--rust-dark);
		background: transparent;
		cursor: pointer;
		font: inherit;
		font-size: 0.82rem;
		font-weight: 750;
	}
	.scenario-grid {
		display: grid;
		grid-template-columns: minmax(0, 1.45fr) minmax(18rem, 0.75fr);
		gap: 1rem;
		align-items: start;
	}
	.scenario-main,
	.scenario-side {
		display: grid;
		gap: 1rem;
	}
	.evidence-drawer {
		position: fixed;
		right: 1rem;
		bottom: 1rem;
		z-index: 5;
		width: min(28rem, calc(100vw - 2rem));
		align-items: flex-end;
		border: 1px solid var(--line);
		border-radius: 1rem;
		padding: 1.25rem;
		background: var(--panel);
		box-shadow: 0 20px 60px rgb(56 46 31 / 18%);
	}
	.evidence-drawer h2 {
		margin-bottom: 0.5rem;
		font-family: Georgia, serif;
		font-size: 1.5rem;
		font-weight: 500;
	}
	.evidence-drawer p:not(.eyebrow) {
		color: var(--muted);
		font-size: 0.84rem;
		line-height: 1.5;
	}
	.drawer-meta {
		margin-bottom: 0.25rem;
		font-size: 0.76rem !important;
	}
	@media (max-width: 850px) {
		.hero,
		.section-heading,
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
		.comparison-grid,
		.scenario-grid {
			grid-template-columns: 1fr;
		}
	}
	@media (max-width: 520px) {
		.workspace {
			padding-inline: 0.85rem;
		}
		.summary-card {
			min-height: auto;
		}
	}
</style>
