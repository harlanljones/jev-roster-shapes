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
			<span class="eyebrow">Shared context</span>
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
				<option value="split">Pitcher-hand split</option>
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
		<strong>Platoon rule:</strong> pitcher-hand exposure is explicit per batting slot. Starter-hand labels
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
		Full-game templates only. Outs stay integer-valued; a display of 28 outs means 9 innings + 1
		out.
	</p>
</section>

<style>
	.panel {
		border: 1px solid var(--line);
		background: var(--paper);
		box-shadow: 0 0.9rem 2.5rem rgb(16 35 61 / 0.07);
	}

	.assumptions {
		padding: clamp(1rem, 2vw, 1.5rem);
	}

	.section-heading {
		display: flex;
		align-items: start;
		justify-content: space-between;
		gap: 1rem;
	}

	.eyebrow {
		color: var(--rust);
		font-size: 0.68rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	h2 {
		margin: 0.2rem 0 0;
		font-family: Georgia, 'Times New Roman', serif;
		font-size: clamp(1.35rem, 2vw, 1.75rem);
		font-weight: 500;
		letter-spacing: -0.03em;
	}

	.revision {
		padding: 0.35rem 0.55rem;
		border: 1px solid var(--line);
		border-radius: 999px;
		color: var(--muted);
		font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
		font-size: 0.72rem;
	}

	.panel-intro,
	.help-text {
		max-width: 58rem;
		margin: 0.8rem 0 0;
		color: var(--muted);
		font-size: 0.88rem;
	}

	.assumption-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.8rem;
		margin-top: 1.25rem;
	}

	label {
		display: grid;
		gap: 0.38rem;
		color: var(--ink);
		font-size: 0.78rem;
		font-weight: 750;
	}

	input,
	select {
		min-height: 2.45rem;
		box-sizing: border-box;
		padding: 0.55rem 0.65rem;
		border: 1px solid var(--line-strong);
		border-radius: 0.3rem;
		background: var(--paper-light);
		color: var(--ink);
		font: inherit;
		font-size: 0.88rem;
	}

	input:focus-visible,
	select:focus-visible,
	button:focus-visible {
		outline: 3px solid var(--rust-soft);
		outline-offset: 2px;
	}

	.input-with-suffix {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: center;
		gap: 0.5rem;
	}

	small,
	.template-context {
		color: var(--muted);
		font-size: 0.75rem;
		font-weight: 500;
	}

	.context-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem 1rem;
		align-items: center;
		margin-top: 1.1rem;
		padding-top: 0.85rem;
		border-top: 1px solid var(--line);
		color: var(--muted);
		font-size: 0.78rem;
	}

	.context-meta strong {
		color: var(--ink);
		font-weight: 750;
	}

	.text-button {
		padding: 0;
		border: 0;
		background: transparent;
		color: var(--rust);
		font: inherit;
		font-weight: 760;
		cursor: pointer;
		text-decoration: underline;
		text-underline-offset: 0.17em;
	}

	.template-list {
		display: grid;
		gap: 0.75rem;
		margin-top: 1.2rem;
	}

	.template-row {
		display: grid;
		grid-template-columns: minmax(12rem, 1fr) minmax(7rem, 0.35fr) minmax(10rem, 0.5fr);
		gap: 0.75rem;
		align-items: end;
		padding: 0.8rem 0;
		border-top: 1px solid var(--line);
	}

	.template-row > div {
		display: grid;
		gap: 0.18rem;
	}

	@media (max-width: 700px) {
		.assumption-grid,
		.template-row {
			grid-template-columns: 1fr;
		}
	}
</style>
