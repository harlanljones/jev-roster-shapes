<script lang="ts">
	import type { AssignmentChange, EvidenceView, ScenarioView, UiPlayer } from './types';

	let {
		scenario,
		players,
		evidence,
		onAssignmentChange = () => {},
		onOpenEvidence = () => {}
	}: {
		scenario: ScenarioView;
		players: readonly UiPlayer[];
		evidence: readonly EvidenceView[];
		onAssignmentChange?: (change: AssignmentChange) => void;
		onOpenEvidence?: (evidenceId: string) => void;
	} = $props();

	function playerName(playerId: string | null): string {
		if (playerId === null) return 'Unassigned';
		return (
			players.find((player) => player.id === playerId)?.name ??
			`${playerId} · unavailable reference`
		);
	}

	function scenarioPlayers(): readonly UiPlayer[] {
		return players.filter((player) => scenario.memberIds.includes(player.id));
	}

	function handleAssignmentChange(templateId: string, order: number, event: Event): void {
		const playerId = (event.currentTarget as HTMLSelectElement).value;
		onAssignmentChange({
			scenarioId: scenario.id,
			templateId,
			order,
			playerId: playerId === '' ? null : playerId
		});
	}
</script>

<div
	class="panel allocation"
	id={`scenario-panel-${scenario.id}`}
	aria-labelledby="allocation-title"
	role="tabpanel"
