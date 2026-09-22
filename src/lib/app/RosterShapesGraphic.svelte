<script lang="ts">
	import type { Bundle } from '$lib/contracts';
	import { SHAPE_RUBRIC_VERSION, shapeOf, type ShapeLabel } from '$lib/shapes/taxonomy';
	import ShapeGlyph from '$lib/ui/ShapeGlyph.svelte';
	import { headshotUrl } from './roster-data';
	import LiveRosterRender from './LiveRosterRender.svelte';

	let {
		bundle,
		selectedPlayerId,
		onSelect
	}: {
		bundle: Bundle;
		selectedPlayerId: string | null;
		onSelect: (playerId: string | null) => void;
	} = $props();

	// The landing field is a stable baseline view. Scenario editing and
	// assumption controls remain in the workspace, not in this overview.
	const template = $derived(
		bundle.assumptions.templates.reduce((current, option) =>
			option.games > current.games ? option : current
		)
	);
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
		CF: { left: '50%', top: '13%' },
		LF: { left: '18%', top: '29%' },
		RF: { left: '82%', top: '29%' },
		SS: { left: '36%', top: '51%' },
		'2B': { left: '64%', top: '51%' },
		'3B': { left: '25%', top: '68%' },
		'1B': { left: '75%', top: '68%' },
		C: { left: '50%', top: '88%' },
		DH: { left: '82%', top: '84%' }
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
	const baselineMemberIds = $derived(new Set(baseline.memberIds));
	function playerForName(name: string) {
		return bundle.dataset.players.find((player) => player.name === name);
	}

	function observedRate(name: string): string {
		const player = playerForName(name);
		return player ? (projectionsById.get(player.id)?.overall ?? 'Unavailable') : '—';
	}

	const lineupViews = $derived(
		bundle.assumptions.templates.map((lineupTemplate) => {
			const lineupAllocation = baseline.allocations.find(
				(candidate) => candidate.templateId === lineupTemplate.id
			);
			return {
				template: lineupTemplate,
				teamPa: lineupTemplate.slots.reduce(
					(sum, slot) =>
						sum + slot.paByPitcherHand.L + slot.paByPitcherHand.R + slot.paByPitcherHand.unknown,
					0
				),
				rows: lineupTemplate.slots.map((slot) => {
					const playerId = lineupAllocation?.assignments.find(
						(assignment) => assignment.order === slot.order
					)?.playerId;
					return {
						order: slot.order,
						role: slot.role,
						player: playerId ? (playersById.get(playerId)?.name ?? 'Unknown player') : 'Unassigned',
						exposure: slot.paByPitcherHand,
						totalPa: slot.paByPitcherHand.L + slot.paByPitcherHand.R + slot.paByPitcherHand.unknown
					};
				})
			};
		})
	);
	const depthRows = $derived(
		(lineupViews[0]?.rows ?? []).map((row) => {
			const starter = playersById.get(
				bundle.dataset.players.find((player) => player.name === row.player)?.id ?? ''
			);
			const remaining = bundle.dataset.players.filter(
				(player) =>
					baselineMemberIds.has(player.id) &&
					player.id !== starter?.id &&
					(row.role === 'DH' || player.eligiblePositions.includes(row.role))
			);
			const rPlatoon = remaining.find((player) => player.bats === 'R');
			const lPlatoon = remaining.find((player) => player.bats === 'L');
			const assigned = new Set([rPlatoon?.id, lPlatoon?.id]);
			const bench = remaining.filter((player) => !assigned.has(player.id)).slice(0, 2);
			return { ...row, starter, rPlatoon, lPlatoon, bench };
		})
	);
</script>

