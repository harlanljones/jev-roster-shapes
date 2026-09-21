<script lang="ts">
	import type { Bundle } from '$lib/contracts';
	import { SHAPE_RUBRIC_VERSION, shapeOf, type ShapeLabel } from '$lib/shapes/taxonomy';
	import ShapeGlyph from '$lib/ui/ShapeGlyph.svelte';

	let {
		bundle,
		selectedPlayerId,
		onSelect
	}: {
		bundle: Bundle;
		selectedPlayerId: string | null;
		onSelect: (playerId: string | null) => void;
	} = $props();

	const templates = $derived(bundle.assumptions.templates);
	// Default to the template with the most games; read once at startup.
	function defaultTemplateIndex(): number {
		const options = bundle.assumptions.templates;
		const mostGames = Math.max(...options.map((option) => option.games));
		return Math.max(
			0,
			options.findIndex((option) => option.games === mostGames)
		);
	}
	let templateIndex = $state(defaultTemplateIndex());
	const template = $derived(templates[templateIndex] ?? templates[0]);
	const baseline = $derived(bundle.comparison.baseline);
	const allocation = $derived(
		baseline.allocations.find((candidate) => candidate.templateId === template?.id)
	);
	const playersById = $derived(
		new Map(bundle.dataset.players.map((player) => [player.id, player]))
	);
	const projectionsById = $derived(
		new Map(
			bundle.dataset.projections
				.filter(
					(projection) => projection.metricDefinitionId === bundle.assumptions.metricDefinitionId
				)
				.map((projection) => [projection.playerId, projection])
		)
	);

	const ROLE_POSITION: Record<string, { left: string; top: string }> = {
		CF: { left: '50%', top: '6%' },
		LF: { left: '13%', top: '30%' },
		RF: { left: '87%', top: '30%' },
		SS: { left: '36%', top: '45%' },
		'2B': { left: '64%', top: '45%' },
		'3B': { left: '22%', top: '63%' },
		'1B': { left: '78%', top: '63%' },
		C: { left: '50%', top: '87%' },
		DH: { left: '50%', top: '30%' }
	};

	interface GraphicNode {
		order: number;
		role: string;
		playerId: string | null;
		name: string;
		pa: number;
		shape: ShapeLabel;
		left: string;
		top: string;
	}

	const nodes = $derived<GraphicNode[]>(
		(template?.slots ?? []).map((slot) => {
			const assignment = allocation?.assignments.find(
				(candidate) => candidate.order === slot.order
			);
			const playerId = assignment?.playerId ?? null;
			const player = playerId ? playersById.get(playerId) : undefined;
			const pa = slot.paByPitcherHand.L + slot.paByPitcherHand.R + slot.paByPitcherHand.unknown;
			const shape = shapeOf(playerId ?? '').shape;
			return {
				order: slot.order,
				role: slot.role,
				playerId,
				name: player?.name ?? 'Unassigned',
				pa,
				shape,
				left: ROLE_POSITION[slot.role]?.left ?? '50%',
				top: ROLE_POSITION[slot.role]?.top ?? '50%'
			};
		})
	);

	const selected = $derived(
		selectedPlayerId
			? {
					player: playersById.get(selectedPlayerId),
					projection: projectionsById.get(selectedPlayerId),
					shape: shapeOf(selectedPlayerId),
					node: nodes.find((node) => node.playerId === selectedPlayerId)
				}
			: null
	);

	function selectTemplate(index: number): void {
		templateIndex = index;
	}
</script>