>
	<div class="section-heading">
		<div>
			<span class="eyebrow">Editable allocation</span>
			<h2 id="allocation-title">Lineup ledger</h2>
		</div>
		<div class="allocation-status">
			<span class:updating={scenario.calculationState === 'updating'}>
				{scenario.calculationState === 'updating' ? 'Updating' : scenario.feasibility}
			</span>
			<span>Revision {scenario.revision}</span>
		</div>
	</div>
	<p class="panel-intro">
		Choose one player per slot. A keyboard selector is the primary editing path; a later integration
		can add Move or Swap previews without changing this contract.
	</p>

	{#if scenario.issues.length > 0}
		<div class="issue-banner" role="alert">
			<strong
				>{scenario.feasibility === 'invalid' ? 'Invalid allocation' : 'Incomplete draft'}</strong
			>
			<span>{scenario.issues[0]?.message}</span>
			{#if scenario.issues[0]?.path}<code>{scenario.issues[0].path}</code>{/if}
		</div>
	{/if}

	<div class="template-stack">
		{#each scenario.templates as template (template.id)}
			<div class="template-card">
				<div class="template-heading">
					<div>
						<h3>{template.label}</h3>
						<span
							>{template.games} games · {template.defensiveOutsPerGame} defensive outs per game · {template.starterHand}
							starter context</span
						>
					</div>
					{#if template.evidenceId && evidence.some((item) => item.id === template.evidenceId)}
						<button
							class="evidence-button"
							type="button"
							onclick={() => onOpenEvidence(template.evidenceId!)}
						>
							Inspect template source
						</button>
					{/if}
				</div>
				<div class="table-scroll">
					<table>
						<caption class="sr-only">Assignments for {template.label}</caption>
						<thead>
							<tr>
								<th scope="col">Order</th>
								<th scope="col">Role</th>
								<th scope="col">Slot PA</th>
								<th scope="col">Pitcher exposure</th>
								<th scope="col">Assigned player</th>
								<th scope="col">Status</th>
							</tr>
						</thead>
						<tbody>
							{#each template.assignments as slot (slot.order)}
								<tr
									class:problem={slot.eligibility === 'ineligible' ||
										slot.eligibility === 'unassigned'}
								>
									<th scope="row">{slot.order}</th>
									<td><strong>{slot.role}</strong></td>
									<td>
										<span class="number">{slot.pa}</span>
										<small>PA</small>
									</td>
									<td>
										<span class="exposure"
											>{slot.paByPitcherHand.L} L · {slot.paByPitcherHand.R} R · {slot
												.paByPitcherHand.unknown} unknown</span
										>
									</td>
									<td>
										<label class="sr-only" for={`${scenario.id}-${template.id}-${slot.order}`}>
											{template.label}
											{slot.role} player
										</label>
										<select
											id={`${scenario.id}-${template.id}-${slot.order}`}
											value={slot.playerId ?? ''}
											aria-label={`${template.label}, ${slot.role}, assigned player`}
											onchange={(event) => handleAssignmentChange(template.id, slot.order, event)}
										>
											<option value="">Unassigned</option>
											{#if slot.playerId && !scenario.memberIds.includes(slot.playerId)}
												<option value={slot.playerId}>{playerName(slot.playerId)}</option>
											{/if}
											{#each scenarioPlayers() as player (player.id)}
												<option value={player.id}>{player.name}</option>
											{/each}
										</select>
									</td>
									<td>
										{#if slot.eligibility === 'unassigned'}
											<span class="status warn">Unassigned</span>
										{:else if slot.eligibility === 'ineligible'}
											<span class="status warn">Ineligible</span>
											{#if slot.issue}<small>{slot.issue.message}</small>{/if}
										{:else}
											<span class="status good">Eligible</span>
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
</div>

<style>
	.panel {
		border: 1px solid var(--line);
		background: var(--paper);
		box-shadow: 0 0.9rem 2.5rem rgb(16 35 61 / 0.07);
	}

	.allocation {
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

	.allocation-status {
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem;
		color: var(--muted);
		font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
		font-size: 0.72rem;
	}

	.allocation-status span:first-child {
		color: var(--teal);
		font-weight: 800;
	}

	.allocation-status span:first-child.updating {
		color: var(--rust);
	}

	.panel-intro {
		max-width: 58rem;
		margin: 0.8rem 0 1.25rem;
		color: var(--muted);
		font-size: 0.88rem;
	}

	.issue-banner {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem 0.65rem;
		align-items: baseline;
		margin-bottom: 1rem;
		padding: 0.75rem 0.85rem;
		border-left: 3px solid var(--rust);
		background: var(--paper-deep);
		color: var(--muted);
		font-size: 0.78rem;
	}

	.issue-banner strong,
	.issue-banner code {
		color: var(--rust);
	}

	.issue-banner code {
		font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
	}

	.template-stack {
		display: grid;
		gap: 1.2rem;
	}

	.template-card {
		border: 1px solid var(--line);
	}

	.template-heading {
		display: flex;
		align-items: start;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.8rem 0.85rem;
		background: var(--paper-deep);
	}

	.template-heading div {
		display: grid;
		gap: 0.2rem;
	}

	h3 {
		margin: 0;
		color: var(--navy);
		font-size: 0.9rem;
	}

	.template-heading span {
		color: var(--muted);
		font-size: 0.72rem;
	}

	.evidence-button {
		border: 0;
		background: transparent;
		color: var(--rust);
		font: inherit;
		font-size: 0.73rem;
		font-weight: 760;
		cursor: pointer;
		text-decoration: underline;
		text-underline-offset: 0.17em;
		white-space: nowrap;
	}

	.table-scroll {
		overflow-x: auto;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.8rem;
	}

	th,
	td {
		padding: 0.58rem 0.65rem;
		border-bottom: 1px solid var(--line);
		text-align: left;
		vertical-align: middle;
		white-space: nowrap;
	}

	thead th {
		color: var(--muted);
		font-size: 0.65rem;
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
	.exposure {
		font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
		font-size: 0.75rem;
	}

	.exposure {
		color: var(--muted);
	}

	select {
		min-width: 10.8rem;
		min-height: 2.25rem;
		padding: 0.4rem 0.5rem;
		border: 1px solid var(--line-strong);
		border-radius: 0.25rem;
		background: var(--paper-light);
		color: var(--ink);
		font: inherit;
		font-size: 0.76rem;
	}

	select:focus-visible,
	button:focus-visible {
		outline: 3px solid var(--rust-soft);
		outline-offset: 2px;
	}

	tr.problem {
		background: rgb(188 91 62 / 0.06);
	}

	.status {
		font-size: 0.72rem;
		font-weight: 800;
	}

	.status.good {
		color: var(--teal);
	}

	.status.warn {
		color: var(--rust);
	}

	small {
		display: block;
		margin-top: 0.12rem;
		color: var(--muted);
		font-size: 0.67rem;
		font-weight: 500;
		white-space: normal;
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
		.section-heading,
		.template-heading {
			align-items: stretch;
			flex-direction: column;
		}
	}
</style>
