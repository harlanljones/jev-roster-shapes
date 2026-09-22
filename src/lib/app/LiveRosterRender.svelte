<script lang="ts">
	import type { Bundle } from '$lib/contracts';
	import { shapeOf } from '$lib/shapes/taxonomy';
	import ShapeGlyph from '$lib/ui/ShapeGlyph.svelte';

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
	const players = $derived(new Map(bundle.dataset.players.map((player) => [player.id, player])));
	const slots = $derived(
		bundle.assumptions.templates.flatMap((template) => {
			const allocation = scenario.allocations.find((item) => item.templateId === template.id);
			return template.slots.map((slot) => {
				const assignment = allocation?.assignments.find((item) => item.order === slot.order);
				const player = assignment?.playerId ? players.get(assignment.playerId) : undefined;
				return {
					playerId: player?.id,
					name: player?.name,
					role: slot.role,
					context: template.label,
					pa: slot.paByPitcherHand.L + slot.paByPitcherHand.R + slot.paByPitcherHand.unknown
				};
			});
		})
	);
	// A malformed or incomplete allocation can place one player in several slots.
	// Keep their shape identity to one tile and summarize the assigned roles/workload.
	type RosterEntry = {
		id: string;
		name: string;
		roles: string[];
		pa: number;
		shape: ReturnType<typeof shapeOf>['shape'];
		contexts: string[];
	};
	const roster = $derived.by(() => {
		const byPlayer = slots.reduce<Record<string, RosterEntry>>((entries, slot) => {
			if (!slot.playerId || !slot.name) return entries;
			const entry = entries[slot.playerId] ?? {
				id: slot.playerId,
				name: slot.name,
				roles: [],
				pa: 0,
				shape: shapeOf(slot.playerId).shape,
				contexts: []
			};
			return {
				...entries,
				[slot.playerId]: {
					...entry,
					roles: entry.roles.includes(slot.role) ? entry.roles : [...entry.roles, slot.role],
					pa: entry.pa + slot.pa,
					contexts: entry.contexts.includes(slot.context)
						? entry.contexts
						: [...entry.contexts, slot.context]
				}
			};
		}, {});
		return scenario.memberIds.flatMap((id) => {
			const assigned = byPlayer[id];
			const player = players.get(id);
			if (!player) return [];
			return [
				assigned ?? {
					id,
					name: player.name,
					roles: [],
					pa: 0,
					shape: shapeOf(id).shape,
					contexts: []
				}
			];
		});
	});
	const unassigned = $derived(slots.filter((slot) => !slot.playerId));
	const horizonGames = $derived(
		bundle.assumptions.templates.reduce((total, item) => total + item.games, 0)
	);
</script>

<section class="live-render" aria-labelledby="live-render-title">
	<div class="live-heading">
		<div>
			<p class="eyebrow">Live roster rendering</p>
			<h3 id="live-render-title">{scenario.label}</h3>
		</div>
		<span>{horizonGames} games · {bundle.assumptions.templates.length} lineup contexts</span>
	</div>
	<p class="board-note" id="shape-board-note">
		Each player appears once. Shape is the profile label; open space is for visual separation and
		does not measure coverage. Review position shortfalls in the coverage view.
	</p>
	<div
		class="roster-board"
		role="group"
		aria-label="Roster shapes for {scenario.label}"
		aria-describedby="shape-board-note"
	>
		<p class="board-label">ROSTER SHAPES · {roster.length} SCENARIO MEMBERS</p>
		{#if roster.length}
			<div class="shape-roster">
				{#each roster as player (player.id)}
					<button
						class="player-tile"
						type="button"
						aria-label="Select {player.name}, {player.shape}, {player.roles.length
							? player.roles.join(' and ')
							: 'reserve, unassigned in every context'}, {player.pa} plate appearances"
						onclick={() => onSelect(player.id)}
					>
						<ShapeGlyph shape={player.shape} size={52} />
						<span class="player-name">{player.name}</span>
						<span class="player-role"
							>{player.roles.length ? player.roles.join(' / ') : 'Reserve · unused'}</span
						>
						<span class="player-meta">{player.pa} PA across contexts</span>
						{#if player.roles.length > 1}<span class="player-meta"
								>{player.contexts.join(' · ')}</span
							>{/if}
						<span class="profile-label">{player.shape}</span>
					</button>
				{/each}
			</div>
		{:else}
			<p class="empty-roster">No assigned players in this template.</p>
		{/if}
		{#if unassigned.length}
			<div class="open-slots" aria-label="Unassigned lineup slots">
				<p class="open-slots-label">Unassigned roles · {unassigned.length}</p>
				<ul>
					{#each unassigned as slot, index (`${slot.role}-${index}`)}
						<li>
							<strong>{slot.role} · {slot.context}</strong><span
								>{slot.pa} PA demand unassigned</span
							>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</div>
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
	.board-note {
		max-width: 75ch;
		margin: 0;
		color: var(--muted);
		font-size: 0.9rem;
		line-height: 1.45;
	}
	.roster-board {
		min-height: 24rem;
		padding: clamp(1rem, 3vw, 2rem);
		border: 2px solid var(--line-strong);
		border-radius: 1.5rem;
		background: var(--paper);
	}
	.board-label,
	.open-slots-label {
		margin: 0;
		color: var(--muted);
		font-size: 0.72rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}
	.shape-roster {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 9rem), 1fr));
		gap: clamp(1.25rem, 4vw, 3rem);
		align-items: center;
		justify-items: center;
		padding: clamp(2rem, 6vw, 4rem) clamp(0.5rem, 3vw, 2rem);
	}
	.player-tile {
		display: grid;
		min-width: 9rem;
		min-height: 10.5rem;
		align-content: center;
		justify-items: center;
		gap: 0.28rem;
		border: 1px solid transparent;
		border-radius: 1rem;
		padding: 0.85rem;
		background: transparent;
		color: var(--rust);
		text-align: center;
		cursor: pointer;
		font: inherit;
	}
	.player-tile:hover {
		border-color: var(--line);
		background: var(--panel);
	}
	.player-tile:focus-visible {
		outline: 3px solid var(--rust);
		outline-offset: 3px;
	}
	.player-name {
		color: var(--ink);
		font-size: 0.95rem;
		font-weight: 750;
	}
	.player-role,
	.player-meta {
		color: var(--muted);
		font-size: 0.82rem;
	}
	.profile-label {
		margin-top: 0.15rem;
		color: var(--rust);
		font-size: 0.66rem;
		font-weight: 800;
		letter-spacing: 0.09em;
		text-transform: uppercase;
	}
	.open-slots {
		max-width: 40rem;
		margin: 0 auto;
		padding-top: 1rem;
		border-top: 1px dashed var(--line-strong);
	}
	.open-slots ul {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 1rem;
		margin: 0.6rem 0 0;
		padding: 0;
		list-style: none;
	}
	.open-slots li {
		display: grid;
		gap: 0.1rem;
		color: var(--muted);
		font-size: 0.82rem;
	}
	.open-slots strong {
		color: var(--ink);
	}
	.empty-roster {
		margin: 7rem auto;
		color: var(--muted);
		text-align: center;
	}
	@media (max-width: 600px) {
		.live-heading {
			align-items: flex-start;
			flex-direction: column;
		}
		.roster-board {
			min-height: 18rem;
			padding: 1rem;
		}
		.shape-roster {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 0.75rem;
			padding: 1.5rem 0.25rem;
		}
		.player-tile {
			min-width: 0;
			width: 100%;
			min-height: 9rem;
			padding: 0.5rem 0.25rem;
		}
	}
</style>
