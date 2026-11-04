<script lang="ts">
	import type { AssumptionChange, AssumptionsView, EvidenceView } from './types';

	let {
		assumptions,
		evidence,
		onAssumptionChange = () => {},
		onOpenEvidence = () => {}
	}: {
		assumptions: AssumptionsView;
		evidence: readonly EvidenceView[];
		onAssumptionChange?: (change: AssumptionChange) => void;
		onOpenEvidence?: (evidenceId: string) => void;
	} = $props();

	const assumptionEvidence = $derived(
		assumptions.evidenceId ? evidence.find((item) => item.id === assumptions.evidenceId) : undefined
	);
</script>

<section class="panel assumptions" aria-labelledby="assumptions-title">
	<div class="section-heading">
		<div>
			<h2 id="assumptions-title">Shared planning context</h2>
		</div>
		<div class="revision">Revision {assumptions.revision}</div>
	</div>
	<p class="panel-intro">
		Baseline, Candidate A, and Candidate B use this same planning context. Edits create a new
		comparison revision and clear review acknowledgments.
	</p>

	<div class="assumption-grid">
		<label>
			<span>Planning horizon</span>
			<span class="input-with-suffix">
				<input
					type="number"
					min="0"
					step="1"
					value={assumptions.horizonGames}
					aria-describedby="horizon-help"
					onchange={(event) =>
						onAssumptionChange({
							kind: 'horizonGames',
							value: Number(event.currentTarget.value)
						})}
				/>
				<small>games</small>
			</span>
		</label>
		<label>
			<span>Offense mode</span>
			<select
				value={assumptions.offenseMode}
				onchange={(event) =>
					onAssumptionChange({
						kind: 'offenseMode',
						value: event.currentTarget.value === 'split' ? 'split' : 'overall'
					})}
			>
				<option value="overall">Overall rate</option>
				<option value="split">Pitcher hand split</option>
			</select>
		</label>
	</div>

	<div class="context-meta">
		<span><strong>Metric</strong> {assumptions.metricDefinitionId} · {assumptions.metricUnit}</span>
		<span><strong>Author</strong> {assumptions.authorId}</span>
		{#if assumptionEvidence}
			<button
				class="text-button"
				type="button"
				onclick={() => onOpenEvidence(assumptionEvidence.id)}
			>
				Inspect assumption source
			</button>
		{/if}
	</div>
	<p class="platoon-rule">
		<strong>Platoon rule:</strong> pitcher hand exposure is explicit per batting slot. Starter hand labels
		are context only and never rewrite L/R/unknown PA buckets.
	</p>

	<div class="template-list">
		{#each assumptions.templates as template (template.id)}
			<div class="template-row">
				<div>
					<strong>{template.label}</strong>
					<span class="template-context"
						>{template.starterHand} context · explicit slot exposure below</span
					>
				</div>
				<label>
					<span>Games</span>
					<input
						type="number"
						min="0"
						step="1"
						value={template.games}
						aria-label={`${template.label} games`}
						onchange={(event) =>
							onAssumptionChange({
								kind: 'templateGames',
								templateId: template.id,
								value: Number(event.currentTarget.value)
							})}
					/>
				</label>
				<label>
					<span>Defensive outs / game</span>
					<input
						type="number"
						min="0"
						step="1"
						value={template.defensiveOutsPerGame}
						aria-label={`${template.label} defensive outs per game`}
						onchange={(event) =>
							onAssumptionChange({
								kind: 'defensiveOutsPerGame',
								templateId: template.id,
								value: Number(event.currentTarget.value)
							})}
					/>
				</label>
			</div>
		{/each}
	</div>
	<p id="horizon-help" class="help-text">
		Full game templates only. Outs stay whole number; a display of 28 outs means 9 innings + 1 out.
	</p>
</section>

<style>
	.panel {
		border: 1px solid var(--case-300);
		background: var(--case-100);
	}

	.assumptions {
		padding: var(--spacing-300);
	}

	.section-heading {
		display: flex;
		align-items: start;
		justify-content: space-between;
		gap: var(--spacing-200);
	}

	h2 {
		margin: var(--spacing-50) 0 0;
		font-family: var(--font-sans);
		font-size: var(--text-2xl);
		line-height: var(--text-2xl--lh);
		font-weight: 400;
		letter-spacing: 0.04em;
	}

	.revision {
		padding: var(--spacing-50) var(--spacing-75);
		border: 1px solid var(--case-300);
		border-radius: var(--radius-full);
		color: var(--ink-muted);
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
	}

	.panel-intro,
	.help-text {
		max-width: 58rem;
		margin: var(--spacing-100) 0 0;
		color: var(--ink-muted);
		font-size: var(--text-sm);
		line-height: var(--text-sm--lh);
	}

	.assumption-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--spacing-100);
		margin-top: var(--spacing-200);
	}

	label {
		display: grid;
		gap: var(--spacing-75);
		color: var(--ink);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
		font-weight: 600;
	}

	input,
	select {
		min-height: 2.45rem;
		box-sizing: border-box;
		padding: var(--spacing-75) var(--spacing-100);
		border: 1px solid var(--case-400);
		border-radius: var(--radius-md);
		background: var(--case-100);
		color: var(--ink);
		font: inherit;
		font-size: var(--text-sm);
		line-height: var(--text-sm--lh);
	}

	input:focus-visible,
	select:focus-visible,
	button:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
	}

	.input-with-suffix {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: center;
		gap: var(--spacing-75);
	}

	small,
	.template-context {
		color: var(--ink-muted);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
		font-weight: 500;
	}

	.context-meta {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-75) var(--spacing-200);
		align-items: center;
		margin-top: var(--spacing-200);
		padding-top: var(--spacing-100);
		border-top: 1px solid var(--case-300);
		color: var(--ink-muted);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
	}

	.context-meta strong {
		color: var(--ink);
		font-weight: 600;
	}

	.text-button {
		padding: 0;
		border: 0;
		background: transparent;
		color: var(--grade-loose);
		font: inherit;
		font-weight: 600;
		cursor: pointer;
		text-decoration: underline;
		text-underline-offset: 0.17em;
	}

	.template-list {
		display: grid;
		gap: var(--spacing-100);
		margin-top: var(--spacing-200);
	}

	.template-row {
		display: grid;
		grid-template-columns: minmax(12rem, 1fr) minmax(7rem, 0.35fr) minmax(10rem, 0.5fr);
		gap: var(--spacing-100);
		align-items: end;
		padding: var(--spacing-100) 0;
		border-top: 1px solid var(--case-300);
	}

	.template-row > div {
		display: grid;
		gap: var(--spacing-25);
	}

	@media (max-width: 700px) {
		.assumption-grid,
		.template-row {
			grid-template-columns: 1fr;
		}
	}
</style>
