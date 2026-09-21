<script lang="ts">
	import { resolve } from '$app/paths';
	import { error } from '@sveltejs/kit';
	import ShapeGlyph from '$lib/ui/ShapeGlyph.svelte';
	import { shapeOf } from '$lib/shapes/taxonomy';
	import { headshotUrl } from '$lib/app/roster-data';
	import { storylineRegistry } from '$lib/storylines/registry';

	let { params }: { params: { id: string } } = $props();
	const playerId = $derived(`mlbam-${params.id}`);
	const source = $derived(
		storylineRegistry.find(({ bundle }) =>
			bundle.dataset.players.some((player) => player.id === playerId)
		)
	);
	const player = $derived.by(() => {
		const found = source?.bundle.dataset.players.find((candidate) => candidate.id === playerId);
		if (!found) error(404, 'Player not found');
		return found;
	});

	const projection = $derived(
		source?.bundle.dataset.projections.find((candidate) => candidate.playerId === playerId)
	);
	const shape = $derived(shapeOf(playerId));
</script>

<svelte:head>
	<title>{player.name} · Roster Shapes</title>
	<meta name="description" content="Roster Shapes player profile for {player.name}." />
</svelte:head>

<div class="player-page">
	<a class="back-link" href={resolve('/')}>← Back to roster</a>
	<section class="profile" aria-labelledby="player-name">
		<div class="profile-mark">
			<ShapeGlyph shape={shape.shape} size={132} /><img
				src={headshotUrl(player.id)}
				alt={player.name}
			/>
		</div>
		<div class="profile-copy">
			<p class="eyebrow">Roster profile · {shape.shape}</p>
			<h1 id="player-name">{player.name}</h1>
			<p class="rationale">{shape.rationale}</p>
			<dl>
				<div>
					<dt>Bats</dt>
					<dd>{player.bats}</dd>
				</div>
				<div>
					<dt>Eligible</dt>
					<dd>{player.eligiblePositions.join(', ') || 'DH / no fielding eligibility'}</dd>
				</div>
				<div>
					<dt>Observed R/PA</dt>
					<dd>{projection?.overall ?? 'Unavailable'}</dd>
				</div>
			</dl>
			<p class="boundary">
				Shape is an assumption-layer profile mark. It does not create coverage, change workload, or
				determine value.
			</p>
		</div>
	</section>
</div>

<style>
	:global(body) {
		background: #f6f4ee;
	}
	.player-page {
		max-width: 72rem;
		margin: 0 auto;
		padding: 3rem 1.25rem 5rem;
		color: #252522;
	}
	.back-link {
		color: #813a27;
		font-weight: 700;
		text-decoration: none;
	}
	.profile {
		display: grid;
		grid-template-columns: minmax(14rem, 22rem) 1fr;
		gap: 3rem;
		align-items: center;
		margin-top: 3rem;
		border: 2px solid #252522;
		border-radius: 1.4rem;
		padding: 2rem;
		background: #fffef9;
		box-shadow: 10px 10px 0 #9c4a2e;
	}
	.profile-mark {
		position: relative;
		display: grid;
		place-items: center;
		color: #9c4a2e;
	}
	.profile-mark img {
		position: absolute;
		width: 5rem;
		height: 5rem;
		border-radius: 50%;
		object-fit: cover;
	}
	.eyebrow {
		margin: 0 0 0.5rem;
		color: #9c4a2e;
		font-size: 0.7rem;
		font-weight: 800;
		letter-spacing: 0.13em;
		text-transform: uppercase;
	}
	h1 {
		margin: 0;
		font-family: Georgia, serif;
		font-size: clamp(2.4rem, 6vw, 5rem);
		font-weight: 500;
		letter-spacing: -0.05em;
		line-height: 0.95;
	}
	.rationale {
		max-width: 38rem;
		color: #5f5d56;
		font-size: 1.05rem;
		line-height: 1.55;
	}
	dl {
		display: flex;
		flex-wrap: wrap;
		gap: 1.5rem;
		margin: 1.5rem 0;
	}
	dt {
		color: #5f5d56;
		font-size: 0.7rem;
		text-transform: uppercase;
	}
	dd {
		margin: 0.15rem 0 0;
		font-weight: 800;
	}
	.boundary {
		max-width: 40rem;
		border-top: 1px solid #dedbd1;
		padding-top: 1rem;
		color: #5f5d56;
		font-size: 0.82rem;
	}
	@media (max-width: 650px) {
		.profile {
			grid-template-columns: 1fr;
			gap: 1.5rem;
		}
	}
</style>