<div class="graphic-block">
	<div class="field-and-tables">
		<div class="diamond-stage" aria-label="Baseball field roster view">
			<div class="field-caption">
				<span>BASELINE FIELD</span><small>{template?.label ?? 'Full-game allocation'}</small>
			</div>
			<svg class="diamond-backdrop" viewBox="0 0 400 440" aria-hidden="true" focusable="false">
				<path d="M12 42 Q200 -30 388 42 L358 332 Q200 436 42 332 Z" class="outfield" />
				<path d="M24 43 Q200 -12 376 43" class="warning-track" />
				<path d="M200 404 L42 43 M200 404 L358 43" class="foul-line" />
				<path d="M200 404 L94 298 L200 192 L306 298 Z" class="base-path" />
				<path d="M200 404 L108 312 L200 220 L292 312 Z" class="infield" />
				<path d="M112 312 A118 118 0 0 0 288 312" class="infield-arc" />
				<circle cx="200" cy="278" r="31" class="dirt" />
				<ellipse cx="200" cy="278" rx="12" ry="7" class="mound" />
				<path d="M188 267 H212" class="rubber" />
				<path d="M188 405 L200 417 L212 405 L200 393 Z" class="home-plate" />
				<rect x="101" y="301" width="16" height="16" class="base" transform="rotate(45 109 309)" />
				<rect x="192" y="184" width="16" height="16" class="base" transform="rotate(45 200 192)" />
				<rect x="283" y="301" width="16" height="16" class="base" transform="rotate(45 291 309)" />
				<rect x="302" y="354" width="68" height="38" class="dh-box" />
				<text x="336" y="377" class="dh-label">DH / BAT</text>
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
					{#if node.playerId}<img
							class="node-headshot"
							src={headshotUrl(node.playerId)}
							alt=""
							loading="lazy"
						/>{/if}
					<span class="node-role">{node.role}</span>
					<ShapeGlyph shape={node.shape} size={22} />
					<span class="node-name">{node.name}</span>
					<span class="node-pa">{node.pa} PA</span>
				</button>
			{/each}
		</div>
		<section class="lineup-card" aria-labelledby="lineup-heading">
			<div class="table-kicker">Baseline lineups · handedness contexts</div>
			<h3 id="lineup-heading">One assigned lineup for each starter context</h3>
			<p class="source-note">
				Each player receives the full PA demand for the assigned slot in that context. L/R columns
				show explicit exposure; each template is represented separately, and no substitution is
				inferred from OPS alone. These are baseline allocations.
			</p>
			<div class="lineup-columns">
				{#each lineupViews as view (view.template.id)}
					<table>
						<caption>
							<strong>{view.template.label}</strong>
							<span>{view.template.games} games · {view.teamPa} team PA</span>
						</caption>
						<thead>
							<tr>
								<th scope="col">#</th>
								<th scope="col">Player</th>
								<th scope="col">Pos</th>
								<th scope="col">Total PA</th>
								<th scope="col">L PA</th>
								<th scope="col">R PA</th>
								<th scope="col">? PA</th>
							</tr>
						</thead>
						<tbody>
							{#each view.rows as row (row.order)}
								<tr>
									<th scope="row">{row.order}</th>
									<td>{row.player}</td>
									<td>{row.role}</td>
									<td>{row.totalPa}</td>
									<td>{row.exposure.L}</td>
									<td>{row.exposure.R}</td>
									<td>{row.exposure.unknown}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{/each}
			</div>
		</section>
	</div>

	<section class="shape-roster" aria-labelledby="shape-roster-heading">
		<div class="table-kicker">The concept</div>
		<h3 id="shape-roster-heading">The actual roster, represented as shapes</h3>
		<p class="shape-roster-intro">
			Shapes are the roster’s visual language: each player keeps a readable name, role, workload,
			and profile label. Geometry summarizes the profile; it never creates value or coverage.
		</p>
		<LiveRosterRender {bundle} activeScenarioId={baseline.id} />
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

	<section class="depth-chart" aria-labelledby="depth-chart-heading">
		<div class="table-kicker">Roster construction</div>
		<h3 id="depth-chart-heading">Depth chart · active scenario roster</h3>
		<p class="source-note">
			Derived from the active scenario’s current roster membership and eligibility. L/R columns show
			explicit PA exposure for the assigned starter; they do not invent platoon replacements.
		</p>
		<table>
			<thead
				><tr
					><th scope="col">Position</th><th scope="col">Starter</th><th scope="col">R exposure</th
					><th scope="col">L exposure</th><th scope="col">Bench / rep 1</th><th scope="col"
						>Bench / rep 2</th
					><th scope="col">Shape</th><th scope="col">Observed R/PA</th></tr
				></thead
			>
			<tbody
				>{#each depthRows as row (row.role)}<tr
						><th scope="row">{row.role}</th><td>{row.player}</td><td>{row.rPlatoon?.name ?? '—'}</td
						><td>{row.lPlatoon?.name ?? '—'}</td><td>{row.bench[0]?.name ?? '—'}</td><td
							>{row.bench[1]?.name ?? '—'}</td
						><td>{shapeOf(row.starter?.id ?? '').shape}</td><td>{observedRate(row.player)}</td></tr
					>{/each}</tbody
			>
		</table>
	</section>
</div>

<style>
	.graphic-block {
		display: grid;
		gap: 1rem;
	}
	.diamond-stage {
		position: relative;
		width: 100%;
		max-width: 40rem;
		aspect-ratio: 400 / 440;
		border: 1px solid var(--line);
		border-radius: 1rem;
		background: #264d3b;
		box-shadow:
			inset 0 0 0 1px rgb(255 254 249 / 14%),
			0 18px 36px rgb(38 77 59 / 20%);
		overflow: hidden;
	}
	.field-caption {
		position: absolute;
		z-index: 2;
		top: 0.8rem;
		left: 1rem;
		display: flex;
		align-items: baseline;
		gap: 0.55rem;
		color: rgb(255 254 249 / 88%);
		font-size: 0.62rem;
		font-weight: 800;
		letter-spacing: 0.16em;
	}
	.field-caption small {
		color: rgb(255 254 249 / 68%);
		font-size: 0.58rem;
		font-weight: 500;
		letter-spacing: 0.02em;
		text-transform: none;
	}
	.diamond-backdrop {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}
	.outfield {
		fill: #2f6245;
	}
	.warning-track {
		fill: none;
		stroke: rgb(226 190 142 / 60%);
		stroke-width: 3;
	}
	.foul-line {
		fill: none;
		stroke: rgb(255 254 249 / 72%);
		stroke-width: 2.5;
	}
	.base-path {
		fill: none;
		stroke: rgb(228 192 157 / 30%);
		stroke-width: 1;
	}
	.infield {
		fill: #a8643c;
		stroke: #e4c09d;
		stroke-width: 2;
	}
	.infield-arc {
		fill: none;
		stroke: rgb(228 192 157 / 62%);
		stroke-width: 2;
	}
	.dirt {
		fill: #a8643c;
		opacity: 0.9;
	}
	.mound {
		fill: #e4c09d;
	}
	.rubber {
		stroke: #fffef9;
		stroke-width: 2;
	}
	.home-plate {
		fill: #fffef9;
		stroke: #d8c4a9;
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
		grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
		gap: 1rem;
		align-items: start;
	}
	.lineup-card {
		border: 1px solid var(--line);
		border-radius: 1rem;
		padding: 1rem;
		background: var(--panel);
	}
	.lineup-card h3,
	.shape-roster h3 {
		margin: 0.1rem 0 0.35rem;
		font-family: Georgia, serif;
		font-size: 1.2rem;
		font-weight: 500;
	}
	.lineup-card p {
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
	.lineup-card table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.74rem;
	}
	.lineup-columns {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.85rem;
		align-items: start;
	}
	.lineup-columns table {
		min-width: 0;
		font-variant-numeric: tabular-nums;
	}
	.lineup-columns caption {
		padding: 0.55rem 0.25rem;
		border-bottom: 1px solid var(--line-strong);
		text-align: left;
	}
	.lineup-columns caption strong,
	.lineup-columns caption span {
		display: block;
	}
	.lineup-columns caption strong {
		font-size: 0.8rem;
	}
	.lineup-columns caption span {
		margin-top: 0.15rem;
		color: var(--muted);
		font-size: 0.68rem;
		font-weight: 500;
	}
	.lineup-card th,
	.lineup-card td {
		border-top: 1px solid var(--line);
		padding: 0.32rem 0.25rem;
		text-align: left;
	}
	.lineup-card th {
		color: var(--muted);
		font-weight: 700;
	}
	.shape-roster {
		border: 2px solid var(--ink);
		border-radius: 1.25rem;
		padding: 1.25rem;
		background: var(--panel);
		box-shadow: 8px 8px 0 var(--rust);
	}
	.shape-roster-intro {
		max-width: 48rem;
		margin: 0.5rem 0 0;
		color: var(--muted);
		font-size: 0.86rem;
		line-height: 1.5;
	}
	.position-node {
		position: absolute;
		display: grid;
		justify-items: center;
		gap: 0.1rem;
		min-width: 4.8rem;
		padding: 0.3rem 0.4rem;
		border: 1px solid rgb(255 254 249 / 75%);
		border-radius: 0.65rem;
		background: rgb(255 254 249 / 95%);
		color: var(--ink);
		cursor: pointer;
		font: inherit;
		transform: translate(-50%, -50%);
		box-shadow: 0 5px 12px rgb(20 48 35 / 22%);
	}
	.position-node.selected {
		border-color: var(--rust-dark);
		box-shadow: 0 0 0 3px rgb(168 79 50 / 30%);
	}
	.node-headshot {
		width: 1.6rem;
		height: 1.6rem;
		border-radius: 50%;
		object-fit: cover;
		background: var(--paper-deep);
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
	.depth-chart {
		border: 1px solid var(--line);
		border-radius: 1rem;
		padding: 1rem;
		background: var(--panel);
		overflow-x: auto;
	}
	.depth-chart h3 {
		margin: 0.15rem 0 0.25rem;
		font-family: Georgia, serif;
		font-size: 1.35rem;
		font-weight: 500;
	}
	.source-note {
		margin: 0 0 0.7rem;
		color: var(--muted);
		font-size: 0.72rem;
	}
	.depth-chart table {
		width: 100%;
		min-width: 48rem;
		border-collapse: collapse;
		font-size: 0.78rem;
	}
	.depth-chart th,
	.depth-chart td {
		border-bottom: 1px solid var(--line);
		padding: 0.45rem 0.5rem;
		text-align: left;
	}
	@media (max-width: 920px) {
		.field-and-tables {
			grid-template-columns: 1fr;
		}
	}
	@media (max-width: 700px) {
		.lineup-columns {
			grid-template-columns: 1fr;
		}
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