<div class="graphic-block">
	<div class="template-switch" role="group" aria-label="Graphic lineup template">
		{#each templates as option, index (option.id)}
			<button
				type="button"
				class="template-button"
				aria-pressed={index === templateIndex}
				onclick={() => selectTemplate(index)}
			>
				{option.label} · {option.games} games
			</button>
		{/each}
	</div>

	<div class="diamond-stage">
		<svg class="diamond-backdrop" viewBox="0 0 400 380" aria-hidden="true" focusable="false">
			<ellipse cx="200" cy="190" rx="185" ry="175" class="grass" />
			<polygon points="200,140 260,200 200,260 140,200" class="infield" />
			<rect x="192" y="192" width="16" height="16" class="base" />
			<circle cx="200" cy="120" r="26" class="dh-box" />
		</svg>
		{#each nodes as node (node.order)}
			<button
				type="button"
				class="position-node"
				class:selected={node.playerId !== null && node.playerId === selectedPlayerId}
				style="left: {node.left}; top: {node.top};"
				aria-label="{node.role}: {node.name}, {node.shape}, {node.pa} plate appearances"
				aria-pressed={node.playerId !== null && node.playerId === selectedPlayerId}
				onclick={() => onSelect(node.playerId === selectedPlayerId ? null : node.playerId)}
			>
				<span class="node-role">{node.role}</span>
				<ShapeGlyph shape={node.shape} size={22} />
				<span class="node-name">{node.name}</span>
				<span class="node-pa">{node.pa} PA</span>
			</button>
		{/each}
	</div>

	{#if selected?.player}
		<aside class="player-detail" aria-label="Selected player detail">
			<div>
				<p class="eyebrow">{selected.shape.shape} profile · rubric {SHAPE_RUBRIC_VERSION}</p>
				<h3>{selected.player.name}</h3>
				<p class="detail-rationale">{selected.shape.rationale}</p>
				<dl class="detail-stats">
					<div>
						<dt>Bats</dt>
						<dd>{selected.player.bats}</dd>
					</div>
					<div>
						<dt>Eligible</dt>
						<dd>
							{selected.player.eligiblePositions.length > 0
								? selected.player.eligiblePositions.join(', ')
								: 'DH only'}
						</dd>
					</div>
					<div>
						<dt>Observed R/PA</dt>
						<dd>{selected.projection?.overall ?? 'Unavailable — no 2026 PA'}</dd>
					</div>
					<div>
						<dt>Lineup PA</dt>
						<dd>{selected.node?.pa ?? '—'} PA</dd>
					</div>
				</dl>
				<p class="detail-limitation">
					Assumption-layer label: the shape summarizes the profile; it never changes workload,
					coverage, or projected value. Rates are observed 2026 public values, not team-approved
					projections.
				</p>
			</div>
			<button class="secondary-button" type="button" onclick={() => onSelect(null)}>
				Clear selection
			</button>
		</aside>
	{/if}

	<table class="graphic-table">
		<caption>
			Roster graphic data — {baseline.label}, {template?.label ?? 'no template'}
		</caption>
		<thead>
			<tr>
				<th scope="col">Position</th>
				<th scope="col">Player</th>
				<th scope="col">Shape</th>
				<th scope="col">Bats</th>
				<th scope="col">Observed R/PA</th>
				<th scope="col">Lineup PA</th>
			</tr>
		</thead>
		<tbody>
			{#each nodes as node (node.order)}
				<tr>
					<th scope="row">{node.role}</th>
					<td>{node.name}</td>
					<td>{node.shape}</td>
					<td>{node.playerId ? (playersById.get(node.playerId)?.bats ?? '—') : '—'}</td>
					<td
						>{node.playerId
							? (projectionsById.get(node.playerId)?.overall ?? 'Unavailable')
							: '—'}</td
					>
					<td>{node.pa}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.graphic-block {
		display: grid;
		gap: 1rem;
	}
	.template-switch {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	.template-button {
		border: 1px solid var(--line);
		border-radius: 999px;
		padding: 0.5rem 0.85rem;
		background: transparent;
		color: var(--ink);
		cursor: pointer;
		font: inherit;
		font-size: 0.78rem;
		font-weight: 700;
	}
	.template-button[aria-pressed='true'] {
		border-color: var(--rust-dark);
		color: #fffaf2;
		background: var(--rust);
	}
	.diamond-stage {
		position: relative;
		width: 100%;
		max-width: 44rem;
		aspect-ratio: 400 / 380;
		border: 1px solid var(--line);
		border-radius: 1rem;
		background: var(--panel);
		overflow: hidden;
	}
	.diamond-backdrop {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}
	.grass {
		fill: rgb(89 111 88 / 12%);
	}
	.infield {
		fill: rgb(168 79 50 / 12%);
		stroke: var(--line-strong);
	}
	.base {
		fill: rgb(168 79 50 / 35%);
	}
	.dh-box {
		fill: none;
		stroke: var(--line-strong);
		stroke-dasharray: 4 3;
	}
	.position-node {
		position: absolute;
		display: grid;
		justify-items: center;
		gap: 0.1rem;
		min-width: 4.5rem;
		padding: 0.4rem 0.5rem;
		border: 1px solid var(--line);
		border-radius: 0.75rem;
		background: rgb(255 254 249 / 92%);
		color: var(--ink);
		cursor: pointer;
		font: inherit;
		transform: translate(-50%, -50%);
	}
	.position-node.selected {
		border-color: var(--rust-dark);
		box-shadow: 0 0 0 3px rgb(168 79 50 / 30%);
	}
	.node-role {
		font-size: 0.65rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		color: var(--rust-dark);
	}
	.node-name {
		font-size: 0.72rem;
		font-weight: 700;
		line-height: 1.2;
		text-align: center;
	}
	.node-pa {
		font-size: 0.68rem;
		color: var(--muted);
	}
	.player-detail {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		border: 1px solid var(--line);
		border-radius: 1rem;
		padding: 1.25rem;
		background: var(--panel);
	}
	.player-detail h3 {
		margin: 0 0 0.4rem;
		font-family: Georgia, serif;
		font-size: 1.5rem;
		font-weight: 500;
	}
	.eyebrow {
		margin: 0 0 0.4rem;
		color: var(--rust);
		font-size: 0.7rem;
		font-weight: 750;
		letter-spacing: 0.13em;
		text-transform: uppercase;
	}
	.detail-rationale {
		margin: 0 0 0.75rem;
		color: var(--muted);
		font-size: 0.86rem;
	}
	.detail-stats {
		display: flex;
		flex-wrap: wrap;
		gap: 1.25rem;
		margin: 0 0 0.75rem;
	}
	.detail-stats div {
		display: grid;
		gap: 0.15rem;
	}
	.detail-stats dt {
		color: var(--muted);
		font-size: 0.68rem;
		text-transform: uppercase;
	}
	.detail-stats dd {
		margin: 0;
		font-weight: 700;
	}
	.detail-limitation {
		margin: 0;
		color: var(--muted);
		font-size: 0.78rem;
	}
	.secondary-button {
		border: 1px solid var(--line);
		border-radius: 999px;
		padding: 0.6rem 0.9rem;
		background: transparent;
		color: var(--ink);
		cursor: pointer;
		font: inherit;
		font-size: 0.82rem;
		font-weight: 700;
		white-space: nowrap;
	}
	.graphic-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.82rem;
	}
	.graphic-table caption {
		margin-bottom: 0.5rem;
		color: var(--muted);
		text-align: left;
	}
	.graphic-table th,
	.graphic-table td {
		border-bottom: 1px solid var(--line);
		padding: 0.45rem 0.5rem;
		text-align: left;
	}
	@media (max-width: 520px) {
		.position-node {
			min-width: 3.6rem;
			padding: 0.3rem;
		}
		.node-name {
			font-size: 0.62rem;
		}
		.player-detail {
			flex-direction: column;
		}
	}
</style>
