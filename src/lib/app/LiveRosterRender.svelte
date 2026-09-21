<script lang="ts">
	import type { Bundle } from '$lib/contracts';
	import { shapeOf } from '$lib/shapes/taxonomy';
	import ShapeGlyph from '$lib/ui/ShapeGlyph.svelte';
	import { headshotUrl } from './roster-data';

	let {
		bundle,
		activeScenarioId,
		onSelect = () => {}
	}: { bundle: Bundle; activeScenarioId: string; onSelect?: (playerId: string) => void } = $props();

	const scenario = $derived(
		[bundle.comparison.baseline, ...bundle.comparison.candidates].find(
			(candidate) => candidate.id === activeScenarioId
		) ?? bundle.comparison.baseline
	);
	const template = $derived(
		bundle.assumptions.templates.reduce((current, candidate) =>
			candidate.games > current.games ? candidate : current
		)
	);
	const players = $derived(new Map(bundle.dataset.players.map((player) => [player.id, player])));
	const assignments = $derived(
		new Map(
			(
				scenario.allocations.find((allocation) => allocation.templateId === template.id)
					?.assignments ?? []
			).map((assignment) => [assignment.order, assignment.playerId])
		)
	);
	const tokens = $derived(
		template.slots.map((slot, index) => {
			const playerId = assignments.get(slot.order);
			const player = playerId ? players.get(playerId) : undefined;
			return {
				id: playerId ?? `empty-${slot.order}`,
				playerId,
				name: player?.name ?? 'Unassigned',
				role: slot.role,
				shape: shapeOf(playerId ?? '').shape,
				pa: slot.paByPitcherHand.L + slot.paByPitcherHand.R + slot.paByPitcherHand.unknown,
				x: 70 + (index % 5) * 112,
				y: 82 + Math.floor(index / 5) * 92
			};
		})
	);
</script>

<section class="live-render" aria-labelledby="live-render-title">
	<div class="live-heading">
		<div>
			<p class="eyebrow">Live roster rendering</p>
			<h3 id="live-render-title">{scenario.label}</h3>
		</div>
		<span>{template.games} games · {template.label}</span>
	</div>
	<svg
		viewBox="0 0 620 280"
		role="group"
		aria-label="Live roster allocation for {scenario.label}"
		focusable="false"
	>
		<rect x="8" y="8" width="604" height="264" rx="18" class="render-surface" />
		<path d="M24 182H596" class="render-divider" />
		<text x="26" y="30" class="render-label">ACTIVE SCENARIO ALLOCATION</text>
		<text x="26" y="204" class="render-label">UNASSIGNED SPACE / DEMAND REMAINS VISIBLE</text>
		{#each tokens as token (token.id)}
			<g
				class:unassigned={!token.playerId}
				class="live-token"
				transform="translate({token.x} {token.y})"
			>
				{#if token.playerId}
					<g
						class="token-hit"
						role="button"
						tabindex="0"
						aria-label="Select {token.name}, {token.role}, {token.pa} plate appearances"
						onclick={() => onSelect(token.playerId!)}
						onkeydown={(event) => {
							if (event.key === 'Enter' || event.key === ' ') onSelect(token.playerId!);
						}}
					>
						<title>{token.name} · {token.role} · {token.pa} PA</title>
						<ShapeGlyph shape={token.shape} size={48} />
						<image
							aria-hidden="true"
							href={headshotUrl(token.playerId)}
							x="-14"
							y="-14"
							width="28"
							height="28"
							clip-path="circle(14px at 14px 14px)"
						/>
						<text x="0" y="34" class="token-name">{token.name}</text>
						<text x="0" y="47" class="token-meta">{token.role} · {token.pa} PA</text>
					</g>
				{:else}
					<ShapeGlyph shape="Unclassified" size={42} />
					<text x="0" y="33" class="token-name">{token.role}</text>
					<text x="0" y="46" class="token-meta">Unassigned · {token.pa} PA</text>
				{/if}
			</g>
		{/each}
	</svg>
</section>

<style>
	.live-render {
		display: grid;
		gap: 0.8rem;
		border: 1px solid var(--line);
		border-radius: 1rem;
		padding: 1rem;
		background: var(--panel);
	}
	.live-heading {
		display: flex;
		align-items: end;
		justify-content: space-between;
		gap: 1rem;
	}
	.live-heading h3 {
		margin: 0.1rem 0 0;
		font-family: Georgia, serif;
		font-size: 1.25rem;
		font-weight: 500;
	}
	.live-heading > span {
		color: var(--muted);
		font-size: 0.72rem;
	}
	.eyebrow {
		margin: 0;
		color: var(--rust);
		font-size: 0.68rem;
		font-weight: 800;
		letter-spacing: 0.13em;
		text-transform: uppercase;
	}
	.live-render svg {
		width: 100%;
		height: auto;
		overflow: visible;
	}
	.render-surface {
		fill: var(--paper);
		stroke: var(--line-strong);
	}
	.render-divider {
		stroke: var(--line);
		stroke-dasharray: 5 4;
	}
	.render-label {
		fill: var(--muted);
		font:
			700 8px system-ui,
			sans-serif;
		letter-spacing: 1px;
	}
	.live-token {
		color: var(--rust);
		text-anchor: middle;
	}
	.live-token.unassigned {
		color: var(--muted);
		opacity: 0.62;
	}
	.token-hit {
		position: relative;
		display: grid;
		justify-items: center;
		border: 0;
		padding: 0;
		background: transparent;
		color: inherit;
		cursor: pointer;
		font: inherit;
	}
	.token-name {
		fill: var(--ink);
		font:
			700 9px system-ui,
			sans-serif;
	}
	.token-meta {
		fill: var(--muted);
		font:
			8px system-ui,
			sans-serif;
	}
	@media (max-width: 600px) {
		.live-heading {
			align-items: flex-start;
			flex-direction: column;
		}
	}
</style>
