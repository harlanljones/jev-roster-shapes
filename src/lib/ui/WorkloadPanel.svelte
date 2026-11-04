<script lang="ts">
	import { formatCount, formatOuts } from './format';
	import type { EvidenceView, ScenarioView, UiPlayer } from './types';

	let {
		scenario,
		players,
		evidence,
		onOpenEvidence = () => {}
	}: {
		scenario: ScenarioView;
		players: readonly UiPlayer[];
		evidence: readonly EvidenceView[];
		onOpenEvidence?: (evidenceId: string) => void;
	} = $props();

	function playerName(playerId: string): string {
		return players.find((player) => player.id === playerId)?.name ?? playerId;
	}

	function limit(value: number | null): string {
		return value === null ? 'Unknown limit' : String(value);
	}

	function issueSummary(issues: readonly { code: string; message: string }[]): string {
		return issues.map((issue) => `${issue.code}: ${issue.message}`).join(' ');
	}
</script>

<section class="panel workload" aria-labelledby="workload-title">
	<div class="section-heading">
		<div>
			<h2 id="workload-title">Workload & eligibility</h2>
		</div>
		<span class="state-note">0 is a real value · unknown stays unknown</span>
	</div>
	<p class="panel-intro">
		Allocated PA, starts, and defensive outs are separate quantities. An unassigned slot retains its
		PA budget; it does not disappear from the comparison.
	</p>

	{#if scenario.workload.length === 0}
		<div class="empty-state">
			<strong>Workload totals are unavailable.</strong>
			<span>Raw assignment inputs remain available above.</span>
		</div>
	{:else}
		<div class="table-scroll">
			<table>
				<caption class="visually-hidden">Workload for {scenario.label}</caption>
				<thead>
					<tr>
						<th scope="col">Player</th>
						<th scope="col">Starts</th>
						<th scope="col">Defensive outs</th>
						<th scope="col">PA</th>
						<th scope="col">Limit checks</th>
						<th scope="col">Evidence</th>
					</tr>
				</thead>
				<tbody>
					{#each scenario.workload as row (row.playerId)}
						<tr class:problem={row.issues.length > 0}>
							<th scope="row">
								<span>{playerName(row.playerId)}</span>
								<small>{row.playerId}</small>
							</th>
							<td>{formatCount(row.starts)}</td>
							<td>
								{row.defensiveOuts === null ? 'Unavailable' : formatOuts(row.defensiveOuts)}
								{#if row.defensiveOuts !== null}<small>{row.defensiveOuts} outs</small>{/if}
							</td>
							<td>{formatCount(row.pa)}</td>
							<td>
								<span>Starts ≤ {limit(row.maxStarts)}</span>
								<span>Defense ≤ {limit(row.maxDefensiveOuts)}</span>
								<span>PA ≤ {limit(row.maxPa)}</span>
								{#if row.issues.length > 0}
									<small class="issue-text" title={issueSummary(row.issues)}>
										{row.issues[0]?.code}: {row.issues[0]?.message}
									</small>
								{/if}
							</td>
							<td>
								{#if row.evidenceId && evidence.some((item) => item.id === row.evidenceId)}
									<button
										class="evidence-button"
										type="button"
										onclick={() => onOpenEvidence(row.evidenceId!)}
									>
										Inspect
									</button>
								{:else}
									<span class="muted">Input view</span>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	{#if scenario.classification}
		<div class="classification-note" aria-label="Optional profile classification">
			<span class="eyebrow">Optional profile label</span>
			<strong>{scenario.classification.label ?? 'Unclassified'}</strong>
			<span
				>{scenario.classification.detail ??
					'Quantitative results do not depend on this label.'}</span
			>
		</div>
	{/if}
</section>

<style>
	.panel {
		border: 1px solid var(--case-300);
		background: var(--case-100);
	}

	.workload {
		padding: var(--spacing-300);
	}

	.section-heading {
		display: flex;
		align-items: start;
		justify-content: space-between;
		gap: var(--spacing-200);
	}

	.eyebrow {
		color: var(--grade-loose);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
		font-weight: 600;
		letter-spacing: 0.02em;
	}

	h2 {
		margin: var(--spacing-50) 0 0;
		font-family: var(--font-sans);
		font-size: var(--text-2xl);
		line-height: var(--text-2xl--lh);
		font-weight: 400;
		letter-spacing: 0.04em;
	}

	.state-note {
		color: var(--ink-muted);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
	}

	.panel-intro {
		max-width: 58rem;
		margin: var(--spacing-100) 0 var(--spacing-200);
		color: var(--ink-muted);
		font-size: var(--text-sm);
		line-height: var(--text-sm--lh);
	}

	/* Wide tables scroll inside their own container, never the page. The container is positioned
	   so the visually hidden captions and labels inside it are clipped with the table instead of
	   escaping to the page at their column offset. */
	.table-scroll {
		position: relative;
		min-width: 0;
		overflow-x: auto;
		border: 1px solid var(--case-300);
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
	}

	th,
	td {
		padding: var(--spacing-75) var(--spacing-100);
		border-bottom: 1px solid var(--case-300);
		text-align: left;
		vertical-align: top;
		white-space: nowrap;
	}

	thead th {
		background: var(--case-200);
		color: var(--ink-muted);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
		font-weight: 600;
		letter-spacing: 0.02em;
	}

	tbody tr:last-child th,
	tbody tr:last-child td {
		border-bottom: 0;
	}

	tbody th {
		color: var(--turf);
		font-weight: 600;
	}

	tbody td:nth-child(2),
	tbody td:nth-child(3),
	tbody td:nth-child(4) {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
		font-weight: 600;
	}

	tbody td:nth-child(5) {
		display: grid;
		gap: var(--spacing-25);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
	}

	tbody tr.problem td:nth-child(5) {
		color: var(--grade-loose);
	}

	small,
	.muted {
		display: block;
		margin-top: var(--spacing-25);
		color: var(--ink-muted);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
		font-weight: 500;
		white-space: normal;
	}

	.issue-text {
		color: var(--grade-loose);
		font-weight: 600;
	}

	.evidence-button {
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

	.classification-note {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--spacing-75) var(--spacing-100);
		margin-top: var(--spacing-200);
		padding: var(--spacing-100) var(--spacing-100);
		border: 1px solid var(--case-300);
		border-radius: var(--radius-md);
		background: var(--case-200);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
	}

	.classification-note .eyebrow {
		color: var(--grade-snug);
	}

	.classification-note span:last-child {
		color: var(--ink-muted);
	}

	.empty-state {
		display: grid;
		gap: var(--spacing-50);
		padding: var(--spacing-300);
		border: 1px dashed var(--case-400);
		background: var(--case-200);
		color: var(--ink-muted);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
	}

	.empty-state strong {
		color: var(--ink);
	}

	@media (max-width: 600px) {
		.section-heading {
			align-items: stretch;
			flex-direction: column;
		}
	}
</style>
