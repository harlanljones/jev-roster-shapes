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
				<caption class="sr-only">Workload for {scenario.label}</caption>
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
		border: 1px solid var(--line);
		background: var(--paper);
		box-shadow: 0 0.9rem 2.5rem rgb(16 35 61 / 0.07);
	}

	.workload {
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
		font-family: var(--display);
		font-size: clamp(1.25rem, 2vw, 1.5rem);
		font-weight: 400;
		letter-spacing: 0.04em;
	}

	.state-note {
		color: var(--muted);
		font-size: 0.75rem;
	}

	.panel-intro {
		max-width: 58rem;
		margin: 0.8rem 0 1.25rem;
		color: var(--muted);
		font-size: 0.88rem;
	}

	.table-scroll {
		overflow-x: auto;
		border: 1px solid var(--line);
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.82rem;
	}

	th,
	td {
		padding: 0.6rem 0.65rem;
		border-bottom: 1px solid var(--line);
		text-align: left;
		vertical-align: top;
		white-space: nowrap;
	}

	thead th {
		background: var(--paper-deep);
		color: var(--muted);
		font-size: 0.66rem;
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

	tbody td:nth-child(2),
	tbody td:nth-child(3),
	tbody td:nth-child(4) {
		font-family: var(--mono);
		font-size: 0.77rem;
		font-weight: 700;
	}

	tbody td:nth-child(5) {
		display: grid;
		gap: 0.18rem;
		font-size: 0.73rem;
	}

	tbody tr.problem td:nth-child(5) {
		color: var(--rust);
	}

	small,
	.muted {
		display: block;
		margin-top: 0.15rem;
		color: var(--muted);
		font-size: 0.69rem;
		font-weight: 500;
		white-space: normal;
	}

	.issue-text {
		color: var(--rust);
		font-weight: 700;
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

	.classification-note {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem 0.8rem;
		margin-top: 1rem;
		padding: 0.75rem 0.85rem;
		border: 1px solid var(--rule);
		border-radius: 6px;
		background: var(--paper-deep);
		font-size: 0.78rem;
	}

	.classification-note .eyebrow {
		color: var(--teal);
	}

	.classification-note span:last-child {
		color: var(--muted);
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
