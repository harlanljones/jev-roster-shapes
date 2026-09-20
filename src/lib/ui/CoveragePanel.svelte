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
			<span class="eyebrow">Measured fielding demand</span>
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
							<caption class="sr-only">Coverage for {group.label}</caption>
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
		border: 1px solid var(--line);
		background: var(--paper);
		box-shadow: 0 0.9rem 2.5rem rgb(16 35 61 / 0.07);
	}

	.coverage {
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

	h3 {
		margin: 0;
		color: var(--navy);
		font-size: 0.9rem;
	}

	.context-filter {
		display: grid;
		gap: 0.3rem;
		color: var(--muted);
		font-size: 0.72rem;
		font-weight: 750;
	}

	.context-filter select {
		min-height: 2.35rem;
		padding: 0.45rem 0.6rem;
		border: 1px solid var(--line-strong);
		border-radius: 0.3rem;
		background: var(--paper-light);
		color: var(--ink);
		font: inherit;
	}

	.panel-intro {
		max-width: 58rem;
		margin: 0.8rem 0 1.25rem;
		color: var(--muted);
		font-size: 0.88rem;
	}

	.coverage-groups {
		display: grid;
		gap: 1.1rem;
	}

	.coverage-group {
		display: grid;
		gap: 0.55rem;
	}

	.table-scroll {
		overflow-x: auto;
		border: 1px solid var(--line);
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.84rem;
	}

	th,
	td {
		padding: 0.65rem 0.7rem;
		border-bottom: 1px solid var(--line);
		text-align: left;
		vertical-align: top;
		white-space: nowrap;
	}

	thead th {
		background: var(--paper-deep);
		color: var(--muted);
		font-size: 0.68rem;
		font-weight: 800;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	tbody tr:last-child th,
	tbody tr:last-child td {
		border-bottom: 0;
	}

	tbody th {
		color: var(--navy);
		font-weight: 800;
	}

	.number,
	.shortfall {
		display: block;
		font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
		font-size: 0.82rem;
		font-weight: 760;
	}

	.shortfall {
		color: var(--rust);
	}

	tr:not(.missing) .shortfall {
		color: var(--teal);
	}

	small,
	.muted {
		display: block;
		margin-top: 0.16rem;
		color: var(--muted);
		font-size: 0.7rem;
		white-space: normal;
	}

	.evidence-button {
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

	.empty-state {
		display: grid;
		gap: 0.25rem;
		padding: 1.3rem;
		border: 1px dashed var(--line-strong);
		background: var(--paper-deep);
		color: var(--muted);
		font-size: 0.86rem;
	}

	.empty-state strong {
		color: var(--ink);
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	@media (max-width: 600px) {
		.section-heading {
			align-items: stretch;
			flex-direction: column;
		}
	}
</style>
