<script lang="ts">
	import type { Bundle } from '$lib/contracts';
	import { SHAPE_RUBRIC_VERSION, shapeOf, type ShapeLabel } from '$lib/shapes/taxonomy';
	import ShapeGlyph from '$lib/ui/ShapeGlyph.svelte';
	import { DEPTH_CHART_SNAPSHOT, ACTUAL_LINEUP_SNAPSHOT } from './roster-data';

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
		C: { left: '41%', top: '84%' },
		DH: { left: '61%', top: '73%' }
	};
	const FIELD_ROLE_ORDER = ['C', 'DH', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];

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
		[...(template?.slots ?? [])]
			.sort((a, b) => FIELD_ROLE_ORDER.indexOf(a.role) - FIELD_ROLE_ORDER.indexOf(b.role))
			.map((slot) => {
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
	const rosterPlayers = $derived(
		baseline
			? baseline.memberIds
					.map((playerId) => playersById.get(playerId))
					.filter((player): player is NonNullable<typeof player> => Boolean(player))
			: []
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

	<div class="field-and-tables">
		<div class="diamond-stage" aria-label="Fenway-style field roster view">
			<svg class="diamond-backdrop" viewBox="0 0 400 380" aria-hidden="true" focusable="false">
				<path d="M16 24 Q200 -12 384 24 L348 286 Q200 382 52 286 Z" class="outfield" />
				<path d="M40 34 L200 350 L360 34" class="foul-line" />
				<path d="M200 350 L120 270 L200 190 L280 270 Z" class="infield" />
				<circle cx="200" cy="270" r="28" class="dirt" />
				<circle cx="200" cy="270" r="8" class="mound" />
				<rect x="192" y="342" width="16" height="16" class="base home" />
				<rect x="112" y="262" width="16" height="16" class="base" transform="rotate(45 120 270)" />
				<rect x="192" y="182" width="16" height="16" class="base" transform="rotate(45 200 190)" />
				<rect x="272" y="262" width="16" height="16" class="base" transform="rotate(45 280 270)" />
				<rect x="302" y="314" width="52" height="34" class="dh-box" />
				<text x="328" y="334" class="dh-label">DH</text>
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
		<div class="source-tables">
			<section class="source-table" aria-labelledby="actual-lineup-heading">
				<div class="table-kicker">Actual lineup</div>
				<h3 id="actual-lineup-heading">September 20, 2026</h3>
				<p>{ACTUAL_LINEUP_SNAPSHOT.source}</p>
				<table>
					<thead
						><tr><th scope="col">#</th><th scope="col">Batter</th><th scope="col">Pos</th></tr
						></thead
					>
					<tbody
						>{#each ACTUAL_LINEUP_SNAPSHOT.entries as entry (entry.order)}<tr
								><th scope="row">{entry.order}</th><td>{entry.player}</td><td>{entry.position}</td
								></tr
							>{/each}</tbody
					>
				</table>
			</section>
			<section class="source-table" aria-labelledby="depth-chart-heading">
				<div class="table-kicker">Actual depth chart</div>
				<h3 id="depth-chart-heading">Snapshot · September 21</h3>
				<p>{DEPTH_CHART_SNAPSHOT.source}</p>
				<table>
					<thead><tr><th scope="col">Pos</th><th scope="col">Depth</th></tr></thead>
					<tbody
						>{#each DEPTH_CHART_SNAPSHOT.entries as entry (entry.position)}<tr
								><th scope="row">{entry.position}</th><td>{entry.players.join(' · ')}</td></tr
							>{/each}</tbody
					>
				</table>
			</section>
		</div>
	</div>

	<section class="shape-roster" aria-labelledby="shape-roster-heading">
		<div class="table-kicker">The actual roster, in shapes</div>
		<h3 id="shape-roster-heading">Every player is a profile, not a placeholder</h3>
		<div class="roster-strip">
			{#each rosterPlayers as player (player.id)}
				<button
					type="button"
					class="roster-player"
					class:selected={selectedPlayerId === player.id}
					onclick={() => onSelect(selectedPlayerId === player.id ? null : player.id)}
				>
					<ShapeGlyph shape={shapeOf(player.id).shape} size={26} />
					<span>{player.name}</span>
					<small>{shapeOf(player.id).shape}</small>
				</button>
			{/each}
		</div>
	</section>

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
		max-width: 40rem;
		aspect-ratio: 400 / 380;
		border: 1px solid var(--line);
		border-radius: 1rem;
		background: #264d3b;
		box-shadow:
			inset 0 0 0 1px rgb(255 254 249 / 14%),
			0 18px 36px rgb(38 77 59 / 20%);
		overflow: hidden;
	}
	.diamond-backdrop {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}
	.outfield {
		fill: #356849;
	}
	.foul-line {
		fill: none;
		stroke: rgb(255 254 249 / 72%);
		stroke-width: 2;
	}
	.infield {
		fill: #a8643c;
		stroke: #e4c09d;
		stroke-width: 2;
	}
	.dirt {
		fill: #a8643c;
		opacity: 0.9;
	}
	.mound {
		fill: #e4c09d;
	}
	.base {
		fill: #fffef9;
		stroke: #d8c4a9;
	}
	.dh-box {
		fill: none;
		stroke: #fffef9;
		stroke-dasharray: 4 3;
	}
	.dh-label {
		fill: #fffef9;
		font: 700 12px sans-serif;
		letter-spacing: 2px;
		text-anchor: middle;
	}
	.field-and-tables {
		display: grid;
		grid-template-columns: minmax(24rem, 1.25fr) minmax(30rem, 1fr);
		gap: 1rem;
		align-items: start;
	}
	.source-tables {
		display: grid;
		gap: 1rem;
	}
	.source-table {
		border: 1px solid var(--line);
		border-radius: 1rem;
		padding: 1rem;
		background: var(--panel);
	}
	.source-table h3,
	.shape-roster h3 {
		margin: 0.1rem 0 0.35rem;
		font-family: Georgia, serif;
		font-size: 1.2rem;
		font-weight: 500;
	}
	.source-table p {
		margin: 0 0 0.65rem;
		color: var(--muted);
		font-size: 0.7rem;
	}
	.table-kicker {
		color: var(--rust);
		font-size: 0.66rem;
		font-weight: 800;
		letter-spacing: 0.13em;
		text-transform: uppercase;
	}
	.source-table table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.74rem;
	}
	.source-table th,
	.source-table td {
		border-top: 1px solid var(--line);
		padding: 0.32rem 0.25rem;
		text-align: left;
	}
	.source-table th {
		color: var(--muted);
		font-weight: 700;
	}
	.shape-roster {
		border-top: 1px solid var(--line);
		padding-top: 1rem;
	}
	.roster-strip {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 0.7rem;
	}
	.roster-player {
		display: grid;
		grid-template-columns: auto 1fr;
		align-items: center;
		column-gap: 0.45rem;
		border: 1px solid var(--line);
		border-radius: 0.75rem;
		padding: 0.45rem 0.6rem;
		background: var(--panel);
		color: var(--ink);
		cursor: pointer;
		font: inherit;
		text-align: left;
	}
	.roster-player span {
		font-size: 0.74rem;
		font-weight: 700;
	}
	.roster-player small {
		grid-column: 2;
		color: var(--muted);
		font-size: 0.62rem;
	}
	.roster-player.selected {
		border-color: var(--rust-dark);
		box-shadow: 0 0 0 3px rgb(168 79 50 / 16%);
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
		.field-and-tables {
			grid-template-columns: 1fr;
		}
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
