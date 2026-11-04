<script lang="ts">
	import type {
		AssignmentChange,
		AssignmentMove,
		AssignmentSwap,
		EvidenceView,
		ScenarioView,
		TemplateView,
		UiPlayer
	} from './types';

	let {
		scenario,
		players,
		evidence,
		onAssignmentChange = () => {},
		onAssignmentSwap = () => {},
		onAssignmentMove = () => {},
		onOpenEvidence = () => {}
	}: {
		scenario: ScenarioView;
		players: readonly UiPlayer[];
		evidence: readonly EvidenceView[];
		onAssignmentChange?: (change: AssignmentChange) => void;
		onAssignmentSwap?: (swap: AssignmentSwap) => void;
		onAssignmentMove?: (move: AssignmentMove) => void;
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

	function assignedLabel(templateId: string, order: number): string {
		const slot = scenario.templates
			.find((template) => template.id === templateId)
			?.assignments.find((candidate) => candidate.order === order);
		return slot ? playerName(slot.playerId) : 'Unassigned';
	}

	function slotSummary(template: TemplateView, order: number): string {
		const slot = template.assignments.find((candidate) => candidate.order === order);
		if (!slot) return `slot ${order}`;
		return `slot ${slot.order} (${slot.role} · ${slot.pa} PA · ${playerName(slot.playerId)})`;
	}

	// Controlled per-template selections for the Swap/Move forms. Defaults fall
	// back to the first slots so the live preview always describes a real edit.
	let swapA = $state<Record<string, number>>({});
	let swapB = $state<Record<string, number>>({});
	let moveFrom = $state<Record<string, number>>({});
	let moveTo = $state<Record<string, number>>({});

	function swapOrderA(template: TemplateView): number {
		return swapA[template.id] ?? template.assignments[0]?.order ?? 1;
	}

	function swapOrderB(template: TemplateView): number {
		return (
			swapB[template.id] ?? template.assignments[1]?.order ?? template.assignments[0]?.order ?? 1
		);
	}

	function moveOrderFrom(template: TemplateView): number {
		return (
			moveFrom[template.id] ??
			template.assignments.find((slot) => slot.playerId !== null)?.order ??
			template.assignments[0]?.order ??
			1
		);
	}

	function moveOrderTo(template: TemplateView): number {
		return (
			moveTo[template.id] ??
			template.assignments.find((slot) => slot.playerId === null)?.order ??
			template.assignments[0]?.order ??
			1
		);
	}

	function movePreview(template: TemplateView): { text: string; valid: boolean } {
		const from = moveOrderFrom(template);
		const to = moveOrderTo(template);
		if (from === to) {
			return { text: 'Choose two different slots to move a player.', valid: false };
		}
		const fromSlot = template.assignments.find((slot) => slot.order === from);
		const toSlot = template.assignments.find((slot) => slot.order === to);
		if (!fromSlot || fromSlot.playerId === null) {
			return { text: `${slotSummary(template, from)} has no player to move.`, valid: false };
		}
		if (!toSlot || toSlot.playerId !== null) {
			return {
				text: `${slotSummary(template, to)} is occupied by ${assignedLabel(template.id, to)} — use Swap to exchange two players.`,
				valid: false
			};
		}
		return {
			text: `Move ${playerName(fromSlot.playerId)} from ${slotSummary(template, from)} to ${slotSummary(template, to)}. Slot ${from} becomes Unassigned.`,
			valid: true
		};
	}

	function handleSwap(templateId: string, event: SubmitEvent): void {
		event.preventDefault();
		const template = scenario.templates.find((candidate) => candidate.id === templateId);
		if (!template) return;
		const orderA = swapOrderA(template);
		const orderB = swapOrderB(template);
		if (orderA === orderB) return;
		onAssignmentSwap({ scenarioId: scenario.id, templateId, orderA, orderB });
	}

	function handleMove(templateId: string, event: SubmitEvent): void {
		event.preventDefault();
		const template = scenario.templates.find((candidate) => candidate.id === templateId);
		if (!template) return;
		if (!movePreview(template).valid) return;
		onAssignmentMove({
			scenarioId: scenario.id,
			templateId,
			fromOrder: moveOrderFrom(template),
			toOrder: moveOrderTo(template)
		});
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

	// Pointer-only drag-and-drop (D-20, D-33). Drops commit through the same
	// Swap/Move callbacks as the keyboard forms; the engine stays the validator.
	let dragSource = $state<{ templateId: string; order: number } | null>(null);
	let dropTarget = $state<{ templateId: string; order: number } | null>(null);

	function handleDragStart(template: TemplateView, order: number, event: DragEvent): void {
		const slot = template.assignments.find((candidate) => candidate.order === order);
		if (!slot || slot.playerId === null) {
			event.preventDefault();
			return;
		}
		try {
			event.dataTransfer?.setData(
				'application/json',
				JSON.stringify({ templateId: template.id, order })
			);
			if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
		} catch {
			// A missing DataTransfer (e.g. synthetic events) still allows the
			// state-tracked drop path below to commit.
		}
		dragSource = { templateId: template.id, order };
	}

	function handleDragOver(template: TemplateView, order: number, event: DragEvent): void {
		event.preventDefault();
		if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
		dropTarget = { templateId: template.id, order };
	}

	function handleDragLeave(event: DragEvent): void {
		const row = event.currentTarget;
		if (
			event.relatedTarget instanceof Node &&
			row instanceof Node &&
			row.contains(event.relatedTarget)
		) {
			return;
		}
		dropTarget = null;
	}

	function handleDrop(template: TemplateView, order: number, event: DragEvent): void {
		event.preventDefault();
		const source = dragSource;
		dragSource = null;
		dropTarget = null;
		if (!source || source.templateId !== template.id || source.order === order) return;
		const fromSlot = template.assignments.find((candidate) => candidate.order === source.order);
		const toSlot = template.assignments.find((candidate) => candidate.order === order);
		if (!fromSlot || fromSlot.playerId === null || !toSlot) return;
		if (toSlot.playerId === null) {
			onAssignmentMove({
				scenarioId: scenario.id,
				templateId: template.id,
				fromOrder: source.order,
				toOrder: order
			});
		} else {
			onAssignmentSwap({
				scenarioId: scenario.id,
				templateId: template.id,
				orderA: source.order,
				orderB: order
			});
		}
	}

	function handleDragEnd(): void {
		dragSource = null;
		dropTarget = null;
	}

	function dropPreview(template: TemplateView): string | null {
		if (!dragSource || dragSource.templateId !== template.id) return null;
		const fromName = assignedLabel(template.id, dragSource.order);
		if (!dropTarget || dropTarget.templateId !== template.id) {
			return `Dragging ${fromName} — drop on a slot in ${template.label} to swap or move.`;
		}
		if (dropTarget.order === dragSource.order) return null;
		const toSlot = template.assignments.find((candidate) => candidate.order === dropTarget?.order);
		if (!toSlot) return null;
		if (toSlot.playerId === null) {
			return `Drop to move ${fromName} from ${slotSummary(template, dragSource.order)} to ${slotSummary(template, toSlot.order)}.`;
		}
		return `Drop to swap ${slotSummary(template, dragSource.order)} with ${slotSummary(template, toSlot.order)}.`;
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
		Choose one player per slot with the selectors, or swap two slots in the same template. Both
		paths work by keyboard alone. With a pointer you can also drag an assigned row onto another slot
		in the same template — onto an occupied slot to swap, onto an Unassigned slot to move.
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
							context only</span
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
						<caption class="visually-hidden">Assignments for {template.label}</caption>
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
									class:drag-source={dragSource?.templateId === template.id &&
										dragSource?.order === slot.order}
									class:drop-target={dropTarget?.templateId === template.id &&
										dropTarget?.order === slot.order}
									data-template={template.id}
									data-order={slot.order}
									draggable={slot.playerId === null ? 'false' : 'true'}
									ondragstart={(event) => handleDragStart(template, slot.order, event)}
									ondragover={(event) => handleDragOver(template, slot.order, event)}
									ondragleave={handleDragLeave}
									ondrop={(event) => handleDrop(template, slot.order, event)}
									ondragend={handleDragEnd}
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
										<label
											class="visually-hidden"
											for={`${scenario.id}-${template.id}-${slot.order}`}
										>
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
				{#if dropPreview(template)}
					<p class="form-preview drop-preview" aria-live="polite">{dropPreview(template)}</p>
				{/if}
				<form class="swap" onsubmit={(event) => handleSwap(template.id, event)}>
					<fieldset>
						<legend>Swap two slots in {template.label}</legend>
						<label>
							First slot
							<select
								name="swap-a"
								value={String(swapOrderA(template))}
								onchange={(event) => {
									swapA[template.id] = Number(event.currentTarget.value);
								}}
							>
								{#each template.assignments as slot (slot.order)}
									<option value={String(slot.order)}>
										{slot.order} · {slot.role} · {assignedLabel(template.id, slot.order)}
									</option>
								{/each}
							</select>
						</label>
						<label>
							Second slot
							<select
								name="swap-b"
								value={String(swapOrderB(template))}
								onchange={(event) => {
									swapB[template.id] = Number(event.currentTarget.value);
								}}
							>
								{#each template.assignments as slot (slot.order)}
									<option value={String(slot.order)}>
										{slot.order} · {slot.role} · {assignedLabel(template.id, slot.order)}
									</option>
								{/each}
							</select>
						</label>
						<button
							class="evidence-button"
							type="submit"
							disabled={swapOrderA(template) === swapOrderB(template)}
							aria-describedby={`swap-preview-${template.id}`}
						>
							Swap
						</button>
					</fieldset>
					<p class="form-preview" id={`swap-preview-${template.id}`}>
						Swap {slotSummary(template, swapOrderA(template))} with {slotSummary(
							template,
							swapOrderB(template)
						)}.
					</p>
				</form>
				<form class="swap" onsubmit={(event) => handleMove(template.id, event)}>
					<fieldset>
						<legend>Move one player in {template.label}</legend>
						<label>
							From slot
							<select
								name="move-from"
								value={String(moveOrderFrom(template))}
								onchange={(event) => {
									moveFrom[template.id] = Number(event.currentTarget.value);
								}}
							>
								{#each template.assignments as slot (slot.order)}
									<option value={String(slot.order)}>
										{slot.order} · {slot.role} · {assignedLabel(template.id, slot.order)}
									</option>
								{/each}
							</select>
						</label>
						<label>
							To slot
							<select
								name="move-to"
								value={String(moveOrderTo(template))}
								onchange={(event) => {
									moveTo[template.id] = Number(event.currentTarget.value);
								}}
							>
								{#each template.assignments as slot (slot.order)}
									<option value={String(slot.order)}>
										{slot.order} · {slot.role} · {assignedLabel(template.id, slot.order)}
									</option>
								{/each}
							</select>
						</label>
						<button
							class="evidence-button"
							type="submit"
							disabled={!movePreview(template).valid}
							aria-describedby={`move-preview-${template.id}`}
						>
							Move
						</button>
					</fieldset>
					<p class="form-preview" id={`move-preview-${template.id}`}>
						{movePreview(template).text}
					</p>
				</form>
			</div>
		{/each}
	</div>
</div>

<style>
	.panel {
		border: 1px solid var(--case-300);
		background: var(--case-100);
	}

	.allocation {
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

	.allocation-status {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-75);
		color: var(--ink-muted);
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
	}

	.allocation-status span:first-child {
		color: var(--grade-snug);
		font-weight: 600;
	}

	.allocation-status span:first-child.updating {
		color: var(--grade-loose);
	}

	.panel-intro {
		max-width: 58rem;
		margin: var(--spacing-100) 0 var(--spacing-200);
		color: var(--ink-muted);
		font-size: var(--text-sm);
		line-height: var(--text-sm--lh);
	}

	.issue-banner {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-50) var(--spacing-100);
		align-items: baseline;
		margin-bottom: var(--spacing-200);
		padding: var(--spacing-100) var(--spacing-100);
		border: 1px solid var(--grade-loose);
		border-radius: var(--radius-md);
		background: var(--case-200);
		color: var(--ink-muted);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
	}

	.issue-banner strong,
	.issue-banner code {
		color: var(--grade-loose);
	}

	.issue-banner code {
		font-family: var(--font-mono);
	}

	/* A template card holds a scroll container: the track must not take the table's no-wrap width. */
	.template-stack {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--spacing-200);
	}

	.template-card {
		border: 1px solid var(--case-300);
	}

	.template-heading {
		display: flex;
		align-items: start;
		justify-content: space-between;
		gap: var(--spacing-200);
		padding: var(--spacing-100) var(--spacing-100);
		background: var(--case-200);
	}

	.template-heading div {
		display: grid;
		gap: var(--spacing-50);
	}

	h3 {
		margin: 0;
		color: var(--turf);
		font-size: var(--text-sm);
		line-height: var(--text-sm--lh);
	}

	.template-heading span {
		color: var(--ink-muted);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
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
		white-space: nowrap;
	}

	.evidence-button:disabled {
		cursor: not-allowed;
		opacity: 0.55;
		text-decoration: none;
	}

	/* Wide tables scroll inside their own container, never the page. The container is positioned
	   so the visually hidden captions and labels inside it are clipped with the table instead of
	   escaping to the page at their column offset. */
	.table-scroll {
		position: relative;
		min-width: 0;
		overflow-x: auto;
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
		vertical-align: middle;
		white-space: nowrap;
	}

	thead th {
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
	.exposure {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
	}

	.exposure {
		color: var(--ink-muted);
	}

	select {
		min-width: 10.8rem;
		min-height: 2.25rem;
		padding: var(--spacing-75) var(--spacing-75);
		border: 1px solid var(--case-400);
		border-radius: var(--radius-md);
		background: var(--case-100);
		color: var(--ink);
		font: inherit;
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
	}

	tr.problem {
		background: color-mix(in srgb, var(--grade-loose) 8%, transparent);
	}

	tr[draggable='true'] {
		cursor: grab;
	}

	tr.drag-source {
		opacity: 0.55;
	}

	tr.drop-target {
		outline: 2px solid var(--focus);
		outline-offset: -3px;
	}

	.drop-preview {
		padding: var(--spacing-75) var(--spacing-100) 0;
		font-weight: 600;
	}

	.status {
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
		font-weight: 600;
	}

	.status.good {
		color: var(--grade-snug);
	}

	.status.warn {
		color: var(--grade-loose);
	}

	small {
		display: block;
		margin-top: var(--spacing-25);
		color: var(--ink-muted);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
		font-weight: 500;
		white-space: normal;
	}

	.swap fieldset {
		display: flex;
		flex-wrap: wrap;
		align-items: end;
		gap: var(--spacing-100);
		margin: var(--spacing-100) 0 0;
		border: 0;
		padding: 0;
	}

	.swap legend {
		margin-bottom: var(--spacing-75);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
		font-weight: 600;
	}

	.swap label {
		display: grid;
		gap: var(--spacing-50);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
	}

	.form-preview {
		margin: var(--spacing-75) 0 0;
		color: var(--ink-muted);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
	}

	@media (max-width: 600px) {
		.section-heading,
		.template-heading {
			align-items: stretch;
			flex-direction: column;
		}
	}
</style>
