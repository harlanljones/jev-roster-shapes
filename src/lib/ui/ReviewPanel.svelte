<script lang="ts">
	import { formatSavedAt, statusLabel } from './format';
	import type { EvidenceView, ReviewScope, ScenarioView } from './types';

	let {
		scenario,
		evidence,
		onReviewScopeChange = () => {},
		onAcknowledgeRules = () => {},
		onOpenEvidence = () => {}
	}: {
		scenario: ScenarioView;
		evidence: readonly EvidenceView[];
		onReviewScopeChange?: (scope: ReviewScope) => void;
		onAcknowledgeRules?: () => void;
		onOpenEvidence?: (evidenceId: string) => void;
	} = $props();

	function checkLabel(ready: boolean): string {
		return ready ? 'Pass' : 'Needs attention';
	}
</script>

<section class="panel review" aria-labelledby="review-title">
	<div class="section-heading">
		<div>
			<span class="eyebrow">Review gate</span>
			<h2 id="review-title">Save, review, export</h2>
		</div>
		<span class:ready={scenario.readiness.ready} class="ready-state">
			{scenario.readiness.ready ? 'Ready for review' : 'Draft — not ready'}
		</span>
	</div>

	<div class="review-controls">
		<label>
			<span>Review scope</span>
			<select
				value={scenario.readiness.scope}
				onchange={(event) =>
					onReviewScopeChange(
						event.currentTarget.value === 'coverage' ? 'coverage' : 'coverage_and_offense'
					)}
			>
				<option value="coverage_and_offense">Coverage + offense</option>
				<option value="coverage">Coverage only</option>
			</select>
		</label>
		<p>
			A ready state means the saved comparison passes this checklist. It is not transaction
			approval.
		</p>
	</div>

	<div class="checklist" aria-label="Review readiness checklist">
		<div class:pass={scenario.feasibility === 'feasible'} class="check-row">
			<span class="check-mark" aria-hidden="true"
				>{scenario.feasibility === 'feasible' ? '✓' : '!'}</span
			>
			<div>
				<strong>Allocation feasibility</strong>
				<span
					>{statusLabel(scenario.feasibility)} · {scenario.issues[0]?.message ??
						'Assignments and caps reconcile.'}</span
				>
			</div>
			<b>{checkLabel(scenario.feasibility === 'feasible')}</b>
		</div>
		<div
			class:pass={scenario.offense.status === 'available' ||
				scenario.readiness.scope === 'coverage'}
			class="check-row"
		>
			<span class="check-mark" aria-hidden="true">
				{scenario.offense.status === 'available' || scenario.readiness.scope === 'coverage'
					? '✓'
					: '!'}
			</span>
			<div>
				<strong>Selected metrics</strong>
				<span>
					{scenario.offense.status === 'available'
						? 'Required offense inputs are available.'
						: `Offense: ${scenario.offense.reason ?? 'unavailable'}`}
				</span>
			</div>
			<b
				>{checkLabel(
					scenario.offense.status === 'available' || scenario.readiness.scope === 'coverage'
				)}</b
			>
		</div>
		<div class:pass={!scenario.readiness.acknowledgmentRequired} class="check-row">
			<span class="check-mark" aria-hidden="true"
				>{scenario.readiness.acknowledgmentRequired ? '!' : '✓'}</span
			>
			<div>
				<strong>Unchecked transaction rules</strong>
				<span
					>{scenario.readiness.acknowledgmentRequired
						? 'Acknowledgment is required for this revision.'
						: 'Acknowledged for this revision.'}</span
				>
			</div>
			<b>{checkLabel(!scenario.readiness.acknowledgmentRequired)}</b>
		</div>
		<div class:pass={!scenario.unsaved} class="check-row">
			<span class="check-mark" aria-hidden="true">{scenario.unsaved ? '!' : '✓'}</span>
			<div>
				<strong>Saved revision</strong>
				<span
					>{scenario.unsaved
						? 'Save the current revision before review.'
						: formatSavedAt(scenario.savedAt)}</span
				>
			</div>
			<b>{checkLabel(!scenario.unsaved)}</b>
		</div>
	</div>

	{#if scenario.readiness.blockingCodes.length > 0}
		<div class="blocking-codes" role="status">
			<strong>Blocking codes</strong>
			<span>{scenario.readiness.blockingCodes.join(' · ')}</span>
		</div>
	{/if}

	{#if scenario.readiness.acknowledgmentRequired}
		<button class="acknowledge" type="button" onclick={onAcknowledgeRules}>
			Acknowledge unchecked rules for revision {scenario.revision}
		</button>
	{/if}

	{#if scenario.offense.evidenceId && evidence.some((item) => item.id === scenario.offense.evidenceId)}
		<button
			class="evidence-link"
			type="button"
			onclick={() => onOpenEvidence(scenario.offense.evidenceId!)}
		>
			Inspect metric availability evidence
		</button>
	{/if}
</section>

<style>
	.panel {
		border: 1px solid var(--line);
		background: var(--paper);
		box-shadow: 0 0.9rem 2.5rem rgb(16 35 61 / 0.07);
	}

	.review {
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

	.ready-state {
		padding: 0.4rem 0.6rem;
		border: 1px solid var(--rust);
		border-radius: 999px;
		color: var(--rust);
		font-size: 0.72rem;
		font-weight: 800;
	}

	.ready-state.ready {
		border-color: var(--teal);
		color: var(--teal);
	}

	.review-controls {
		display: grid;
		grid-template-columns: minmax(13rem, 0.45fr) minmax(0, 1fr);
		gap: 1rem;
		align-items: end;
		margin-top: 1.25rem;
		padding: 0.9rem;
		background: var(--paper-deep);
	}

	.review-controls label {
		display: grid;
		gap: 0.3rem;
		color: var(--ink);
		font-size: 0.76rem;
		font-weight: 750;
	}

	select {
		min-height: 2.4rem;
		padding: 0.5rem 0.6rem;
		border: 1px solid var(--line-strong);
		border-radius: 0.3rem;
		background: var(--paper-light);
		color: var(--ink);
		font: inherit;
	}

	.review-controls p {
		margin: 0;
		color: var(--muted);
		font-size: 0.8rem;
	}

	.checklist {
		display: grid;
		gap: 0.55rem;
		margin-top: 1rem;
	}

	.check-row {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		gap: 0.65rem;
		align-items: start;
		padding: 0.75rem 0;
		border-bottom: 1px solid var(--line);
	}

	.check-row:last-child {
		border-bottom: 0;
	}

	.check-mark {
		display: grid;
		width: 1.35rem;
		height: 1.35rem;
		place-items: center;
		border: 1px solid var(--rust);
		border-radius: 50%;
		color: var(--rust);
		font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
		font-size: 0.72rem;
		font-weight: 900;
	}

	.check-row.pass .check-mark {
		border-color: var(--teal);
		color: var(--teal);
	}

	.check-row div {
		display: grid;
		gap: 0.15rem;
	}

	.check-row strong {
		font-size: 0.82rem;
	}

	.check-row span:not(.check-mark) {
		color: var(--muted);
		font-size: 0.75rem;
	}

	.check-row b {
		color: var(--rust);
		font-size: 0.7rem;
		font-weight: 800;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	.check-row.pass b {
		color: var(--teal);
	}

	.blocking-codes {
		display: grid;
		gap: 0.2rem;
		margin-top: 0.9rem;
		padding: 0.7rem 0.8rem;
		border-left: 3px solid var(--rust);
		background: var(--paper-deep);
		color: var(--muted);
		font-size: 0.75rem;
	}

	.blocking-codes strong {
		color: var(--ink);
	}

	.acknowledge {
		margin-top: 1rem;
		padding: 0.7rem 0.85rem;
		border: 1px solid var(--navy);
		border-radius: 0.3rem;
		background: var(--navy);
		color: var(--paper);
		font: inherit;
		font-size: 0.78rem;
		font-weight: 760;
		cursor: pointer;
	}

	.evidence-link {
		margin-top: 0.9rem;
		padding: 0;
		border: 0;
		background: transparent;
		color: var(--rust);
		font: inherit;
		font-size: 0.75rem;
		font-weight: 760;
		cursor: pointer;
		text-decoration: underline;
		text-underline-offset: 0.17em;
	}

	button:focus-visible,
	select:focus-visible {
		outline: 3px solid var(--rust-soft);
		outline-offset: 2px;
	}

	@media (max-width: 600px) {
		.section-heading,
		.review-controls {
			grid-template-columns: 1fr;
			align-items: stretch;
		}

		.section-heading {
			flex-direction: column;
		}
	}
</style>
