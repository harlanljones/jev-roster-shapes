<script lang="ts">
	import { resolve } from '$app/paths';
	import { error } from '@sveltejs/kit';
	import Piece from '$lib/app/diagrams/Piece.svelte';
	import { headshotUrl } from '$lib/app/headshot';
	import { buildPool, caseRadius, splitText } from '$lib/app/shape-case';
	import { storylineRegistry } from '$lib/storylines/registry';

	let { params }: { params: { id: string } } = $props();
	const playerId = $derived(`mlbam-${params.id}`);
	const source = $derived(
		storylineRegistry.find(({ bundle }) =>
			bundle.dataset.players.some((player) => player.id === playerId)
		)
	);
	const player = $derived.by(() => {
		const found = source ? buildPool(source.bundle).get(playerId) : undefined;
		if (!found) error(404, 'Player not found');
		return found;
	});
	const r = $derived(Math.min(caseRadius(player), 70));
</script>

<svelte:head>
	<title>{player.name} · Roster Shapes</title>
	<meta name="description" content="Roster Shapes player profile for {player.name}." />
</svelte:head>

<div class="player-page">
	<a class="back-link" href={resolve('/')}>← Back to the case</a>
	<section class="profile" aria-labelledby="player-name">
		<div class="profile-mark">
			<svg viewBox="0 0 220 220" role="img" aria-label="{player.name} as a {player.shape} piece">
				<defs>
					<pattern
						id="player-hatch"
						width="7"
						height="7"
						patternUnits="userSpaceOnUse"
						patternTransform="rotate(45)"
					>
						<rect width="7" height="7" fill="#3b4240" />
						<line x1="0" y1="0" x2="0" y2="7" stroke="#7c8680" stroke-width="2" />
					</pattern>
				</defs>
				<rect width="220" height="220" rx="18" fill="#2c312f" />
				<Piece {player} cx={110} cy={110} {r} hatch="player-hatch" />
			</svg>
			<img src={headshotUrl(player.id)} alt={player.name} width="96" height="96" />
		</div>
		<div class="profile-copy">
			<h1 id="player-name">{player.name}</h1>
			<p class="chip">{player.shape}</p>
			<p class="rationale">{player.rationale}</p>
			<dl>
				<div>
					<dt>Bats</dt>
					<dd>{player.bats}</dd>
				</div>
				<div>
					<dt>Eligible</dt>
					<dd>{player.elig.join(', ') || 'DH / no fielding eligibility'}</dd>
				</div>
				<div>
					<dt>Observed R/PA</dt>
					<dd>{player.rateText ?? 'Unavailable'}</dd>
				</div>
				<div>
					<dt>Split OPS</dt>
					<dd>{splitText(player)}</dd>
				</div>
				<div>
					<dt>Actual 2026 runs</dt>
					<dd>{player.runs == null ? 'Unavailable' : player.runs.toFixed(1)}</dd>
				</div>
			</dl>
			<p class="boundary">
				Shape is an assumption-layer profile mark. It does not create coverage, change workload, or
				determine value. Piece size and halves are a display layer over actual 2026 production.
			</p>
		</div>
	</section>
</div>

<style>
	.player-page {
		max-width: 72rem;
		margin: 0 auto;
		padding: 2rem clamp(1rem, 4vw, 3rem) 5rem;
	}
	.back-link {
		color: var(--marker);
		font-weight: 600;
		text-decoration: none;
	}
	.profile {
		display: grid;
		grid-template-columns: minmax(14rem, 20rem) 1fr;
		gap: 2.5rem;
		align-items: center;
		margin-top: 2rem;
		border: 1px solid var(--rule);
		border-radius: 12px;
		padding: 2rem;
		background: var(--panel);
		box-shadow:
			0 1px 2px rgb(22 32 42 / 6%),
			0 8px 20px rgb(22 32 42 / 6%);
	}
	.profile-mark {
		display: grid;
		gap: 1rem;
		justify-items: center;
	}
	.profile-mark svg {
		width: 100%;
		height: auto;
	}
	.profile-mark img {
		width: 6rem;
		height: 6rem;
		border-radius: 50%;
		object-fit: cover;
		background: var(--chip-bg);
	}
	h1 {
		margin: 0;
		font-family: var(--display);
		font-size: clamp(2.25rem, 6vw, 4rem);
		font-weight: 400;
		letter-spacing: 0.02em;
		line-height: 1;
	}
	.chip {
		display: inline-block;
		margin: 0.75rem 0 0;
		border-radius: 4px;
		padding: 0.1rem 0.5rem;
		background: var(--chip-bg);
		font-family: var(--mono);
		font-size: 0.75rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	.rationale {
		max-width: 38rem;
		color: var(--ink-soft);
		font-size: 1.05rem;
		line-height: 1.55;
	}
	dl {
		display: flex;
		flex-wrap: wrap;
		gap: 1.25rem 2rem;
		margin: 1.5rem 0;
	}
	dt {
		color: var(--ink-soft);
		font-size: 0.75rem;
	}
	dd {
		margin: 0.15rem 0 0;
		font-family: var(--mono);
		font-weight: 600;
	}
	.boundary {
		max-width: 40rem;
		border-top: 1px solid var(--rule);
		padding-top: 1rem;
		color: var(--ink-soft);
		font-size: 0.85rem;
	}
	@media (max-width: 650px) {
		.profile {
			grid-template-columns: 1fr;
			gap: 1.5rem;
		}
	}
</style>
