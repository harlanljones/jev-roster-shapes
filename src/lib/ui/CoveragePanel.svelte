<script lang="ts">
	import { formatOuts } from './format';
	import type { CoverageView, EvidenceView } from './types';

	let {
		coverage,
		evidence,
		onOpenEvidence = () => {}
	}: {
		coverage: readonly CoverageView[];
		evidence: readonly EvidenceView[];
		onOpenEvidence?: (evidenceId: string) => void;
	} = $props();

	let selectedTemplateId = $state('all');
	let contexts = $derived(
		Array.from(new Map(coverage.map((row) => [row.templateId, row.contextLabel])).entries())
	);
	let visibleCoverage = $derived(
		selectedTemplateId === 'all'
			? coverage
			: coverage.filter((row) => row.templateId === selectedTemplateId)
	);
	let groupedCoverage = $derived(
		Array.from(
			visibleCoverage.reduce((groups, row) => {
				const group = groups.get(row.templateId) ?? {
					label: row.contextLabel,
					rows: [] as CoverageView[]
				};
				group.rows.push(row);
				groups.set(row.templateId, group);
				return groups;
			}, new Map<string, { label: string; rows: CoverageView[] }>())
		).map(([templateId, group]) => ({ templateId, ...group }))
	);

	function displayValue(value: number | null, withUnits = true): string {
		return value === null ? 'Unavailable' : withUnits ? formatOuts(value) : String(value);
	}
</script>

<section class="panel coverage" aria-labelledby="coverage-title">
	<div class="section-heading">
		<div>
			<h2 id="coverage-title">Coverage lanes</h2>
		</div>
		<label class="context-filter">
			<span>Show context</span>
			<select bind:value={selectedTemplateId} aria-label="Show coverage context">
				<option value="all">All templates</option>
				{#each contexts as [templateId, contextLabel] (templateId)}
					<option value={templateId}>{contextLabel}</option>
				{/each}
			</select>
		</label>
	</div>
	<p class="panel-intro">
		White space is measured uncovered defensive outs. It is not the empty canvas, a shape, or a
		quality score. Values remain in integer outs; innings are display text only.
	</p>

	{#if coverage.length === 0}
		<div class="empty-state">
			<strong>No coverage result is available.</strong>
			<span>Retain the allocation inputs and retry the calculation.</span>
		</div>
	{:else}
		<div class="coverage-groups">
			{#each groupedCoverage as group (group.templateId)}
				<div class="coverage-group">
					<h3>{group.label}</h3>
					<div class="table-scroll">
						<table>
							<caption class="visually-hidden">Coverage for {group.label}</caption>
							<thead>
								<tr>
									<th scope="col">Position</th>
									<th scope="col">Demand</th>
									<th scope="col">Assigned</th>
									<th scope="col">White space</th>
									<th scope="col">Evidence</th>
								</tr>
							</thead>
							<tbody>
								{#each group.rows as row (row.position)}
									<tr
										class:missing={row.status === 'unavailable' ||
											row.shortfallOuts === null ||
											row.shortfallOuts > 0}
									>
										<th scope="row">{row.position}</th>
										<td>
											<span class="number">{displayValue(row.demandOuts)}</span>
											{#if row.demandOuts !== null}<small>{row.demandOuts} outs</small>{/if}
										</td>
										<td>
											<span class="number">{displayValue(row.allocatedOuts)}</span>
											{#if row.allocatedOuts !== null}<small>{row.allocatedOuts} outs</small>{/if}
										</td>
										<td>
											<span class="shortfall">{displayValue(row.shortfallOuts, false)}</span>
											{#if row.shortfallOuts !== null}<small>{row.shortfallOuts} outs</small>{/if}
											{#if row.reason}<small>{row.reason}</small>{/if}
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
				</div>
			{/each}
		</div>
	{/if}
</section>

<style>
	.panel {
		border: 1px solid var(--case-300);
		background: var(--case-100);
	}

	.coverage {
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

	h3 {
		margin: 0;
		color: var(--turf);
		font-size: var(--text-sm);
		line-height: var(--text-sm--lh);
	}

	.context-filter {
		display: grid;
		gap: var(--spacing-50);
		color: var(--ink-muted);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
		font-weight: 600;
	}

	.context-filter select {
		min-height: 2.35rem;
		padding: var(--spacing-75) var(--spacing-75);
		border: 1px solid var(--case-400);
		border-radius: var(--radius-md);
		background: var(--case-100);
		color: var(--ink);
		font: inherit;
	}

	.panel-intro {
		max-width: 58rem;
		margin: var(--spacing-100) 0 var(--spacing-200);
		color: var(--ink-muted);
		font-size: var(--text-sm);
		line-height: var(--text-sm--lh);
	}

	.coverage-groups {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--spacing-200);
	}

	.coverage-group {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--spacing-75);
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
		padding: var(--spacing-100) var(--spacing-100);
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

	.number,
	.shortfall {
		display: block;
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
		font-weight: 600;
	}

	.shortfall {
		color: var(--grade-loose);
	}

	tr:not(.missing) .shortfall {
		color: var(--grade-snug);
	}

	small,
	.muted {
		display: block;
		margin-top: var(--spacing-25);
		color: var(--ink-muted);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
		white-space: normal;
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
