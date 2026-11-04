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
		border: 1px solid var(--case-300);
		background: var(--case-100);
	}

	.review {
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
		font-size: var(--text-lg);
		line-height: var(--text-lg--lh);
		font-weight: 600;
	}

	.ready-state {
		padding: var(--spacing-75) var(--spacing-75);
		border: 1px solid var(--grade-loose);
		border-radius: var(--radius-sm);
		color: var(--grade-loose);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
		font-weight: 600;
	}

	.ready-state.ready {
		border-color: var(--grade-snug);
		color: var(--grade-snug);
	}

	.review-controls {
		display: grid;
		grid-template-columns: minmax(13rem, 0.45fr) minmax(0, 1fr);
		gap: var(--spacing-200);
		align-items: end;
		margin-top: var(--spacing-200);
		padding: var(--spacing-200);
		background: var(--case-200);
	}

	.review-controls label {
		display: grid;
		gap: var(--spacing-50);
		color: var(--ink);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
		font-weight: 600;
	}

	select {
		min-height: 2.4rem;
		padding: var(--spacing-75) var(--spacing-75);
		border: 1px solid var(--case-400);
		border-radius: var(--radius-md);
		background: var(--case-100);
		color: var(--ink);
		font: inherit;
	}

	.review-controls p {
		margin: 0;
		color: var(--ink-muted);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
	}

	.checklist {
		display: grid;
		gap: var(--spacing-75);
		margin-top: var(--spacing-200);
	}

	.check-row {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		gap: var(--spacing-100);
		align-items: start;
		padding: var(--spacing-100) 0;
		border-bottom: 1px solid var(--case-300);
	}

	.check-row:last-child {
		border-bottom: 0;
	}

	.check-mark {
		display: grid;
		width: 1.35rem;
		height: 1.35rem;
		place-items: center;
		border: 1px solid var(--grade-loose);
		border-radius: var(--radius-sm);
		color: var(--grade-loose);
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
		font-weight: 600;
	}

	.check-row.pass .check-mark {
		border-color: var(--grade-snug);
		color: var(--grade-snug);
	}

	.check-row div {
		display: grid;
		gap: var(--spacing-25);
	}

	.check-row strong {
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
	}

	.check-row span:not(.check-mark) {
		color: var(--ink-muted);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
	}

	.check-row b {
		color: var(--grade-loose);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
		font-weight: 600;
		letter-spacing: 0.02em;
	}

	.check-row.pass b {
		color: var(--grade-snug);
	}

	.blocking-codes {
		display: grid;
		gap: var(--spacing-50);
		margin-top: var(--spacing-200);
		padding: var(--spacing-100) var(--spacing-100);
		border: 1px solid var(--grade-loose);
		border-radius: var(--radius-md);
		background: var(--case-200);
		color: var(--ink-muted);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
	}

	.blocking-codes strong {
		color: var(--ink);
	}

	.acknowledge {
		margin-top: var(--spacing-200);
		padding: var(--spacing-100) var(--spacing-100);
		border: 1px solid var(--turf);
		border-radius: var(--radius-md);
		background: var(--turf);
		color: var(--case-100);
		font: inherit;
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
		font-weight: 600;
		cursor: pointer;
	}

	.evidence-link {
		margin-top: var(--spacing-200);
		padding: 0;
		border: 0;
		background: transparent;
		color: var(--grade-loose);
		font: inherit;
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
		font-weight: 600;
		cursor: pointer;
		text-decoration: underline;
		text-underline-offset: 0.17em;
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
